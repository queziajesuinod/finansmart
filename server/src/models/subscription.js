// Assinatura do usuário. O status determina se ele está "liberado".
module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define(
    "Subscription",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      planId: { type: DataTypes.UUID, allowNull: false },
      // Espelha os status do Stripe.
      status: {
        type: DataTypes.ENUM("trialing", "active", "past_due", "canceled", "incomplete", "unpaid"),
        allowNull: false,
        defaultValue: "incomplete",
      },
      stripeSubscriptionId: { type: DataTypes.STRING, allowNull: true },
      currentPeriodEnd: { type: DataTypes.DATE, allowNull: true },
      canceladaEm: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: "subscriptions" }
  );

  // Status que liberam o acesso ao sistema.
  Subscription.STATUS_LIBERADOS = ["trialing", "active"];

  Subscription.prototype.estaLiberada = function estaLiberada() {
    if (!Subscription.STATUS_LIBERADOS.includes(this.status)) return false;
    if (this.currentPeriodEnd && new Date(this.currentPeriodEnd) < new Date()) return false;
    return true;
  };

  Subscription.associate = (db) => {
    Subscription.belongsTo(db.User, { foreignKey: "userId", as: "user" });
    Subscription.belongsTo(db.Plan, { foreignKey: "planId", as: "plan" });
    Subscription.hasMany(db.Payment, { foreignKey: "subscriptionId", as: "payments" });
  };

  return Subscription;
};
