"use strict";

// Revisão por usuário + coleção (despesas, cartoes, ...). Cada PUT "replace-all"
// confere a revisão que o cliente carregou e a incrementa — assim um aparelho com
// dados antigos não sobrescreve em silêncio o que outro aparelho acabou de salvar.
// As conexões já setam search_path para DB_SCHEMA (ver config) — nomes sem schema.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("data_revs", {
      userId: { type: Sequelize.UUID, allowNull: false, primaryKey: true, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      colecao: { type: Sequelize.STRING(40), allowNull: false, primaryKey: true },
      rev: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("data_revs");
  },
};
