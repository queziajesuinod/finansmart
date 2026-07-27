"use strict";

// Adiciona membroId (nullable) às entidades financeiras. null = principal.
// Schema-aware: respeita DB_SCHEMA (ex.: "dev") para não cair no "public".
const TABELAS = ["despesas", "emprestimos", "parcelados", "compras"];
const schema = process.env.DB_SCHEMA || undefined;
const tbl = (name) => (schema ? { tableName: name, schema } : name);

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const tabela of TABELAS) {
      await queryInterface.addColumn(tbl(tabela), "membroId", { type: Sequelize.STRING, allowNull: true });
    }
  },
  async down(queryInterface) {
    for (const tabela of TABELAS) {
      await queryInterface.removeColumn(tbl(tabela), "membroId");
    }
  },
};
