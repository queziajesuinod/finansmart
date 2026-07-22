"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("plan_modules", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      planId: { type: Sequelize.UUID, allowNull: false, references: { model: "plans", key: "id" }, onDelete: "CASCADE" },
      moduleId: { type: Sequelize.UUID, allowNull: false, references: { model: "modules", key: "id" }, onDelete: "CASCADE" },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("plan_modules", ["planId", "moduleId"], { unique: true, name: "plan_modules_plan_module_unique" });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("plan_modules");
  },
};
