// Plano de assinatura. Cada plano libera um conjunto de módulos.
module.exports = (sequelize, DataTypes) => {
  const Plan = sequelize.define(
    "Plan",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      nome: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      descricao: { type: DataTypes.STRING, allowNull: true },
      // Preço em centavos, para evitar erros de ponto flutuante.
      precoCentavos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      intervalo: { type: DataTypes.ENUM("month", "year"), allowNull: false, defaultValue: "month" },
      stripePriceId: { type: DataTypes.STRING, allowNull: true },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: "plans" }
  );

  Plan.associate = (db) => {
    Plan.belongsToMany(db.Module, { through: db.PlanModule, foreignKey: "planId", otherKey: "moduleId", as: "modules" });
    Plan.hasMany(db.Subscription, { foreignKey: "planId", as: "subscriptions" });
  };

  return Plan;
};
