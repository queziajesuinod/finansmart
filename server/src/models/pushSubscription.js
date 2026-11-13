// Inscrição de Web Push de um aparelho. Ver migration para os campos.
module.exports = (sequelize, DataTypes) => {
  const PushSubscription = sequelize.define(
    "PushSubscription",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      endpoint: { type: DataTypes.TEXT, allowNull: false, unique: true },
      p256dh: { type: DataTypes.TEXT, allowNull: false },
      auth: { type: DataTypes.TEXT, allowNull: false },
      userAgent: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: "push_subscriptions", indexes: [{ fields: ["userId"] }] }
  );

  PushSubscription.associate = (db) => {
    PushSubscription.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  return PushSubscription;
};
