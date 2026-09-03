"use strict";

// Remove o módulo "importar" (Importar PDF): foi absorvido pelo módulo "cartoes"
// (o botão de importar fatura vive dentro do Cartão de Crédito). Apaga as
// associações plano↔módulo e o módulo. A importação em si continua funcionando.
// Schema-aware: respeita DB_SCHEMA (ex.: "dev").
const { randomUUID } = require("crypto");
const schema = process.env.DB_SCHEMA || undefined;
const tbl = (name) => (schema ? { tableName: name, schema } : name);
const qual = (name) => (schema ? `"${schema}"."${name}"` : `"${name}"`);

module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(`SELECT id FROM ${qual("modules")} WHERE chave = 'importar';`);
    const ids = (rows || []).map((r) => r.id);
    if (ids.length) {
      await queryInterface.bulkDelete(tbl("plan_modules"), { moduleId: ids });
      await queryInterface.bulkDelete(tbl("modules"), { chave: "importar" });
    }
  },
  async down(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      tbl("modules"),
      [{ id: randomUUID(), chave: "importar", nome: "Importar PDF", ordem: 4, descricao: null, createdAt: now, updatedAt: now }],
      { ignoreDuplicates: true }
    );
  },
};
