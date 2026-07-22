"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("cartoes", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      banco: { type: Sequelize.STRING, allowNull: true },
      nome: { type: Sequelize.STRING, allowNull: false },
      limite: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      vencimentoDia: { type: Sequelize.INTEGER, allowNull: true },
      vencimento: { type: Sequelize.STRING, allowNull: true },
      mesRef: { type: Sequelize.STRING, allowNull: false },
      total: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      somaCompras: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      portadores: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("cartoes", ["userId", "mesRef"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("cartoes");
  },
};
