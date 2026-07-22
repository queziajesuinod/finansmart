// Renda de um mês específico (um registro por usuário + ano/mês).
module.exports = (sequelize, DataTypes) => {
  const Income = sequelize.define(
    "Income",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      ano: { type: DataTypes.INTEGER, allowNull: false },
      mes: { type: DataTypes.INTEGER, allowNull: false }, // 0-11 (igual ao frontend)
      renda: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      extra: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    },
    { tableName: "incomes", indexes: [{ unique: true, fields: ["userId", "ano", "mes"] }] }
  );

  Income.associate = (db) => {
    Income.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  return Income;
};
