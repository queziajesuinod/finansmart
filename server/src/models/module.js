// Módulo do sistema = uma área/aba (dashboard, cartoes, emprestimos, ...).
// O acesso é concedido por plano.
module.exports = (sequelize, DataTypes) => {
  const Module = sequelize.define(
    "Module",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      chave: { type: DataTypes.STRING, allowNull: false, unique: true },
      nome: { type: DataTypes.STRING, allowNull: false },
      descricao: { type: DataTypes.STRING, allowNull: true },
      ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: "modules" }
  );

  Module.associate = (db) => {
    Module.belongsToMany(db.Plan, { through: db.PlanModule, foreignKey: "moduleId", otherKey: "planId", as: "plans" });
  };

  return Module;
};
