// Leitura de fatura com IA (reforço). Recebe o texto extraído do PDF e o mês de
// referência; devolve as compras estruturadas. Fica atrás de requireAuth.
const { lerFaturaComIA } = require("../services/aiImport");
const { responderAssistente } = require("../services/aiAssistant");

// Assistente financeiro: pergunta + resumo dos dados do usuário → resposta.
async function assistant(req, res, next) {
  try {
    const { pergunta, contexto, historico } = req.body || {};
    if (!pergunta || !String(pergunta).trim()) return res.status(400).json({ error: "Digite uma pergunta.", code: "empty_question" });
    const r = await responderAssistente({
      pergunta: String(pergunta).slice(0, 500),
      contexto: String(contexto || "").slice(0, 4000),
      historico: Array.isArray(historico) ? historico : [],
    });
    res.json(r);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code || "ai_error" });
    next(err);
  }
}

async function aiImport(req, res, next) {
  try {
    const { texto, refYear, refMonth } = req.body || {};
    const y = parseInt(refYear, 10);
    const m = parseInt(refMonth, 10);
    const agora = new Date();
    const result = await lerFaturaComIA({
      texto,
      refYear: y >= 2000 && y <= 2100 ? y : agora.getFullYear(),
      refMonth: m >= 1 && m <= 12 ? m : agora.getMonth() + 1,
    });
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, code: err.code || "ai_error" });
    }
    next(err);
  }
}

module.exports = { aiImport, assistant };
