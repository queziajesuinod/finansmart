// Rotas de administração. Montadas atrás de requireAuth + requireAdmin.
const { Router } = require("express");
const a = require("../controllers/adminController");

const router = Router();

// Módulos
router.get("/modules", a.listModules);
router.post("/modules", a.createModule);
router.put("/modules/:id", a.updateModule);
router.delete("/modules/:id", a.deleteModule);

// Planos
router.get("/plans", a.listPlans);
router.post("/plans", a.createPlan);
router.put("/plans/:id", a.updatePlan);
router.delete("/plans/:id", a.deletePlan);

// Usuários
router.get("/users", a.listUsers);
router.post("/users/:id/grant", a.grantUser);
router.post("/users/:id/revoke", a.revokeUser);
router.post("/users/:id/role", a.setRole);

module.exports = router;
