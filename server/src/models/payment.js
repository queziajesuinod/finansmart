// Histórico de cobranças de uma assinatura (preenchido pelos webhooks do Stripe).
module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    "Payment",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      subscriptionId: { type: DataTypes.UUID, allowNull: false },
      valorCentavos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      moeda: { type: DataTypes.STRING, allowNull: false, defaultValue: "brl" },
      status: { type: DataTypes.ENUM("paid", "pending", "failed", "refunded"), allowNull: false, defaultValue: "pending" },
      stripeInvoiceId: { type: DataTypes.STRING, allowNull: true },
      stripePaymentIntentId: { type: DataTypes.STRING, allowNull: true },
      pagoEm: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: "payments" }
  );

  Payment.associate = (db) => {
    Payment.belongsTo(db.Subscription, { foreignKey: "subscriptionId", as: "subscription" });
  };

  return Payment;
};
