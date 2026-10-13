// Rotas de dados do domínio. Já são montadas atrás de requireAuth + requireActiveSubscription.
const { Router } = require("express");
const c = require("../controllers/stateController");
const { aiImport, assistant } = require("../controllers/importController");
const { aiLimiter } = require("../middleware/rateLimit");

const router = Router();

router.get("/state", c.getState);

// Leitura de fatura com IA (reforço quando o parser local não bate o total).
router.post("/import/ai", aiLimiter, aiImport);

// Assistente financeiro (IA sobre os dados do próprio usuário).
router.post("/assistant", aiLimiter, assistant);

router.put("/incomes", c.putIncomes);
router.put("/despesas", c.putDespesas);
router.put("/emprestimos", c.putEmprestimos);
router.put("/parcelados", c.putParcelados);
router.put("/cartoes", c.putCartoes);
router.put("/goals", c.putGoals);
router.put("/category-rules", c.putCategoryRules);
router.put("/card-profiles", c.putCardProfiles);
router.put("/membros", c.putMembros);
router.put("/holerites", c.putHolerites);
router.put("/rendas-extras", c.putRendasExtras);
router.put("/investimentos", c.putInvestimentos);

// Log de importação (métricas + correções) — alimenta a análise do admin.
router.post("/import-log", c.postImportLog);

module.exports = router;
