"use strict";

// Refresh tokens rotativos (sessão longa, cookie httpOnly). Guardamos só o HASH
// do token opaco — nunca o valor cru. Cada uso rotaciona (emite um novo, revoga o
// atual). familyId amarra a cadeia de rotações: se um token já revogado for
// reapresentado (sinal de roubo do cookie), revogamos a família inteira.
// As conexões já setam search_path para DB_SCHEMA (ver config) — nomes sem schema.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("refresh_tokens", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      tokenHash: { type: Sequelize.STRING, allowNull: false, unique: true },
      familyId: { type: Sequelize.UUID, allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      revokedAt: { type: Sequelize.DATE, allowNull: true },
      replacedById: { type: Sequelize.UUID, allowNull: true },
      userAgent: { type: Sequelize.STRING, allowNull: true },
      ip: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("refresh_tokens", ["familyId"]);
    await queryInterface.addIndex("refresh_tokens", ["userId"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("refresh_tokens");
  },
};
