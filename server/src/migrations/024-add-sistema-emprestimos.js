"use strict";

// Adiciona "sistema" ao empréstimo: sistema de amortização (PRICE ou SAC).
// Default PRICE para manter a paridade dos contratos já cadastrados (antes só
// havia Tabela Price). Schema-aware (DB_SCHEMA).
const schema = process.env.DB_SCHEMA || undefined;
const tbl = (name) => (schema ? { tableName: name, schema } : name);

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(tbl("emprestimos"), "sistema", {
      type: Sequelize.STRING(8),
      allowNull: false,
      defaultValue: "PRICE",
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn(tbl("emprestimos"), "sistema");
  },
};
