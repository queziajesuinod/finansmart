// Lançamento de despesa variável.
module.exports = (sequelize, DataTypes) => {
  const Despesa = sequelize.define(
    "Despesa",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      descricao: { type: DataTypes.STRING, allowNull: false },
      valor: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      categoria: { type: DataTypes.STRING, allowNull: false, defaultValue: "outros" },
      data: { type: DataTypes.DATEONLY, allowNull: false },
      // Colunas derivadas para filtrar por mês rapidamente.
      ano: { type: DataTypes.INTEGER, allowNull: false },
      mes: { type: DataTypes.INTEGER, allowNull: false }, // 0-11
      fixo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: "despesas", indexes: [{ fields: ["userId", "ano", "mes"] }] }
  );

  Despesa.associate = (db) => {
    Despesa.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  return Despesa;
};
