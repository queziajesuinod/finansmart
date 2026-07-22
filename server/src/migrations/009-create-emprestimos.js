"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("emprestimos", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      instituicao: { type: Sequelize.STRING, allowNull: false },
      contrato: { type: Sequelize.STRING, allowNull: true },
      valorContratado: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      taxa: { type: Sequelize.DECIMAL(8, 4), allowNull: false, defaultValue: 0 },
      parcelas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      pago: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      pagoAuto: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      dataContratacao: { type: Sequelize.DATEONLY, allowNull: true },
      dataPrimeira: { type: Sequelize.DATEONLY, allowNull: true },
      dataQuitacao: { type: Sequelize.DATEONLY, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("emprestimos", ["userId"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("emprestimos");
  },
};
