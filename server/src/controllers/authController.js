const crypto = require("crypto");
const { User, Membro, WebauthnCredential } = require("../models");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");
const { getAccessState, ensureDefaultSubscription } = require("../services/access");
const { getSetting } = require("../services/settings");
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshFromRequest,
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
  const access = await getAccessState(user);
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
    const access = await getAccessState(user);
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

// GET /me — dados do usuário logado + estado de acesso (liberado + módulos).
async function me(req, res, next) {
  try {
    const access = await getAccessState(req.user);
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

module.exports = {
  register,
  login,
  refresh,
  logout,
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
