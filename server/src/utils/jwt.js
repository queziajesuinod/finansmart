const jwt = require("jsonwebtoken");

// O segredo NUNCA pode cair num valor fixo em produção: como o código é público,
// um fallback conhecido permitiria forjar tokens de qualquer usuário. Em produção
// exigimos JWT_SECRET (o boot falha se faltar); em dev, um fallback é aceitável.
const SECRET = process.env.JWT_SECRET
  || (process.env.NODE_ENV === "production"
    ? (() => { throw new Error("JWT_SECRET é obrigatório em produção. Defina uma chave forte e aleatória no ambiente."); })()
    : "dev-secret-troque-em-producao");
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
