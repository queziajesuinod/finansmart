// Rotas de dados do domínio. Já são montadas atrás de requireAuth + requireActiveSubscription.
const { Router } = require("express");
const c = require("../controllers/stateController");
const { aiImport, assistant } = require("../controllers/importController");
const { aiLimiter } = require("../middleware/rateLimit");
const requireWrite = require("../middleware/householdWrite");

const router = Router();

router.get("/state", c.getState);

// Leitura de fatura com IA (reforço quando o parser local não bate o total).
router.post("/import/ai", aiLimiter, aiImport);

// Assistente financeiro (IA sobre os dados do próprio usuário).
router.post("/assistant", aiLimiter, assistant);

// Escrita de coleções: bloqueada para o papel "viewer" (requireWrite).
router.put("/incomes", requireWrite, c.putIncomes);
router.put("/despesas", requireWrite, c.putDespesas);
router.put("/emprestimos", requireWrite, c.putEmprestimos);
router.put("/parcelados", requireWrite, c.putParcelados);
router.put("/cartoes", requireWrite, c.putCartoes);
router.put("/goals", requireWrite, c.putGoals);
router.put("/budgets", requireWrite, c.putBudgets);
router.put("/category-rules", requireWrite, c.putCategoryRules);
router.put("/card-profiles", requireWrite, c.putCardProfiles);
router.put("/membros", requireWrite, c.putMembros);
router.put("/holerites", requireWrite, c.putHolerites);
router.put("/rendas-extras", requireWrite, c.putRendasExtras);
router.put("/investimentos", requireWrite, c.putInvestimentos);

// "Começar do zero": apaga todas as coleções financeiras do household (só o titular).
router.post("/reset", requireWrite, c.resetData);

// Log de importação (métricas + correções) — alimenta a análise do admin.
router.post("/import-log", c.postImportLog);

module.exports = router;
