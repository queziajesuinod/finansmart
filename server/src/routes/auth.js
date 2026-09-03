const { Router } = require("express");
const { passport, googleEnabled } = require("../config/passport");
const authController = require("../controllers/authController");
const requireAuth = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const { aiEnabled } = require("../services/aiImport");
const { getSetting } = require("../services/settings");

const router = Router();

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);

// Login com Google (só ativo se as credenciais estiverem configuradas).
if (googleEnabled) {
  router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
  router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL || "http://127.0.0.1:4173"}/?erro=google` }),
    authController.googleCallback
  );
} else {
  router.get("/google", (req, res) => res.status(503).json({ error: "Login com Google não configurado.", code: "google_disabled" }));
}

// Endpoint para o frontend saber quais recursos estão disponíveis. A leitura de
// fatura com IA pode ser desligada pelo admin (app_settings.iaImportAtiva).
router.get("/config", async (req, res) => {
  const iaAtiva = (await getSetting("iaImportAtiva", true)) !== false;
  const cadastroPublico = (await getSetting("cadastroPublico", true)) !== false;
  res.json({ googleEnabled, aiImport: aiEnabled() && iaAtiva, cadastroPublico });
});

// Dados do usuário logado.
router.get("/me", requireAuth, authController.me);

// Perfil.
router.put("/profile", requireAuth, authController.updateProfile);
router.post("/change-password", authLimiter, requireAuth, authController.changePassword);

module.exports = router;
