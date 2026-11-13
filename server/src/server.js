require("dotenv").config();
const cron = require("node-cron");
const app = require("./app");
const { sequelize } = require("./models");
const push = require("./services/push");

const PORT = Number(process.env.PORT || 3333);

// Agendador de Web Push: 1x/dia varre faturas/salários a vencer e dispara os
// avisos. Roda DENTRO do processo da API (ok com a config de 1 réplica). Desligue
// com PUSH_DISABLED=true; ajuste horário/fuso com PUSH_CRON / TZ.
function agendarPush() {
  if (process.env.PUSH_DISABLED === "true") return;
  const expr = process.env.PUSH_CRON || "0 8 * * *"; // 08:00 todo dia
  cron.schedule(expr, async () => {
    try {
      const r = await push.runDailyJob();
      console.log(`🔔 Push diário: ${r.enviados} aviso(s) para ${r.usuarios} usuário(s).`);
    } catch (err) {
      console.error("Push diário falhou:", err.message);
    }
  }, { timezone: process.env.TZ || "America/Sao_Paulo" });
}

async function start() {
  try {
    await sequelize.authenticate();
    console.log("✅ Conectado ao PostgreSQL.");
  } catch (err) {
    console.error("❌ Falha ao conectar no banco. Verifique o .env e se o Postgres está rodando.");
    console.error(err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 API FinançaSmart em http://127.0.0.1:${PORT}`);
  });

  agendarPush();
}

start();
