// Exige assinatura ativa (usuário "liberado"). Deve rodar depois de requireAuth.
// Responde 402 Payment Required quando bloqueado, para o frontend redirecionar à tela de pagamento.
const { getAccessState } = require("../services/access");

module.exports = async function requireActiveSubscription(req, res, next) {
  try {
    const access = req.access || (await getAccessState(req.user));
    req.access = access;

    if (!access.liberado) {
      return res.status(402).json({
        error: "Assinatura inativa. Regularize o pagamento para acessar o sistema.",
        code: "subscription_required",
        liberado: false,
        subscription: access.subscription,
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};
