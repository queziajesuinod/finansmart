// Regra de categorização GLOBAL (comerciante → categoria), promovida pelo admin a
// partir das correções recorrentes dos clientes. Aplicada a TODAS as importações
// (as regras pessoais do usuário têm prioridade sobre estas).
module.exports = (sequelize, DataTypes) => {
  const GlobalCategoryRule = sequelize.define(
    "GlobalCategoryRule",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      chave: { type: DataTypes.STRING, allowNull: false, unique: true }, // comerciante normalizado (merchantKey)
      categoria: { type: DataTypes.STRING, allowNull: false },
      criadoPor: { type: DataTypes.UUID, allowNull: true }, // admin que promoveu
    },
    { tableName: "global_category_rules", indexes: [{ unique: true, fields: ["chave"] }] }
  );
  return GlobalCategoryRule;
};
