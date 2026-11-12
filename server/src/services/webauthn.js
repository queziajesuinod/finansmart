// WebAuthn / Passkeys — login com Face ID / digital, sem senha.
//
// A chave privada nunca sai do aparelho (Secure Enclave / TPM). O servidor guarda
// só a chave pública e, a cada login, manda um "challenge" aleatório que o
// aparelho assina. Guardamos o challenge num cookie httpOnly curto e autoassinado
// (JWT de 5 min) — stateless, íntegro e single-use (sobrescrito a cada options).
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");
const { rpID, rpName, origin, expectedOrigin } = require("../config/webauthn");
const { signTempToken, verifyToken } = require("../utils/jwt");

const CHALLENGE_COOKIE = "fs_wauth";
const CHALLENGE_TTL = "5m";
const SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === "true"
  : process.env.NODE_ENV === "production";

const challengeCookieOpts = () => ({
  httpOnly: true,
  secure: SECURE,
  sameSite: "lax",
  path: "/auth/webauthn",
});

// base64url <-> bytes (Buffer é um Uint8Array, aceito direto pelo lib).
const b64urlToBytes = (s) => Buffer.from(s, "base64url");
const bytesToB64url = (b) => Buffer.from(b).toString("base64url");

function setChallenge(res, chal, purpose, uid) {
  const token = signTempToken({ chal, purpose, uid }, CHALLENGE_TTL);
  res.cookie(CHALLENGE_COOKIE, token, { ...challengeCookieOpts(), maxAge: 5 * 60 * 1000 });
}
// Lê, valida (assinatura + expiração + propósito) e CONSOME o challenge do cookie.
function takeChallenge(req, res, purpose) {
  const raw = req.cookies && req.cookies[CHALLENGE_COOKIE];
  if (res) res.clearCookie(CHALLENGE_COOKIE, challengeCookieOpts());
  if (!raw) return null;
  try {
    const payload = verifyToken(raw);
    if (payload.purpose !== purpose) return null;
    return payload; // { chal, purpose, uid }
  } catch {
    return null;
  }
}

// ─── Registro (adicionar uma passkey a uma conta já logada) ──────────────────
async function registrationOptions(user, existing, res) {
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userID: new TextEncoder().encode(user.id), // UUID estável, não-PII (vira userHandle)
    userDisplayName: user.nome || user.email,
    attestationType: "none",
    excludeCredentials: (existing || []).map((c) => ({
      id: c.credentialId,
      transports: c.transports ? safeParse(c.transports) : undefined,
    })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });
  setChallenge(res, options.challenge, "reg", user.id);
  return options;
}

async function verifyRegistration(user, body, req, res) {
  const stash = takeChallenge(req, res, "reg");
  if (!stash || stash.uid !== user.id) {
    return { verified: false, error: "Desafio inválido ou expirado. Tente de novo." };
  }
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: stash.chal,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (err) {
    return { verified: false, error: err.message };
  }
  if (!verification.verified || !verification.registrationInfo) {
    return { verified: false, error: "Não foi possível registrar a passkey." };
  }
  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  return {
    verified: true,
    credential: {
      credentialId: credential.id,
      publicKey: bytesToB64url(credential.publicKey),
      counter: credential.counter || 0,
      transports: body?.response?.transports ? JSON.stringify(body.response.transports) : null,
      deviceType: credentialDeviceType,
      backedUp: Boolean(credentialBackedUp),
    },
  };
}

// ─── Autenticação (login sem senha, discoverable/usernameless) ───────────────
async function authenticationOptions(res) {
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: [], // vazio = o aparelho oferece as passkeys que ele tem p/ este RP
    userVerification: "preferred",
  });
  setChallenge(res, options.challenge, "auth", null);
  return options;
}

async function verifyAuthentication(body, record, req, res) {
  const stash = takeChallenge(req, res, "auth");
  if (!stash) return { verified: false, error: "Desafio inválido ou expirado." };
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: stash.chal,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: record.credentialId,
        publicKey: b64urlToBytes(record.publicKey),
        counter: Number(record.counter) || 0,
        transports: record.transports ? safeParse(record.transports) : undefined,
      },
      requireUserVerification: false,
    });
  } catch (err) {
    return { verified: false, error: err.message };
  }
  if (!verification.verified) return { verified: false, error: "Falha na verificação da passkey." };
  return { verified: true, newCounter: verification.authenticationInfo.newCounter };
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return undefined; }
}

module.exports = {
  registrationOptions,
  verifyRegistration,
  authenticationOptions,
  verifyAuthentication,
};
