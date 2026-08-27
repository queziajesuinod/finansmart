const bcrypt = require("bcryptjs");

const ROUNDS = 10;

// Hash "fantasma" (formato bcrypt válido, não corresponde a nenhuma senha real).
// Usado para gastar o MESMO tempo de bcrypt quando o e-mail não existe ou é
// só-Google, evitando vazar por timing se a conta existe (anti-enumeração).
const DUMMY_HASH = bcrypt.hashSync("constant-time-placeholder", ROUNDS);

async function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

// Sempre executa um compare de custo real: hash ausente cai no DUMMY_HASH,
// mantendo o tempo de resposta constante (retorna false, como esperado).
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash || DUMMY_HASH);
}

module.exports = { hashPassword, verifyPassword };
