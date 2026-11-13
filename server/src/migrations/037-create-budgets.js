"use strict";

// Orçamento por categoria (envelopes): um teto de gasto mensal por categoria.
// mesRef null = teto padrão que vale todo mês; um mesRef "YYYY-MM" permite um
// override pontual de um mês específico. Comparado no front contra o gasto real
// da categoria (lançamentos + compras de cartão do mês).
// As conexões já setam search_path para DB_SCHEMA (ver config) — nomes sem schema.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("budgets", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      categoria: { type: Sequelize.STRING(40), allowNull: false },
      limite: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      mesRef: { type: Sequelize.STRING(7), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("budgets", ["userId"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("budgets");
  },
};
