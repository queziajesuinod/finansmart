"use strict";

// Configurações globais do sistema (chave → valor JSON), editáveis pelo admin.
// As conexões já setam search_path para DB_SCHEMA (config).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("app_settings", {
      chave: { type: Sequelize.STRING, primaryKey: true },
      valor: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("app_settings");
  },
};
