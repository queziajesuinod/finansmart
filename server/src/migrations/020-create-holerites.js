"use strict";

// Tabela de holerites (fontes de renda fixa por membro/mês). As conexões já
// setam search_path para DB_SCHEMA (ver config), então nomes sem schema caem
// no schema certo — mesmo padrão das demais migrations "create".
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("holerites", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      membroId: { type: Sequelize.STRING, allowNull: true },
      mesRef: { type: Sequelize.STRING, allowNull: false },
      titulo: { type: Sequelize.STRING, allowNull: true },
      salarioBruto: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      descontos: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      outrosRendimentos: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      recorrente: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("holerites", ["userId", "mesRef"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("holerites");
  },
};
