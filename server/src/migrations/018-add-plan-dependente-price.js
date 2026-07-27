"use strict";

// Schema-aware: respeita DB_SCHEMA (ex.: "dev").
const schema = process.env.DB_SCHEMA || undefined;
const tbl = (name) => (schema ? { tableName: name, schema } : name);

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(tbl("plans"), "precoDependenteCentavos", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn(tbl("plans"), "precoDependenteCentavos");
  },
};
