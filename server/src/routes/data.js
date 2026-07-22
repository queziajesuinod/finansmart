// Rotas de dados do domínio. Já são montadas atrás de requireAuth + requireActiveSubscription.
const { Router } = require("express");
const c = require("../controllers/stateController");

const router = Router();

router.get("/state", c.getState);

router.put("/incomes", c.putIncomes);
router.put("/despesas", c.putDespesas);
router.put("/emprestimos", c.putEmprestimos);
router.put("/parcelados", c.putParcelados);
router.put("/cartoes", c.putCartoes);
router.put("/goals", c.putGoals);
router.put("/category-rules", c.putCategoryRules);
router.put("/card-profiles", c.putCardProfiles);

module.exports = router;
