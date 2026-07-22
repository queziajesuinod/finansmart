"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("card_profiles", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      nome: { type: Sequelize.STRING, allowNull: false },
      banco: { type: Sequelize.STRING, allowNull: true },
      bandeira: { type: Sequelize.STRING, allowNull: true },
      limite: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      vencimentoDia: { type: Sequelize.INTEGER, allowNull: true },
      finais: { type: Sequelize.STRING, allowNull: true },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("card_profiles", ["userId"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("card_profiles");
  },
};
