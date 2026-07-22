// Libera um usuário manualmente (útil em dev, antes do Stripe da Fase 2).
//
//   npm run grant -- email@cliente.com completo      → assina o plano "completo"
//   npm run grant -- email@cliente.com basico 90     → assina "basico" por 90 dias
//   npm run grant -- email@cliente.com admin          → promove a admin (acesso total)
//
require("dotenv").config();
const { sequelize, User, Plan, Subscription } = require("../models");

async function main() {
  const [email, slugOrRole, diasArg] = process.argv.slice(2);
  if (!email || !slugOrRole) {
    console.log('Uso: npm run grant -- <email> <slug-do-plano|admin> [dias]');
    process.exit(1);
  }

  await sequelize.authenticate();

  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  if (slugOrRole === "admin") {
    user.role = "admin";
    await user.save();
    console.log(`✅ ${email} agora é admin (acesso total).`);
    process.exit(0);
  }

  const plan = await Plan.findOne({ where: { slug: slugOrRole } });
  if (!plan) {
    console.error(`Plano não encontrado: ${slugOrRole}. Rode "npm run db:seed" primeiro.`);
    process.exit(1);
  }

  const dias = Number(diasArg || 30);
  const fim = new Date();
  fim.setDate(fim.getDate() + dias);

  const sub = await Subscription.create({
    userId: user.id,
    planId: plan.id,
    status: "active",
    currentPeriodEnd: fim,
  });

  console.log(`✅ ${email} liberado no plano "${plan.nome}" por ${dias} dias (até ${fim.toLocaleDateString("pt-BR")}).`);
  console.log(`   subscriptionId=${sub.id}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
