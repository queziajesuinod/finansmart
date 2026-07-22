"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("parcelados", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      descricao: { type: Sequelize.STRING, allowNull: false },
      valorTotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      totalParcelas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      parcelaAtual: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      valorParcela: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      dataCompra: { type: Sequelize.DATEONLY, allowNull: false },
      categoria: { type: Sequelize.STRING, allowNull: false, defaultValue: "outros" },
      origem: { type: Sequelize.STRING, allowNull: true },
      cartaoId: { type: Sequelize.UUID, allowNull: true, references: { model: "cartoes", key: "id" }, onDelete: "SET NULL" },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("parcelados", ["userId"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("parcelados");
  },
};
