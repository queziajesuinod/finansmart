"use strict";

// Credenciais de passkey (WebAuthn). Cada usuário pode ter várias (um por
// aparelho). Guardamos a chave PÚBLICA (COSE, base64url) — a privada nunca sai do
// Secure Enclave / TPM do dispositivo. counter detecta clonagem da credencial.
// As conexões já setam search_path para DB_SCHEMA (ver config) — nomes sem schema.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("webauthn_credentials", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      credentialId: { type: Sequelize.TEXT, allowNull: false, unique: true },
      publicKey: { type: Sequelize.TEXT, allowNull: false },
      counter: { type: Sequelize.BIGINT, allowNull: false, defaultValue: 0 },
      transports: { type: Sequelize.STRING, allowNull: true },
      deviceType: { type: Sequelize.STRING, allowNull: true },
      backedUp: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      nome: { type: Sequelize.STRING, allowNull: true },
      lastUsedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("webauthn_credentials", ["userId"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("webauthn_credentials");
  },
};
