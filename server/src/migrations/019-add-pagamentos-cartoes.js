"use strict";

// Adiciona a coluna "pagamentos" (JSONB) à tabela cartoes. Guarda as quitações
// da fatura ({ id, data, valor, descricao }) — histórico separado das compras,
// não conta como gasto. Schema-aware: respeita DB_SCHEMA (ex.: "dev").
const schema = process.env.DB_SCHEMA || undefined;
const tbl = (name) => (schema ? { tableName: name, schema } : name);

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(tbl("cartoes"), "pagamentos", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn(tbl("cartoes"), "pagamentos");
  },
};
