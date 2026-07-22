// Exige que o plano do usuário inclua um módulo específico.
// Uso: router.get("/emprestimos", requireAuth, requireActiveSubscription, requireModule("emprestimos"), handler)
const { getAccessState } = require("../services/access");

module.exports = function requireModule(chave) {
  return async function moduleGuard(req, res, next) {
    try {
      const access = req.access || (await getAccessState(req.user));
      req.access = access;

      if (!access.liberado) {
        return res.status(402).json({ error: "Assinatura inativa.", code: "subscription_required", liberado: false });
      }
      if (!access.modulos.includes(chave)) {
        return res.status(403).json({
          error: `Seu plano não inclui o módulo "${chave}".`,
          code: "module_forbidden",
          modulo: chave,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};
