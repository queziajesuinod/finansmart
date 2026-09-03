// Registro de uma importação de fatura: o que foi parseado vs. o que o usuário
// confirmou. Alimenta a análise do admin (qualidade do parser por banco + quais
// correções viram regra). NÃO guarda os itens da fatura — só métricas e as
// correções de categoria (comerciante → categoria).
module.exports = (sequelize, DataTypes) => {
  const ImportLog = sequelize.define(
    "ImportLog",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      banco: { type: DataTypes.STRING, allowNull: true },
      mesRef: { type: DataTypes.STRING, allowNull: true },
      fonte: { type: DataTypes.STRING(8), allowNull: false, defaultValue: "local" }, // local | ia
      itensParsed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      itensConfirmados: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      itensRemovidos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      parcelas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      categoriasCorrigidas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      totalDetectado: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      totalUsado: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      limiteDetectado: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      teveEstorno: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      // [{ chave, de, para }] — correções de categoria feitas nesta importação.
      correcoes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    },
    { tableName: "import_logs", indexes: [{ fields: ["userId"] }, { fields: ["banco"] }] }
  );
  ImportLog.associate = (db) => { ImportLog.belongsTo(db.User, { foreignKey: "userId", as: "user" }); };
  return ImportLog;
};
