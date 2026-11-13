// Convite de família (link/código). Ver migration para os campos.
module.exports = (sequelize, DataTypes) => {
  const HouseholdInvite = sequelize.define(
    "HouseholdInvite",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      ownerId: { type: DataTypes.UUID, allowNull: false },
      token: { type: DataTypes.STRING, allowNull: false, unique: true },
      nome: { type: DataTypes.STRING, allowNull: true },
      role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "member" },
      membroId: { type: DataTypes.STRING, allowNull: true },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      usedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: "household_invites", indexes: [{ fields: ["ownerId"] }] }
  );

  HouseholdInvite.associate = (db) => {
    HouseholdInvite.belongsTo(db.User, { foreignKey: "ownerId", as: "owner" });
  };

  return HouseholdInvite;
};
