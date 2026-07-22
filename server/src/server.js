require("dotenv").config();
const app = require("./app");
const { sequelize } = require("./models");

const PORT = Number(process.env.PORT || 3333);

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
}

start();
