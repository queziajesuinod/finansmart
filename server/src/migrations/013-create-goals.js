"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("goals", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      nome: { type: Sequelize.STRING, allowNull: false },
      alvo: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      atual: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      prazo: { type: Sequelize.DATEONLY, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("goals", ["userId"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("goals");
  },
};
