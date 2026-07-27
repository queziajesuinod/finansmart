"use strict";

// Adiciona "valorPago" (nullable) à fatura do cartão: quanto dessa fatura foi
// quitado (baixa). null = ainda não conciliada (conta cheia, como antes);
// número = regime de caixa (conta o que foi pago). Schema-aware (DB_SCHEMA).
const schema = process.env.DB_SCHEMA || undefined;
const tbl = (name) => (schema ? { tableName: name, schema } : name);

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(tbl("cartoes"), "valorPago", { type: Sequelize.DECIMAL(12, 2), allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn(tbl("cartoes"), "valorPago");
  },
};
