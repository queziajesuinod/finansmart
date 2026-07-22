"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("incomes", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      ano: { type: Sequelize.INTEGER, allowNull: false },
      mes: { type: Sequelize.INTEGER, allowNull: false },
      renda: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      extra: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("incomes", ["userId", "ano", "mes"], { unique: true, name: "incomes_user_ano_mes_unique" });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("incomes");
  },
};
