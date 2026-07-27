"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("membros", {
      id: { type: Sequelize.STRING, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      nome: { type: Sequelize.STRING, allowNull: false },
      tipo: { type: Sequelize.ENUM("principal", "dependente"), allowNull: false, defaultValue: "dependente" },
      parentesco: { type: Sequelize.STRING, allowNull: true },
      cor: { type: Sequelize.STRING, allowNull: true },
      ordem: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("membros", ["userId"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("membros");
  },
};
