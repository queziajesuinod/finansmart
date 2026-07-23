// Leitura de fatura com IA (reforço). Recebe o texto extraído do PDF e o mês de
// referência; devolve as compras estruturadas. Fica atrás de requireAuth.
const { lerFaturaComIA } = require("../services/aiImport");

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

module.exports = { aiImport };
