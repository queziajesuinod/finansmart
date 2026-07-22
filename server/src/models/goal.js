// Meta financeira do usuário.
module.exports = (sequelize, DataTypes) => {
  const Goal = sequelize.define(
    "Goal",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      nome: { type: DataTypes.STRING, allowNull: false },
      alvo: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      atual: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      prazo: { type: DataTypes.DATEONLY, allowNull: true },
    },
    { tableName: "goals", indexes: [{ fields: ["userId"] }] }
  );

  Goal.associate = (db) => {
    Goal.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  return Goal;
};
