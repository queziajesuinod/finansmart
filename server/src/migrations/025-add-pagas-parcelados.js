"use strict";

// Adiciona a coluna "pagas" (JSONB) à tabela parcelados. Guarda os números das
// parcelas marcadas como pagas manualmente (baixa por parcela — carnê/boleto ou
// controle próprio). É só status/histórico: não altera o cálculo de despesa (a
// parcela conta pela data). Schema-aware: respeita DB_SCHEMA (ex.: "dev").
const schema = process.env.DB_SCHEMA || undefined;
const tbl = (name) => (schema ? { tableName: name, schema } : name);

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(tbl("parcelados"), "pagas", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn(tbl("parcelados"), "pagas");
  },
};
