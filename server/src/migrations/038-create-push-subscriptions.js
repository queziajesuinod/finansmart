"use strict";

// Inscrições de Web Push (um registro por aparelho/navegador que ativou os
// avisos). endpoint é a URL única do push service; p256dh/auth são as chaves do
// navegador usadas para criptografar a mensagem. A chave privada VAPID fica em
// app_settings (ver services/push.js) — aqui guardamos só os dados do cliente.
// As conexões já setam search_path para DB_SCHEMA (ver config) — nomes sem schema.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("push_subscriptions", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      endpoint: { type: Sequelize.TEXT, allowNull: false, unique: true },
      p256dh: { type: Sequelize.TEXT, allowNull: false },
      auth: { type: Sequelize.TEXT, allowNull: false },
      userAgent: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("push_subscriptions", ["userId"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("push_subscriptions");
  },
};
