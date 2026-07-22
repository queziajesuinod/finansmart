// Tabela de junção: quais módulos cada plano libera.
module.exports = (sequelize, DataTypes) => {
  const PlanModule = sequelize.define(
    "PlanModule",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      planId: { type: DataTypes.UUID, allowNull: false },
      moduleId: { type: DataTypes.UUID, allowNull: false },
    },
    { tableName: "plan_modules", indexes: [{ unique: true, fields: ["planId", "moduleId"] }] }
  );

  return PlanModule;
};
