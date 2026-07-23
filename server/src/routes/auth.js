const { Router } = require("express");
const { passport, googleEnabled } = require("../config/passport");
const authController = require("../controllers/authController");
const requireAuth = require("../middleware/auth");
const { aiEnabled } = require("../services/aiImport");

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

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

// Endpoint para o frontend saber quais recursos estão disponíveis.
router.get("/config", (req, res) => res.json({ googleEnabled, aiImport: aiEnabled() }));

// Dados do usuário logado.
router.get("/me", requireAuth, authController.me);

// Perfil.
router.put("/profile", requireAuth, authController.updateProfile);
router.post("/change-password", requireAuth, authController.changePassword);

module.exports = router;
