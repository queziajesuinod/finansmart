// Compra individual dentro de uma fatura de cartão.
module.exports = (sequelize, DataTypes) => {
  const Compra = sequelize.define(
    "Compra",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      cartaoId: { type: DataTypes.UUID, allowNull: false },
      descricao: { type: DataTypes.STRING, allowNull: false },
      valor: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      data: { type: DataTypes.DATEONLY, allowNull: false },
      categoria: { type: DataTypes.STRING, allowNull: false, defaultValue: "outros" },
      parcelas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      parcelaAtual: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      portador: { type: DataTypes.STRING, allowNull: true, defaultValue: "Titular" },
      final: { type: DataTypes.STRING, allowNull: true },
    },
    { tableName: "compras", indexes: [{ fields: ["cartaoId"] }] }
  );

  Compra.associate = (db) => {
    Compra.belongsTo(db.Cartao, { foreignKey: "cartaoId", as: "cartao" });
  };

  return Compra;
};
