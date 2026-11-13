const crypto = require("crypto");
const { User, Membro, WebauthnCredential, PushSubscription } = require("../models");
const push = require("../services/push");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");
const { getAccessState, ensureDefaultSubscription } = require("../services/access");
const { getSetting } = require("../services/settings");
const household = require("../services/household");
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshFromRequest,
  listSessions,
  currentFamilyId,
  revokeFamilyForUser,
  readRefreshCookie,
  clearRefreshCookie,
} = require("../services/refreshTokens");
const webauthn = require("../services/webauthn");

function tokenFor(user) {
  return signAccessToken({ sub: user.id, role: user.role });
}

// Emite a sessão completa: access token curto (corpo) + refresh cookie httpOnly
// (sessão longa, rotativa). Usado por login, cadastro, Google e passkey.
async function issueSession(user, req, res) {
  await issueRefreshToken(user.id, {
    res,
    userAgent: req.headers["user-agent"],
    ip: req.ip,
  });
  // Membro herda a assinatura/módulos do titular do household (billingUser = dono).
  const owner = await household.resolveOwner(user);
  const access = await getAccessState(user, owner);
  return { token: tokenFor(user), user: user.toSafeJSON(), access };
}

// POST /auth/register — cadastro manual com dados de cobrança.
async function register(req, res, next) {
  try {
    const { nome, email, senha, cpf, telefone, dependentes } = req.body || {};
    const emailNorm = (email || "").trim().toLowerCase();

    // Cadastro público pode estar fechado (lançamento por convite) — config do admin.
    if ((await getSetting("cadastroPublico", true)) === false) {
      return res.status(403).json({ error: "O cadastro está fechado no momento.", code: "signup_closed" });
    }
    if (!nome?.trim() || !emailNorm || !senha) {
      return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios.", code: "missing_fields" });
    }
    if (String(senha).length < 8) {
      return res.status(400).json({ error: "A senha deve ter ao menos 8 caracteres.", code: "weak_password" });
    }

    const existe = await User.findOne({ where: { email: emailNorm } });
    if (existe) {
      return res.status(409).json({ error: "E-mail já cadastrado.", code: "email_taken" });
    }

    const user = await User.create({
      nome: nome.trim(),
      email: emailNorm,
      senhaHash: await hashPassword(String(senha)),
      cpf: cpf?.trim() || null,
      telefone: telefone?.trim() || null,
    });

    // Cria o membro principal (o próprio titular) + os dependentes vinculados no cadastro.
    const membros = [{ id: crypto.randomUUID(), userId: user.id, nome: user.nome, tipo: "principal", ordem: 0, ativo: true }];
    if (Array.isArray(dependentes)) {
      dependentes
        .filter((d) => d && String(d.nome || "").trim())
        .forEach((d, i) => membros.push({
          id: crypto.randomUUID(), userId: user.id, nome: String(d.nome).trim(),
          tipo: "dependente", parentesco: d.parentesco ? String(d.parentesco).slice(0, 40) : null,
          ordem: i + 1, ativo: true,
        }));
    }
    await Membro.bulkCreate(membros);

    // Usuário novo já entra com uma assinatura ativa no plano padrão (Completo).
    await ensureDefaultSubscription(user.id);

    return res.status(201).json(await issueSession(user, req, res));
  } catch (err) {
    next(err);
  }
}

// POST /auth/login — login manual.
async function login(req, res, next) {
  try {
    const { email, senha } = req.body || {};
    const emailNorm = (email || "").trim().toLowerCase();
    if (!emailNorm || !senha) {
      return res.status(400).json({ error: "Informe e-mail e senha.", code: "missing_fields" });
    }

    const user = await User.findOne({ where: { email: emailNorm } });
    // Roda o compare SEMPRE (mesmo sem usuário) para o tempo de resposta não
    // revelar se o e-mail existe — verifyPassword usa um hash fantasma se faltar.
    const senhaOk = await verifyPassword(String(senha), user && user.senhaHash);
    if (!user || !user.senhaHash || !senhaOk) {
      return res.status(401).json({ error: "E-mail ou senha incorretos.", code: "invalid_credentials" });
    }

    return res.json(await issueSession(user, req, res));
  } catch (err) {
    next(err);
  }
}

// POST /auth/refresh — rotaciona o refresh cookie e devolve um access token novo.
// É o que mantém a sessão viva sem o usuário ver a tela de login (e o que o front
// chama no boot da página, já que o access token vive só na memória).
async function refresh(req, res, next) {
  try {
    const rotated = await rotateRefreshToken(readRefreshCookie(req), {
      res,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    if (!rotated) {
      return res.status(401).json({ error: "Sessão expirada. Entre novamente.", code: "no_refresh" });
    }
    const user = await User.findByPk(rotated.userId);
    if (!user || !user.ativo) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: "Usuário não encontrado ou inativo.", code: "no_user" });
    }
    const owner = await household.resolveOwner(user);
    const access = await getAccessState(user, owner);
    return res.json({ token: tokenFor(user), user: user.toSafeJSON(), access });
  } catch (err) {
    next(err);
  }
}

// POST /auth/logout — revoga a família do refresh e limpa o cookie.
async function logout(req, res, next) {
  try {
    await revokeRefreshFromRequest(req, res);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// GET /auth/sessions — dispositivos/sessões ativas do usuário (1 família = 1 aparelho).
async function sessions(req, res, next) {
  try {
    const [list, atual] = await Promise.all([listSessions(req.user.id), currentFamilyId(req)]);
    return res.json({
      sessions: list.map((s) => ({
        id: s.familyId,
        userAgent: s.userAgent || null,
        ip: s.ip || null,
        createdAt: s.createdAt,
        lastSeen: s.lastSeen,
        expiresAt: s.expiresAt,
        atual: s.familyId === atual,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /auth/sessions/:id — desconecta um dispositivo (revoga a família).
async function revokeSession(req, res, next) {
  try {
    const ok = await revokeFamilyForUser(req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ error: "Sessão não encontrada.", code: "not_found" });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// GET /me — dados do usuário logado + estado de acesso (liberado + módulos).
async function me(req, res, next) {
  try {
    const access = await getAccessState(req.user, req.dataOwner);
    return res.json({ user: req.user.toSafeJSON(), access });
  } catch (err) {
    next(err);
  }
}

// Chamado pelo callback do Google (passport já populou req.user).
// Seta o refresh cookie e redireciona ao front — o token NÃO vai mais na URL
// (nada em access log / header Referer). A SPA pega o access token via /auth/refresh.
async function googleCallback(req, res, next) {
  try {
    await issueRefreshToken(req.user.id, {
      res,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    const base = process.env.FRONTEND_URL || "http://127.0.0.1:4173";
    return res.redirect(`${base}/?google=1`);
  } catch (err) {
    next(err);
  }
}

// PUT /auth/profile — atualiza dados básicos do usuário.
async function updateProfile(req, res, next) {
  try {
    const { nome, cpf, telefone } = req.body || {};
    const user = req.user;
    if (nome !== undefined) {
      if (!String(nome).trim()) return res.status(400).json({ error: "Informe seu nome.", code: "missing_fields" });
      user.nome = String(nome).trim();
    }
    if (cpf !== undefined) user.cpf = String(cpf).trim() || null;
    if (telefone !== undefined) user.telefone = String(telefone).trim() || null;
    await user.save();
    return res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

// POST /auth/change-password — troca a senha.
// Exige a senha atual quando o usuário já tem senha; usuários só-Google podem definir a 1ª.
async function changePassword(req, res, next) {
  try {
    const { senhaAtual, novaSenha } = req.body || {};
    if (!novaSenha || String(novaSenha).length < 8) {
      return res.status(400).json({ error: "A nova senha deve ter ao menos 8 caracteres.", code: "weak_password" });
    }
    const user = req.user;
    if (user.senhaHash) {
      if (!senhaAtual || !(await verifyPassword(String(senhaAtual), user.senhaHash))) {
        return res.status(401).json({ error: "Senha atual incorreta.", code: "wrong_password" });
      }
    }
    user.senhaHash = await hashPassword(String(novaSenha));
    await user.save();
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─── Passkeys (WebAuthn) ─────────────────────────────────────────────────────

function passkeyLabel(cred, body) {
  const custom = body && body.nome && String(body.nome).trim();
  if (custom) return custom.slice(0, 60);
  return cred.deviceType === "multiDevice" ? "Passkey sincronizada" : "Passkey deste aparelho";
}

// POST /auth/webauthn/register/options (logado) — opções p/ criar uma passkey.
async function webauthnRegisterOptions(req, res, next) {
  try {
    const existing = await WebauthnCredential.findAll({ where: { userId: req.user.id } });
    return res.json(await webauthn.registrationOptions(req.user, existing, res));
  } catch (err) {
    next(err);
  }
}

// POST /auth/webauthn/register/verify (logado) — valida e salva a passkey.
async function webauthnRegisterVerify(req, res, next) {
  try {
    const result = await webauthn.verifyRegistration(req.user, req.body && req.body.response, req, res);
    if (!result.verified) {
      return res.status(400).json({ error: result.error || "Não foi possível registrar a passkey.", code: "webauthn_failed" });
    }
    await WebauthnCredential.create({
      userId: req.user.id,
      ...result.credential,
      nome: passkeyLabel(result.credential, req.body),
    });
    const list = await WebauthnCredential.findAll({ where: { userId: req.user.id }, order: [["createdAt", "ASC"]] });
    return res.status(201).json({ passkeys: list.map((p) => p.toClientJSON()) });
  } catch (err) {
    if (err && err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Essa passkey já está cadastrada.", code: "passkey_exists" });
    }
    next(err);
  }
}

// GET /auth/webauthn/credentials (logado) — lista as passkeys do usuário.
async function webauthnList(req, res, next) {
  try {
    const list = await WebauthnCredential.findAll({ where: { userId: req.user.id }, order: [["createdAt", "ASC"]] });
    return res.json({ passkeys: list.map((p) => p.toClientJSON()) });
  } catch (err) {
    next(err);
  }
}

// DELETE /auth/webauthn/credentials/:id (logado) — remove uma passkey.
async function webauthnDelete(req, res, next) {
  try {
    const n = await WebauthnCredential.destroy({ where: { id: req.params.id, userId: req.user.id } });
    if (!n) return res.status(404).json({ error: "Passkey não encontrada.", code: "not_found" });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// POST /auth/webauthn/login/options (público) — challenge p/ login sem senha.
async function webauthnLoginOptions(req, res, next) {
  try {
    return res.json(await webauthn.authenticationOptions(res));
  } catch (err) {
    next(err);
  }
}

// POST /auth/webauthn/login/verify (público) — valida a passkey e abre a sessão.
async function webauthnLoginVerify(req, res, next) {
  try {
    const response = req.body && req.body.response;
    const credId = response && response.id;
    if (!credId) {
      return res.status(400).json({ error: "Requisição inválida.", code: "bad_request" });
    }
    const record = await WebauthnCredential.findOne({ where: { credentialId: credId } });
    if (!record) {
      return res.status(401).json({ error: "Passkey não reconhecida.", code: "unknown_passkey" });
    }
    const result = await webauthn.verifyAuthentication(response, record, req, res);
    if (!result.verified) {
      return res.status(401).json({ error: result.error || "Falha no login com passkey.", code: "webauthn_failed" });
    }
    record.counter = result.newCounter;
    record.lastUsedAt = new Date();
    await record.save();

    const user = await User.findByPk(record.userId);
    if (!user || !user.ativo) {
      return res.status(401).json({ error: "Usuário não encontrado ou inativo.", code: "no_user" });
    }
    return res.json(await issueSession(user, req, res));
  } catch (err) {
    next(err);
  }
}

// ─── Web Push ────────────────────────────────────────────────────────────────

// GET /auth/push/key — chave pública VAPID (não é segredo; o navegador precisa dela).
async function pushKey(req, res, next) {
  try {
    return res.json({ key: await push.publicKey() });
  } catch (err) {
    next(err);
  }
}

// POST /auth/push/subscribe — registra (ou atualiza) a inscrição deste aparelho.
async function pushSubscribe(req, res, next) {
  try {
    const b = req.body || {};
    const keys = b.keys || {};
    if (!b.endpoint || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: "Inscrição inválida.", code: "bad_request" });
    }
    const ua = req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 255) : null;
    const existing = await PushSubscription.findOne({ where: { endpoint: b.endpoint } });
    if (existing) {
      existing.set({ userId: req.user.id, p256dh: keys.p256dh, auth: keys.auth, userAgent: ua });
      await existing.save();
    } else {
      await PushSubscription.create({ userId: req.user.id, endpoint: b.endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: ua });
    }
    return res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// POST /auth/push/unsubscribe — remove a inscrição deste aparelho.
async function pushUnsubscribe(req, res, next) {
  try {
    const endpoint = req.body && req.body.endpoint;
    if (endpoint) await PushSubscription.destroy({ where: { endpoint, userId: req.user.id } });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─── Login familiar (household) ──────────────────────────────────────────────

const podeGerirFamilia = (req) => ["owner", "admin"].includes(req.householdRole);

// POST /auth/household/invites — gera um convite (link/código). Owner/admin.
async function householdInviteCreate(req, res, next) {
  try {
    if (!podeGerirFamilia(req)) return res.status(403).json({ error: "Só o titular ou administrador da família pode convidar.", code: "forbidden" });
    const { nome, role, membroId } = req.body || {};
    const invite = await household.createInvite(req.dataOwnerId, { nome, role, membroId });
    const base = process.env.FRONTEND_URL || "http://127.0.0.1:4173";
    return res.status(201).json({ token: invite.token, url: `${base}/?convite=${encodeURIComponent(invite.token)}`, role: invite.role, nome: invite.nome, expiresAt: invite.expiresAt });
  } catch (err) {
    next(err);
  }
}

// GET /auth/household/invites/:token — prévia pública do convite.
async function householdInvitePreview(req, res, next) {
  try {
    const invite = await household.getValidInvite(req.params.token);
    if (!invite) return res.json({ valido: false });
    const owner = await User.findByPk(invite.ownerId);
    return res.json({ valido: true, nome: invite.nome || null, role: invite.role, ownerNome: owner ? owner.nome : null });
  } catch (err) {
    next(err);
  }
}

// POST /auth/household/invites/:token/accept — cria o login do membro e abre sessão.
async function householdInviteAccept(req, res, next) {
  try {
    const { nome, email, senha } = req.body || {};
    const result = await household.acceptInvite(req.params.token, { nome, email, senha });
    if (result.error) return res.status(400).json({ error: result.error, code: result.code });
    return res.status(201).json(await issueSession(result.user, req, res));
  } catch (err) {
    next(err);
  }
}

// GET /auth/household/members — membros + convites pendentes do household.
async function householdMembers(req, res, next) {
  try {
    const [members, invites] = await Promise.all([
      household.listMembers(req.dataOwnerId),
      podeGerirFamilia(req) ? household.listInvites(req.dataOwnerId) : Promise.resolve([]),
    ]);
    return res.json({ members, invites, canManage: podeGerirFamilia(req), ownerNome: req.dataOwner.nome });
  } catch (err) {
    next(err);
  }
}

// PUT /auth/household/members/:id/role — troca o papel de um membro. Owner/admin.
async function householdSetRole(req, res, next) {
  try {
    if (!podeGerirFamilia(req)) return res.status(403).json({ error: "Sem permissão para gerir a família.", code: "forbidden" });
    const ok = await household.setMemberRole(req.dataOwnerId, req.params.id, req.body && req.body.role);
    if (!ok) return res.status(404).json({ error: "Membro não encontrado.", code: "not_found" });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// DELETE /auth/household/members/:id — remove o login do membro (dados ficam). Owner/admin.
async function householdRemoveMember(req, res, next) {
  try {
    if (!podeGerirFamilia(req)) return res.status(403).json({ error: "Sem permissão para gerir a família.", code: "forbidden" });
    const ok = await household.removeMember(req.dataOwnerId, req.params.id);
    if (!ok) return res.status(404).json({ error: "Membro não encontrado.", code: "not_found" });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// DELETE /auth/household/invites/:id — revoga um convite pendente. Owner/admin.
async function householdRevokeInvite(req, res, next) {
  try {
    if (!podeGerirFamilia(req)) return res.status(403).json({ error: "Sem permissão para gerir a família.", code: "forbidden" });
    await household.revokeInvite(req.dataOwnerId, req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  sessions,
  revokeSession,
  pushKey,
  pushSubscribe,
  pushUnsubscribe,
  householdInviteCreate,
  householdInvitePreview,
  householdInviteAccept,
  householdMembers,
  householdSetRole,
  householdRemoveMember,
  householdRevokeInvite,
  me,
  googleCallback,
  tokenFor,
  updateProfile,
  changePassword,
  webauthnRegisterOptions,
  webauthnRegisterVerify,
  webauthnList,
  webauthnDelete,
  webauthnLoginOptions,
  webauthnLoginVerify,
};
