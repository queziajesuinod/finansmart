// Investimento (aplicação financeira). Renda fixa guarda o parâmetro de
// rentabilidade (ex.: 100% do CDI); o saldo é atualizado mês a mês em `historico`.
module.exports = (sequelize, DataTypes) => {
  const Investimento = sequelize.define(
    "Investimento",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      instituicao: { type: DataTypes.STRING, allowNull: false },
      nome: { type: DataTypes.STRING, allowNull: true }, // ex.: CDB, Tesouro Selic, ações
      tipo: { type: DataTypes.STRING(4), allowNull: false, defaultValue: "RF" }, // RF | RV
      indexador: { type: DataTypes.STRING(12), allowNull: true }, // CDI | SELIC | IPCA | PRE | OUTRO (só RF)
      percentual: { type: DataTypes.DECIMAL(8, 4), allowNull: true }, // ex.: 100 (% do CDI) ou 12.5 (% a.a.)
      valorAplicado: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      dataAplicacao: { type: DataTypes.DATEONLY, allowNull: true },
      membroId: { type: DataTypes.STRING, allowNull: true },
      // Atualizações mensais de saldo: [{ mesRef: "YYYY-MM", saldo }].
      historico: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    },
    { tableName: "investimentos", indexes: [{ fields: ["userId"] }] }
  );

  Investimento.associate = (db) => {
    Investimento.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  return Investimento;
};
