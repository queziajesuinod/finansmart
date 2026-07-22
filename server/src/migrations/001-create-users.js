"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      nome: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      senhaHash: { type: Sequelize.STRING, allowNull: true },
      googleId: { type: Sequelize.STRING, allowNull: true, unique: true },
      role: { type: Sequelize.ENUM("admin", "cliente"), allowNull: false, defaultValue: "cliente" },
      cpf: { type: Sequelize.STRING, allowNull: true },
      telefone: { type: Sequelize.STRING, allowNull: true },
      stripeCustomerId: { type: Sequelize.STRING, allowNull: true },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("users");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
  },
};
