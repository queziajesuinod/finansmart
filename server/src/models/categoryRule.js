// Regra de categorização aprendida por usuário: comerciante → categoria.
// Aplicada automaticamente nas importações seguintes.
module.exports = (sequelize, DataTypes) => {
  const CategoryRule = sequelize.define(
    "CategoryRule",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      chave: { type: DataTypes.STRING, allowNull: false }, // comerciante normalizado
      categoria: { type: DataTypes.STRING, allowNull: false },
    },
    { tableName: "category_rules", indexes: [{ unique: true, fields: ["userId", "chave"] }] }
  );

  CategoryRule.associate = (db) => {
    CategoryRule.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  return CategoryRule;
};
