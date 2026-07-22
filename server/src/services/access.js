// Centraliza o cálculo de "o usuário está liberado?" e "quais módulos ele acessa".
const { Subscription, Plan, Module } = require("../models");

// Retorna a assinatura vigente do usuário (com plano e módulos carregados), ou null.
async function getVigenteSubscription(userId) {
  const subs = await Subscription.findAll({
    where: { userId },
    include: [{ model: Plan, as: "plan", include: [{ model: Module, as: "modules" }] }],
    order: [["createdAt", "DESC"]],
  });
  // A primeira que estiver efetivamente liberada.
  return subs.find((s) => s.estaLiberada()) || subs[0] || null;
}

// Durante os testes, o billing pode ficar desligado: todos ficam liberados
// com todos os módulos. Basta ligar BILLING_ENABLED=true para valer a assinatura.
const billingEnabled = () => process.env.BILLING_ENABLED === "true";

// Estado de acesso completo, usado por /me e pelos middlewares.
async function getAccessState(user) {
  // Admin OU modo teste (billing desligado) → acesso total.
  if (user.role === "admin" || !billingEnabled()) {
    const modulos = await Module.findAll({ order: [["ordem", "ASC"]] });
    return {
      liberado: true,
      admin: user.role === "admin",
      billingEnabled: billingEnabled(),
      subscription: null,
      plano: null,
      modulos: modulos.map((m) => m.chave),
    };
  }

  const sub = await getVigenteSubscription(user.id);
  const liberado = Boolean(sub && sub.estaLiberada());
  const modulos = liberado && sub.plan ? (sub.plan.modules || []).map((m) => m.chave) : [];

  return {
    liberado,
    admin: false,
    billingEnabled: true,
    subscription: sub
      ? { id: sub.id, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd }
      : null,
    plano: sub && sub.plan ? { id: sub.plan.id, slug: sub.plan.slug, nome: sub.plan.nome } : null,
    modulos: modulos.sort(),
  };
}

module.exports = { getVigenteSubscription, getAccessState };
