// Cartão cadastrado pelo usuário ("Meus Cartões"). Usado para pré-preencher
// e autodetectar (pelos 4 finais) na importação de faturas.
module.exports = (sequelize, DataTypes) => {
  const CardProfile = sequelize.define(
    "CardProfile",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      nome: { type: DataTypes.STRING, allowNull: false }, // apelido
      banco: { type: DataTypes.STRING, allowNull: true },
      bandeira: { type: DataTypes.STRING, allowNull: true },
      limite: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      vencimentoDia: { type: DataTypes.INTEGER, allowNull: true },
      finais: { type: DataTypes.STRING, allowNull: true }, // 4 últimos dígitos
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: "card_profiles", indexes: [{ fields: ["userId"] }] }
  );

  CardProfile.associate = (db) => {
    CardProfile.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  return CardProfile;
};
