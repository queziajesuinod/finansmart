// Empréstimo (Tabela Price).
module.exports = (sequelize, DataTypes) => {
  const Emprestimo = sequelize.define(
    "Emprestimo",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      instituicao: { type: DataTypes.STRING, allowNull: false },
      contrato: { type: DataTypes.STRING, allowNull: true },
      valorContratado: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      taxa: { type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 0 }, // % mensal
      parcelas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      pago: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      pagoAuto: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      dataContratacao: { type: DataTypes.DATEONLY, allowNull: true },
      dataPrimeira: { type: DataTypes.DATEONLY, allowNull: true },
      dataQuitacao: { type: DataTypes.DATEONLY, allowNull: true },
    },
    { tableName: "emprestimos", indexes: [{ fields: ["userId"] }] }
  );

  Emprestimo.associate = (db) => {
    Emprestimo.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  return Emprestimo;
};
