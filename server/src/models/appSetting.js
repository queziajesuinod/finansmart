// Configurações globais do sistema (chave → valor JSON). Editáveis pelo admin:
// planoPadrao (slug), iaImportAtiva (bool), avisoGlobal (string), etc.
module.exports = (sequelize, DataTypes) => {
  const AppSetting = sequelize.define(
    "AppSetting",
    {
      chave: { type: DataTypes.STRING, primaryKey: true },
      valor: { type: DataTypes.JSONB, allowNull: true },
    },
    { tableName: "app_settings" }
  );
  return AppSetting;
};
