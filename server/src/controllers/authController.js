const crypto = require("crypto");
const { User, Membro } = require("../models");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");
const { getAccessState, ensureDefaultSubscription } = require("../services/access");
const { getSetting } = require("../services/settings");

function tokenFor(user) {
  return signToken({ sub: user.id, role: user.role });
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

    const access = await getAccessState(user);
    return res.status(201).json({ token: tokenFor(user), user: user.toSafeJSON(), access });
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

    const access = await getAccessState(user);
    return res.json({ token: tokenFor(user), user: user.toSafeJSON(), access });
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
// Redireciona ao frontend com o token na query string.
function googleCallback(req, res) {
  const token = tokenFor(req.user);
  const base = process.env.FRONTEND_URL || "http://127.0.0.1:4173";
  // Token no FRAGMENTO (#), não na query (?): o fragmento não é enviado ao
  // servidor (não entra em access log) nem vaza via header Referer. A SPA lê e
  // limpa da URL logo em seguida.
  return res.redirect(`${base}/#token=${encodeURIComponent(token)}&google=1`);
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

module.exports = { register, login, me, googleCallback, tokenFor, updateProfile, changePassword };
