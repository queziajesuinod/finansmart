"use strict";

// Ajustes pedidos em set/out 2026:
//  • emprestimos.diaVencimento  — dia do mês em que a parcela vence (extrato).
//  • card_profiles.fechamentoDia — dia em que a fatura "vira" (fecha).
//  • parcelados.dataCompraReal  — data real da compra (dataCompra segue sendo a
//    âncora da 1ª parcela, derivada do fechamento do cartão).
//  • holerites.diaRecebimento   — dia do mês em que o salário entra.
//  • rendas_extras.data         — data em que a renda extra entrou.
//  • tabela investimentos + módulo "investimentos" (liberado nos planos que já têm "emprestimos").
// Schema-aware: addColumn/removeColumn do Sequelize qualificam o DDL com o schema
// default do dialeto ("public") ignorando o search_path, então as tabelas precisam
// ser qualificadas explicitamente com DB_SCHEMA (ex.: "dev") via tbl().
const { randomUUID } = require("crypto");

const schema = process.env.DB_SCHEMA || undefined;
const tbl = (name) => (schema ? { tableName: name, schema } : name);

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(tbl("emprestimos"), "diaVencimento", { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn(tbl("card_profiles"), "fechamentoDia", { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn(tbl("parcelados"), "dataCompraReal", { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn(tbl("holerites"), "diaRecebimento", { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn(tbl("rendas_extras"), "data", { type: Sequelize.DATEONLY, allowNull: true });

    await queryInterface.createTable(tbl("investimentos"), {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: tbl("users"), key: "id" }, onDelete: "CASCADE" },
      instituicao: { type: Sequelize.STRING, allowNull: false },
      nome: { type: Sequelize.STRING, allowNull: true },
      tipo: { type: Sequelize.STRING(4), allowNull: false, defaultValue: "RF" },
      indexador: { type: Sequelize.STRING(12), allowNull: true },
      percentual: { type: Sequelize.DECIMAL(8, 4), allowNull: true },
      valorAplicado: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      dataAplicacao: { type: Sequelize.DATEONLY, allowNull: true },
      membroId: { type: Sequelize.STRING, allowNull: true },
      historico: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex(tbl("investimentos"), ["userId"]);

    // Módulo "investimentos": cria (se faltar) e libera nos planos que já têm "emprestimos".
    // As queries cruas usam nomes sem schema — resolvem pelo search_path (DB_SCHEMA).
    const now = new Date();
    const [existe] = await queryInterface.sequelize.query(`SELECT id FROM "modules" WHERE chave = 'investimentos';`);
    let moduleId = existe && existe[0] && existe[0].id;
    if (!moduleId) {
      moduleId = randomUUID();
      await queryInterface.bulkInsert(tbl("modules"), [{ id: moduleId, chave: "investimentos", nome: "Investimentos", ordem: 7, descricao: null, createdAt: now, updatedAt: now }]);
    }
    const [planos] = await queryInterface.sequelize.query(
      `SELECT pm."planId" FROM "plan_modules" pm JOIN "modules" m ON m.id = pm."moduleId"
       WHERE m.chave = 'emprestimos'
         AND pm."planId" NOT IN (SELECT "planId" FROM "plan_modules" WHERE "moduleId" = '${moduleId}');`
    );
    if (planos.length) {
      await queryInterface.bulkInsert(tbl("plan_modules"), planos.map((p) => ({ id: randomUUID(), planId: p.planId, moduleId, createdAt: now, updatedAt: now })));
    }
  },
  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(`SELECT id FROM "modules" WHERE chave = 'investimentos';`);
    const ids = (rows || []).map((r) => r.id);
    if (ids.length) {
      await queryInterface.bulkDelete(tbl("plan_modules"), { moduleId: ids });
      await queryInterface.bulkDelete(tbl("modules"), { chave: "investimentos" });
    }
    await queryInterface.dropTable(tbl("investimentos"));
    await queryInterface.removeColumn(tbl("rendas_extras"), "data");
    await queryInterface.removeColumn(tbl("holerites"), "diaRecebimento");
    await queryInterface.removeColumn(tbl("parcelados"), "dataCompraReal");
    await queryInterface.removeColumn(tbl("card_profiles"), "fechamentoDia");
    await queryInterface.removeColumn(tbl("emprestimos"), "diaVencimento");
  },
};
