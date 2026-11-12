// Configuração do WebAuthn / Passkeys (login com Face ID / digital).
//
// O RP ID é o domínio registrável do site (ex: "joseplaneja.com.br"). Ele PRECISA
// bater com a origem onde o app roda — a credencial fica amarrada a esse domínio.
// Em dev use "localhost" (passkeys NÃO funcionam em IP cru como 127.0.0.1; acesse
// o front por http://localhost:4173). A origem (scheme+host+porta) tem que ser
// exata; aceita uma lista separada por vírgula para cobrir mais de uma.
const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const RP_NAME = process.env.WEBAUTHN_RP_NAME || "José Planeja";
const ORIGINS = (process.env.WEBAUTHN_ORIGIN || "http://localhost:4173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

module.exports = {
  rpID: RP_ID,
  rpName: RP_NAME,
  // generate* usa uma origem única; verify* aceita a lista inteira.
  origin: ORIGINS[0],
  expectedOrigin: ORIGINS.length === 1 ? ORIGINS[0] : ORIGINS,
};
