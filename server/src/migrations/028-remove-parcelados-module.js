"use strict";

// Remove o módulo "parcelados": ele foi absorvido pelo módulo "cartoes" (virou uma
// aba dentro do Cartão de Crédito). Apaga as associações plano↔módulo e o módulo.
// A tabela/dados "parcelados" (os parcelamentos em si) NÃO são afetados.
// Schema-aware: respeita DB_SCHEMA (ex.: "dev").
const { randomUUID } = require("crypto");
const schema = process.env.DB_SCHEMA || undefined;
const tbl = (name) => (schema ? { tableName: name, schema } : name);
const qual = (name) => (schema ? `"${schema}"."${name}"` : `"${name}"`);

module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(`SELECT id FROM ${qual("modules")} WHERE chave = 'parcelados';`);
    const ids = (rows || []).map((r) => r.id);
    if (ids.length) {
      await queryInterface.bulkDelete(tbl("plan_modules"), { moduleId: ids });
      await queryInterface.bulkDelete(tbl("modules"), { chave: "parcelados" });
    }
  },
  async down(queryInterface) {
    // Recria o módulo (sem reassociar a planos). Best-effort para reversão.
    const now = new Date();
    await queryInterface.bulkInsert(
      tbl("modules"),
      [{ id: randomUUID(), chave: "parcelados", nome: "Parcelados", ordem: 7, descricao: null, createdAt: now, updatedAt: now }],
      { ignoreDuplicates: true }
    );
  },
};
