const jwt = require("jsonwebtoken");

// O segredo NUNCA pode cair num valor fixo em produção: como o código é público,
// um fallback conhecido permitiria forjar tokens de qualquer usuário. Em produção
// exigimos JWT_SECRET (o boot falha se faltar); em dev, um fallback é aceitável.
const SECRET = process.env.JWT_SECRET
  || (process.env.NODE_ENV === "production"
    ? (() => { throw new Error("JWT_SECRET é obrigatório em produção. Defina uma chave forte e aleatória no ambiente."); })()
    : "dev-secret-troque-em-producao");
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
// O access token agora é curto: ele vive só na memória do front e é renovado em
// silêncio pelo refresh token (cookie httpOnly). Janela curta = brecha mínima
// caso o token vaze por XSS. ACCESS_TOKEN_TTL sobrepõe (ex: "15m", "1h").
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || "15m";

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

// Token de acesso de vida curta (usado no login/refresh/webauthn).
function signAccessToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_TTL });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

// Token temporário auto-expirável (ex: challenge de WebAuthn guardado em cookie).
// expiresIn aceita o formato do jsonwebtoken ("5m", "30s"...).
function signTempToken(payload, expiresIn) {
  return jwt.sign(payload, SECRET, { expiresIn });
}

module.exports = { signToken, signAccessToken, verifyToken, signTempToken };
