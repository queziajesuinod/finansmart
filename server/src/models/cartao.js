// Fatura de cartão de crédito importada.
module.exports = (sequelize, DataTypes) => {
  const Cartao = sequelize.define(
    "Cartao",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      banco: { type: DataTypes.STRING, allowNull: true },
      nome: { type: DataTypes.STRING, allowNull: false },
      limite: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      vencimentoDia: { type: DataTypes.INTEGER, allowNull: true },
      vencimento: { type: DataTypes.STRING, allowNull: true },
      mesRef: { type: DataTypes.STRING, allowNull: false }, // "ano-mes" (ex: "2026-5")
      total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      somaCompras: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      portadores: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    },
    { tableName: "cartoes", indexes: [{ fields: ["userId", "mesRef"] }] }
  );

  Cartao.associate = (db) => {
    Cartao.belongsTo(db.User, { foreignKey: "userId", as: "user" });
    Cartao.hasMany(db.Compra, { foreignKey: "cartaoId", as: "compras", onDelete: "CASCADE" });
  };

  return Cartao;
};
