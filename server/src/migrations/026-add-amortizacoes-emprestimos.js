"use strict";

// Adiciona a empréstimos:
//  • "amortizacoes" (JSONB): aportes extraordinários [{ id, data, valor, tipo, parcela }].
//    tipo "prazo" (mantém prestação, encurta prazo) | "parcela" (mantém prazo, reduz prestação).
//  • "taxaPeriodo" (string): unidade em que o usuário digitou a taxa ("mensal" | "anual").
//    A coluna "taxa" continua sendo a taxa MENSAL canônica; taxaPeriodo é só p/ exibição/edição.
// Schema-aware: respeita DB_SCHEMA (ex.: "dev").
const schema = process.env.DB_SCHEMA || undefined;
const tbl = (name) => (schema ? { tableName: name, schema } : name);

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(tbl("emprestimos"), "amortizacoes", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.addColumn(tbl("emprestimos"), "taxaPeriodo", {
      type: Sequelize.STRING(8),
      allowNull: false,
      defaultValue: "mensal",
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn(tbl("emprestimos"), "amortizacoes");
    await queryInterface.removeColumn(tbl("emprestimos"), "taxaPeriodo");
  },
};
