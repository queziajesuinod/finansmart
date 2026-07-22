"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("compras", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      cartaoId: { type: Sequelize.UUID, allowNull: false, references: { model: "cartoes", key: "id" }, onDelete: "CASCADE" },
      descricao: { type: Sequelize.STRING, allowNull: false },
      valor: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      data: { type: Sequelize.DATEONLY, allowNull: false },
      categoria: { type: Sequelize.STRING, allowNull: false, defaultValue: "outros" },
      parcelas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      parcelaAtual: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      portador: { type: Sequelize.STRING, allowNull: true, defaultValue: "Titular" },
      final: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("compras", ["cartaoId"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("compras");
  },
};
