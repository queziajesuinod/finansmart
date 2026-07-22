const { User } = require("../models");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");
const { getAccessState } = require("../services/access");

function tokenFor(user) {
  return signToken({ sub: user.id, role: user.role });
}

// POST /auth/register — cadastro manual com dados de cobrança.
async function register(req, res, next) {
  try {
    const { nome, email, senha, cpf, telefone } = req.body || {};
    const emailNorm = (email || "").trim().toLowerCase();

    if (!nome?.trim() || !emailNorm || !senha) {
      return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios.", code: "missing_fields" });
    }
    if (String(senha).length < 6) {
      return res.status(400).json({ error: "A senha deve ter ao menos 6 caracteres.", code: "weak_password" });
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

    const access = await getAccessState(user);
    // Usuário novo entra sem assinatura ativa → liberado=false até pagar.
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
    if (!user || !(await verifyPassword(String(senha), user.senhaHash))) {
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
  // Redireciona para a raiz da SPA com o token na query (evita depender de rotas no Vite).
  return res.redirect(`${base}/?token=${encodeURIComponent(token)}&google=1`);
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
    if (!novaSenha || String(novaSenha).length < 6) {
      return res.status(400).json({ error: "A nova senha deve ter ao menos 6 caracteres.", code: "weak_password" });
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
