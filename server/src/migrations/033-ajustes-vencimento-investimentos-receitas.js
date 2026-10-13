"use strict";

// Ajustes pedidos em set/out 2026:
//  • emprestimos.diaVencimento  — dia do mês em que a parcela vence (extrato).
//  • card_profiles.fechamentoDia — dia em que a fatura "vira" (fecha).
//  • parcelados.dataCompraReal  — data real da compra (dataCompra segue sendo a
//    âncora da 1ª parcela, derivada do fechamento do cartão).
//  • holerites.diaRecebimento   — dia do mês em que o salário entra.
//  • rendas_extras.data         — data em que a renda extra entrou.
//  • tabela investimentos + módulo "investimentos" (liberado nos planos que já têm "emprestimos").
// As conexões já setam search_path para DB_SCHEMA (ver config) — nomes sem schema.
const { randomUUID } = require("crypto");

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("emprestimos", "diaVencimento", { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn("card_profiles", "fechamentoDia", { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn("parcelados", "dataCompraReal", { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn("holerites", "diaRecebimento", { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn("rendas_extras", "data", { type: Sequelize.DATEONLY, allowNull: true });

    await queryInterface.createTable("investimentos", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
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
    await queryInterface.addIndex("investimentos", ["userId"]);

    // Módulo "investimentos": cria (se faltar) e libera nos planos que já têm "emprestimos".
    const now = new Date();
    const [existe] = await queryInterface.sequelize.query(`SELECT id FROM "modules" WHERE chave = 'investimentos';`);
    let moduleId = existe && existe[0] && existe[0].id;
    if (!moduleId) {
      moduleId = randomUUID();
      await queryInterface.bulkInsert("modules", [{ id: moduleId, chave: "investimentos", nome: "Investimentos", ordem: 7, descricao: null, createdAt: now, updatedAt: now }]);
    }
    const [planos] = await queryInterface.sequelize.query(
      `SELECT pm."planId" FROM "plan_modules" pm JOIN "modules" m ON m.id = pm."moduleId"
       WHERE m.chave = 'emprestimos'
         AND pm."planId" NOT IN (SELECT "planId" FROM "plan_modules" WHERE "moduleId" = '${moduleId}');`
    );
    if (planos.length) {
      await queryInterface.bulkInsert("plan_modules", planos.map((p) => ({ id: randomUUID(), planId: p.planId, moduleId, createdAt: now, updatedAt: now })));
    }
  },
  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(`SELECT id FROM "modules" WHERE chave = 'investimentos';`);
    const ids = (rows || []).map((r) => r.id);
    if (ids.length) {
      await queryInterface.bulkDelete("plan_modules", { moduleId: ids });
      await queryInterface.bulkDelete("modules", { chave: "investimentos" });
    }
    await queryInterface.dropTable("investimentos");
    await queryInterface.removeColumn("rendas_extras", "data");
    await queryInterface.removeColumn("holerites", "diaRecebimento");
    await queryInterface.removeColumn("parcelados", "dataCompraReal");
    await queryInterface.removeColumn("card_profiles", "fechamentoDia");
    await queryInterface.removeColumn("emprestimos", "diaVencimento");
  },
};
