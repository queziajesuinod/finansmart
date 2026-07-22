// Usuário / cliente (B2C). Cada usuário tem a própria assinatura.
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      nome: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
      // Nulo quando o usuário entrou só pelo Google.
      senhaHash: { type: DataTypes.STRING, allowNull: true },
      googleId: { type: DataTypes.STRING, allowNull: true, unique: true },
      role: { type: DataTypes.ENUM("admin", "cliente"), allowNull: false, defaultValue: "cliente" },
      // Dados de cobrança coletados no cadastro.
      cpf: { type: DataTypes.STRING, allowNull: true },
      telefone: { type: DataTypes.STRING, allowNull: true },
      stripeCustomerId: { type: DataTypes.STRING, allowNull: true },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: "users" }
  );

  User.associate = (db) => {
    User.hasMany(db.Subscription, { foreignKey: "userId", as: "subscriptions" });
    User.hasMany(db.Income, { foreignKey: "userId", as: "incomes" });
    User.hasMany(db.Despesa, { foreignKey: "userId", as: "despesas" });
    User.hasMany(db.Emprestimo, { foreignKey: "userId", as: "emprestimos" });
    User.hasMany(db.Parcelado, { foreignKey: "userId", as: "parcelados" });
    User.hasMany(db.Cartao, { foreignKey: "userId", as: "cartoes" });
    User.hasMany(db.Goal, { foreignKey: "userId", as: "goals" });
  };

  // Nunca serializa segredos.
  User.prototype.toSafeJSON = function toSafeJSON() {
    const { id, nome, email, role, cpf, telefone, ativo, googleId, createdAt } = this;
    return { id, nome, email, role, cpf, telefone, ativo, temGoogle: Boolean(googleId), createdAt };
  };

  return User;
};
