// Familiar / dependente gerido pelo usuário principal (sub-perfil, sem login).
// O id vem do cliente (genId) e é preservado nos saves para que as referências
// membroId em despesas/empréstimos/parcelados/compras permaneçam estáveis.
module.exports = (sequelize, DataTypes) => {
  const Membro = sequelize.define(
    "Membro",
    {
      id: { type: DataTypes.STRING, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      nome: { type: DataTypes.STRING, allowNull: false },
      tipo: { type: DataTypes.ENUM("principal", "dependente"), allowNull: false, defaultValue: "dependente" },
      parentesco: { type: DataTypes.STRING, allowNull: true },
      cor: { type: DataTypes.STRING, allowNull: true },
      ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: "membros", indexes: [{ fields: ["userId"] }] }
  );

  Membro.associate = (db) => {
    Membro.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  return Membro;
};
