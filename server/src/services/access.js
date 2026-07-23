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

// Billing (pagamento) pode ficar desligado durante os testes: BILLING_ENABLED=false
// libera todo mundo sem cobrança. Ligue BILLING_ENABLED=true para exigir assinatura paga.
const billingEnabled = () => process.env.BILLING_ENABLED === "true";

async function todosModulos() {
  const modulos = await Module.findAll({ order: [["ordem", "ASC"]] });
  return modulos.map((m) => m.chave);
}

// Estado de acesso completo, usado por /me e pelos middlewares.
// Duas dimensões INDEPENDENTES:
//   - liberado  → passou no gate de PAGAMENTO (402 quando false)
//   - modulos   → PERMISSÃO por módulo (403 quando a rota pede um módulo de fora)
async function getAccessState(user) {
  const billing = billingEnabled();

  // Admin: sempre liberado e com todos os módulos.
  if (user.role === "admin") {
    return {
      liberado: true,
      admin: true,
      billingEnabled: billing,
      subscription: null,
      plano: null,
      modulos: await todosModulos(),
    };
  }

  const sub = await getVigenteSubscription(user.id);

  // Módulos vêm SEMPRE do plano atribuído (mesmo sem pagamento em dia), para
  // que a permissão possa ser testada. Sem plano atribuído → todos os módulos.
  const modulosDoPlano =
    sub && sub.plan && (sub.plan.modules || []).length
      ? sub.plan.modules.map((m) => m.chave)
      : null;

  // Modo teste (billing desligado): ninguém precisa pagar (liberado=true),
  // mas os módulos respeitam o plano — assim dá pra ver como fica a UI com
  // abas ligadas/desligadas sem cair na tela de cobrança.
  if (!billing) {
    return {
      liberado: true,
      admin: false,
      billingEnabled: false,
      subscription: sub
        ? { id: sub.id, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd }
        : null,
      plano: sub && sub.plan ? { id: sub.plan.id, slug: sub.plan.slug, nome: sub.plan.nome } : null,
      modulos: (modulosDoPlano || (await todosModulos())).sort(),
    };
  }

  // Billing ligado: acesso depende do pagamento em dia.
  const liberado = Boolean(sub && sub.estaLiberada());
  const modulos = liberado ? modulosDoPlano || [] : [];

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
