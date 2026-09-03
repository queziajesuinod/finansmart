"use strict";

// Regras de categorização GLOBAIS (comerciante → categoria) promovidas pelo admin.
// As conexões já setam search_path para DB_SCHEMA (ver config) — nomes sem schema.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("global_category_rules", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      chave: { type: Sequelize.STRING, allowNull: false, unique: true },
      categoria: { type: Sequelize.STRING, allowNull: false },
      criadoPor: { type: Sequelize.UUID, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("global_category_rules", ["chave"], { unique: true });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("global_category_rules");
  },
};
