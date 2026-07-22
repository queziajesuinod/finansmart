"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("category_rules", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      chave: { type: Sequelize.STRING, allowNull: false },
      categoria: { type: Sequelize.STRING, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("category_rules", ["userId", "chave"], { unique: true, name: "category_rules_user_chave_unique" });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("category_rules");
  },
};
