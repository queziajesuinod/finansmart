"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("payments", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      subscriptionId: { type: Sequelize.UUID, allowNull: false, references: { model: "subscriptions", key: "id" }, onDelete: "CASCADE" },
      valorCentavos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      moeda: { type: Sequelize.STRING, allowNull: false, defaultValue: "brl" },
      status: { type: Sequelize.ENUM("paid", "pending", "failed", "refunded"), allowNull: false, defaultValue: "pending" },
      stripeInvoiceId: { type: Sequelize.STRING, allowNull: true },
      stripePaymentIntentId: { type: Sequelize.STRING, allowNull: true },
      pagoEm: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("payments");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_payments_status";');
  },
};
