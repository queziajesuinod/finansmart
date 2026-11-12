// Refresh token rotativo (sessão longa). Só o hash é persistido — ver migration.
module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define(
    "RefreshToken",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      tokenHash: { type: DataTypes.STRING, allowNull: false, unique: true },
      familyId: { type: DataTypes.UUID, allowNull: false },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      revokedAt: { type: DataTypes.DATE, allowNull: true },
      replacedById: { type: DataTypes.UUID, allowNull: true },
      userAgent: { type: DataTypes.STRING, allowNull: true },
      ip: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: "refresh_tokens" }
  );

  RefreshToken.associate = (db) => {
    RefreshToken.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  return RefreshToken;
};
