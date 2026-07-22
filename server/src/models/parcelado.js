// Compra parcelada no cartão.
module.exports = (sequelize, DataTypes) => {
  const Parcelado = sequelize.define(
    "Parcelado",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      descricao: { type: DataTypes.STRING, allowNull: false },
      valorTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      totalParcelas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      parcelaAtual: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      valorParcela: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      dataCompra: { type: DataTypes.DATEONLY, allowNull: false },
      categoria: { type: DataTypes.STRING, allowNull: false, defaultValue: "outros" },
      origem: { type: DataTypes.STRING, allowNull: true },
      // Referência opcional ao cartão de onde a compra veio (importação).
      cartaoId: { type: DataTypes.UUID, allowNull: true },
    },
    { tableName: "parcelados", indexes: [{ fields: ["userId"] }] }
  );

  Parcelado.associate = (db) => {
    Parcelado.belongsTo(db.User, { foreignKey: "userId", as: "user" });
    Parcelado.belongsTo(db.Cartao, { foreignKey: "cartaoId", as: "cartao" });
  };

  return Parcelado;
};
