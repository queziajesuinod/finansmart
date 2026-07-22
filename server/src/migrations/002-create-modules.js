"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("modules", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      chave: { type: Sequelize.STRING, allowNull: false, unique: true },
      nome: { type: Sequelize.STRING, allowNull: false },
      descricao: { type: Sequelize.STRING, allowNull: true },
      ordem: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("modules");
  },
};
