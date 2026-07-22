"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("subscriptions", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      planId: { type: Sequelize.UUID, allowNull: false, references: { model: "plans", key: "id" }, onDelete: "RESTRICT" },
      status: {
        type: Sequelize.ENUM("trialing", "active", "past_due", "canceled", "incomplete", "unpaid"),
        allowNull: false,
        defaultValue: "incomplete",
      },
      stripeSubscriptionId: { type: Sequelize.STRING, allowNull: true },
      currentPeriodEnd: { type: Sequelize.DATE, allowNull: true },
      canceladaEm: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("subscriptions", ["userId"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("subscriptions");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_subscriptions_status";');
  },
};
