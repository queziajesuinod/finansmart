"use strict";

// Adiciona a holerites o controle de salário proporcional aos dias trabalhados:
//  • "salarioBase" (DECIMAL): salário do mês CHEIO (referência).
//  • "diasTrabalhados" (INTEGER, default 30): dias trabalhados no mês.
// O salário do mês (coluna "salarioBruto") passa a ser o proporcional: base × dias/30.
// Ex.: base 10.957,78 e 15 dias → salarioBruto 5.478,89. Schema-aware (DB_SCHEMA).
const schema = process.env.DB_SCHEMA || undefined;
const tbl = (name) => (schema ? { tableName: name, schema } : name);

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(tbl("holerites"), "salarioBase", {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn(tbl("holerites"), "diasTrabalhados", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 30,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn(tbl("holerites"), "salarioBase");
    await queryInterface.removeColumn(tbl("holerites"), "diasTrabalhados");
  },
};
