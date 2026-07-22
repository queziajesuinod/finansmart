const { Router } = require("express");
const authRoutes = require("./auth");
const planRoutes = require("./plans");
const dataRoutes = require("./data");
const adminRoutes = require("./admin");
const requireAuth = require("../middleware/auth");
const requireActiveSubscription = require("../middleware/subscription");
const requireModule = require("../middleware/requireModule");
const requireAdmin = require("../middleware/requireAdmin");

const router = Router();

router.get("/health", (req, res) => res.json({ ok: true, service: "finansmart-api" }));

router.use("/auth", authRoutes);
router.use("/plans", planRoutes);

// Dados do domínio: exige login + assinatura ativa (liberada no modo teste).
router.use("/api", requireAuth, requireActiveSubscription, dataRoutes);

// Administração: exige login + role admin.
router.use("/admin", requireAuth, requireAdmin, adminRoutes);

// Exemplo de área protegida: exige login + assinatura ativa.
// (As rotas de domínio — despesas, cartões, etc. — entram na fase de religar o frontend.)
router.get("/app/ping", requireAuth, requireActiveSubscription, (req, res) => {
  res.json({ ok: true, liberado: true, modulos: req.access.modulos });
});

// Exemplo de rota gated por módulo específico.
router.get("/app/modulo/:chave", requireAuth, requireActiveSubscription, (req, res, next) => {
  return requireModule(req.params.chave)(req, res, () => {
    res.json({ ok: true, modulo: req.params.chave, acesso: "liberado" });
  });
});

module.exports = router;
