"use strict";

// Adiciona "recorrente" à renda extra: quando true, repete nos meses seguintes
// (a partir do mesRef) até ser excluída. Schema-aware (DB_SCHEMA).
const schema = process.env.DB_SCHEMA || undefined;
const tbl = (name) => (schema ? { tableName: name, schema } : name);

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(tbl("rendas_extras"), "recorrente", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn(tbl("rendas_extras"), "recorrente");
  },
};
