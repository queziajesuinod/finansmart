// Revisão de uma coleção do usuário (controle de concorrência dos PUTs replace-all).
module.exports = (sequelize, DataTypes) => {
  const DataRev = sequelize.define(
    "DataRev",
    {
      userId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      colecao: { type: DataTypes.STRING(40), allowNull: false, primaryKey: true },
      rev: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: "data_revs" }
  );

  DataRev.associate = (db) => {
    DataRev.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  return DataRev;
};
