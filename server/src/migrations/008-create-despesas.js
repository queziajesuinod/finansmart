"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("despesas", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      descricao: { type: Sequelize.STRING, allowNull: false },
      valor: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      categoria: { type: Sequelize.STRING, allowNull: false, defaultValue: "outros" },
      data: { type: Sequelize.DATEONLY, allowNull: false },
      ano: { type: Sequelize.INTEGER, allowNull: false },
      mes: { type: Sequelize.INTEGER, allowNull: false },
      fixo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("despesas", ["userId", "ano", "mes"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("despesas");
  },
};
