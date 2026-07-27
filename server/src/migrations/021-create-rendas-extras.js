"use strict";

// Tabela de rendas extras (variáveis, por membro/mês). search_path já aponta
// para o schema correto (ver config), como nas demais migrations "create".
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("rendas_extras", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      membroId: { type: Sequelize.STRING, allowNull: true },
      mesRef: { type: Sequelize.STRING, allowNull: false },
      descricao: { type: Sequelize.STRING, allowNull: true },
      valor: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("rendas_extras", ["userId", "mesRef"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("rendas_extras");
  },
};
