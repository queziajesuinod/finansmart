// Renda extra (variável, pontual) de um membro num mês. Um membro pode ter
// várias no mesmo mês. Não é recorrente — vale só no mês de referência.
module.exports = (sequelize, DataTypes) => {
  const RendaExtra = sequelize.define(
    "RendaExtra",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      membroId: { type: DataTypes.STRING, allowNull: true }, // null = principal
      mesRef: { type: DataTypes.STRING, allowNull: false }, // "YYYY-MM" (MM 01-12)
      descricao: { type: DataTypes.STRING, allowNull: true },
      valor: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      recorrente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, // repete nos meses seguintes
      data: { type: DataTypes.DATEONLY, allowNull: true }, // data em que entrou (recorrente: vale o dia)
    },
    { tableName: "rendas_extras", indexes: [{ fields: ["userId", "mesRef"] }] }
  );

  RendaExtra.associate = (db) => {
    RendaExtra.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  return RendaExtra;
};
