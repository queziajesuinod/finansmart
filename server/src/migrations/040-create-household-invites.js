"use strict";

// Convites de família por link/código (o app não envia e-mail): o dono gera um
// token, compartilha manualmente, e o convidado define a própria senha ao aceitar.
// As conexões já setam search_path para DB_SCHEMA (ver config) — nomes sem schema.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("household_invites", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      ownerId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      token: { type: Sequelize.STRING, allowNull: false, unique: true },
      nome: { type: Sequelize.STRING, allowNull: true },
      role: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "member" },
      membroId: { type: Sequelize.STRING, allowNull: true },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      usedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("household_invites", ["ownerId"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("household_invites");
  },
};
