// Orçamento (teto de gasto) por categoria. mesRef null = vale todo mês.
module.exports = (sequelize, DataTypes) => {
  const Budget = sequelize.define(
    "Budget",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      categoria: { type: DataTypes.STRING(40), allowNull: false },
      limite: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      mesRef: { type: DataTypes.STRING(7), allowNull: true },
    },
    { tableName: "budgets", indexes: [{ fields: ["userId"] }] }
  );

  Budget.associate = (db) => {
    Budget.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  return Budget;
};
