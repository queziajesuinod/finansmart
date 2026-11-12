// Refresh tokens rotativos em cookie httpOnly — a sessão longa (60–90 dias) que
// faz o usuário quase nunca ver a tela de login. O access token (JWT) é curto e
// vive só na memória do front; quando expira, o front chama /auth/refresh e este
// serviço troca o refresh por um novo (rotação) e devolve um JWT fresco.
//
// Segurança: só o SHA-256 do token opaco vai pro banco (vazar o banco não dá
// sessões). A cada uso o token é rotacionado; se um token já usado/revogado
// reaparece (cookie roubado), a FAMÍLIA inteira é revogada — o ladrão e a vítima
// são desconectados e o usuário refaz o login.
const crypto = require("crypto");
const { Op } = require("sequelize");
const { RefreshToken } = require("../models");

const COOKIE_NAME = "fs_refresh";
const TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 75);
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;
// secure=true exige HTTPS. Em produção é obrigatório; COOKIE_SECURE força o valor.
const SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === "true"
  : process.env.NODE_ENV === "production";

// path "/auth": o cookie só é enviado aos endpoints de autenticação (refresh,
// logout, webauthn) — não acompanha cada chamada de API.
const cookieOpts = () => ({
  httpOnly: true,
  secure: SECURE,
  sameSite: "lax",
  path: "/auth",
});

const sha256 = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

function setRefreshCookie(res, raw) {
  res.cookie(COOKIE_NAME, raw, { ...cookieOpts(), maxAge: TTL_MS });
}
function clearRefreshCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOpts());
}
function readRefreshCookie(req) {
  return (req.cookies && req.cookies[COOKIE_NAME]) || null;
}

// Cria um token novo (familyId próprio) e seta o cookie. Usado no login/cadastro/
// callback do Google e na autenticação por passkey.
async function issueRefreshToken(userId, { res, userAgent, ip, familyId } = {}) {
  const raw = crypto.randomBytes(32).toString("base64url");
  const rec = await RefreshToken.create({
    userId,
    tokenHash: sha256(raw),
    familyId: familyId || crypto.randomUUID(),
    expiresAt: new Date(Date.now() + TTL_MS),
    userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
    ip: ip ? String(ip).slice(0, 45) : null,
  });
  if (res) setRefreshCookie(res, raw);
  return { raw, rec };
}

async function revokeFamily(familyId) {
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { familyId, revokedAt: { [Op.is]: null } } }
  );
}

// Troca um refresh válido por um novo (mesma família, expiry deslizante).
// Retorna { userId } em sucesso; null se ausente/expirado/reuso (força re-login).
async function rotateRefreshToken(raw, { res, userAgent, ip } = {}) {
  if (!raw) return null;
  const current = await RefreshToken.findOne({ where: { tokenHash: sha256(raw) } });
  if (!current) {
    // Token desconhecido: pode ser um cookie antigo/forjado. Nada a rotacionar.
    if (res) clearRefreshCookie(res);
    return null;
  }

  // Reuso de um token já revogado/substituído = sinal de roubo do cookie.
  if (current.revokedAt) {
    await revokeFamily(current.familyId);
    if (res) clearRefreshCookie(res);
    return null;
  }
  if (current.expiresAt.getTime() <= Date.now()) {
    if (res) clearRefreshCookie(res);
    return null;
  }

  const next = await issueRefreshToken(current.userId, {
    res, userAgent, ip, familyId: current.familyId,
  });
  current.revokedAt = new Date();
  current.replacedById = next.rec.id;
  await current.save();

  return { userId: current.userId };
}

// Logout: mata a família inteira do cookie atual e limpa o cookie.
async function revokeRefreshFromRequest(req, res) {
  const raw = readRefreshCookie(req);
  if (raw) {
    const rec = await RefreshToken.findOne({ where: { tokenHash: sha256(raw) } });
    if (rec) await revokeFamily(rec.familyId);
  }
  if (res) clearRefreshCookie(res);
}

module.exports = {
  COOKIE_NAME,
  issueRefreshToken,
  rotateRefreshToken,
  revokeFamily,
  revokeRefreshFromRequest,
  readRefreshCookie,
  setRefreshCookie,
  clearRefreshCookie,
};
