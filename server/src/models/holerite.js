// Holerite (fonte de renda fixa) de um membro num mês de referência.
// Um membro pode ter VÁRIOS holerites no mesmo mês (mais de um trabalho).
// A renda fixa do mês é derivada: soma dos líquidos dos holerites vigentes.
// Líquido = salarioBruto − Σ descontos (calculado no cliente).
module.exports = (sequelize, DataTypes) => {
  const Holerite = sequelize.define(
    "Holerite",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      membroId: { type: DataTypes.STRING, allowNull: true }, // null = principal
      mesRef: { type: DataTypes.STRING, allowNull: false }, // "YYYY-MM" (MM 01-12)
      titulo: { type: DataTypes.STRING, allowNull: true }, // ex.: nome do trabalho/empresa
      salarioBruto: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }, // salário DO MÊS (já proporcional aos dias)
      salarioBase: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }, // salário do MÊS CHEIO (referência)
      diasTrabalhados: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 }, // dias trabalhados (30 = mês cheio)
      // Listas [{ nome, valor }] — flexíveis (INSS, IRPF, plano de saúde, VR, VA...).
      descontos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      outrosRendimentos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      recorrente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }, // herda meses seguintes
    },
    { tableName: "holerites", indexes: [{ fields: ["userId", "mesRef"] }] }
  );

  Holerite.associate = (db) => {
    Holerite.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  return Holerite;
};
