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

// Visão geral (negócio) + configurações
router.get("/overview", a.overview);
router.get("/settings", a.getSettings);
router.put("/settings", a.putSettings);

// Usuários
router.get("/users", a.listUsers);
router.get("/users/:id", a.userDetail);
router.post("/users/:id/grant", a.grantUser);
router.post("/users/:id/revoke", a.revokeUser);
router.post("/users/:id/role", a.setRole);

// Análise de importações + regras globais de categoria
router.get("/imports", a.listImports);
router.post("/global-rules", a.promoteGlobalRule);
router.delete("/global-rules/:id", a.deleteGlobalRule);

module.exports = router;
