process.env.NODE_ENV = "development";
const { Sequelize } = require("sequelize");
const cfg = require("./src/config/config.js").development;
(async () => {
  const s = new Sequelize(cfg.database, cfg.username, cfg.password, cfg);
  const q = async (sql) => (await s.query(sql))[0];
  try {
    console.log("Colunas novas (schema dev):");
    console.table(await q(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema='dev' AND (
        (table_name='emprestimos' AND column_name='diaVencimento') OR
        (table_name='card_profiles' AND column_name='fechamentoDia') OR
        (table_name='parcelados' AND column_name='dataCompraReal') OR
        (table_name='holerites' AND column_name='diaRecebimento') OR
        (table_name='rendas_extras' AND column_name='data'))
      ORDER BY 1,2`));
    console.log("Tabela investimentos em dev?", (await q(`SELECT 1 FROM information_schema.tables WHERE table_schema='dev' AND table_name='investimentos'`)).length ? "SIM" : "NÃO");
    console.log("Módulo 'investimentos':", JSON.stringify(await q(`SELECT chave, nome, ordem FROM "modules" WHERE chave='investimentos'`)));
    console.log("Planos com módulo investimentos:", (await q(`SELECT pm.id FROM "plan_modules" pm JOIN "modules" m ON m.id=pm."moduleId" WHERE m.chave='investimentos'`)).length);
    console.log("Última migration em dev:", (await q(`SELECT name FROM "SequelizeMeta" ORDER BY name DESC LIMIT 1`))[0].name);
    console.log("public ainda vazio?", (await q(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`)).length === 0 ? "SIM (limpo)" : "NÃO");
  } catch (e) { console.error("FALHOU:", e.message); }
  finally { await s.close(); }
})();
