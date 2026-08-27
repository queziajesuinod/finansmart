// Rate limiting dos endpoints sensíveis — freia brute-force, credential
// stuffing, enumeração de e-mail no cadastro e abuso de custo da IA.
const { rateLimit } = require("express-rate-limit");

const jsonMessage = (msg) => (req, res) =>
  res.status(429).json({ error: msg, code: "rate_limited" });

// Auth: login / cadastro / troca de senha. Poucas tentativas por janela.
// Uma janela curta com teto baixo torna a enumeração e o brute-force inviáveis.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 10, // por IP, por janela
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonMessage("Muitas tentativas. Aguarde alguns minutos e tente de novo."),
});

// IA (leitura de fatura / assistente): chamadas caras a um serviço externo.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  limit: 12, // por IP, por minuto
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonMessage("Muitas requisições de IA em pouco tempo. Aguarde um instante."),
});

module.exports = { authLimiter, aiLimiter };
