// Credencial de passkey (WebAuthn) de um usuário. Ver migration para os campos.
module.exports = (sequelize, DataTypes) => {
  const WebauthnCredential = sequelize.define(
    "WebauthnCredential",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      credentialId: { type: DataTypes.TEXT, allowNull: false, unique: true },
      publicKey: { type: DataTypes.TEXT, allowNull: false },
      counter: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      transports: { type: DataTypes.STRING, allowNull: true },
      deviceType: { type: DataTypes.STRING, allowNull: true },
      backedUp: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      nome: { type: DataTypes.STRING, allowNull: true },
      lastUsedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: "webauthn_credentials" }
  );

  WebauthnCredential.associate = (db) => {
    WebauthnCredential.belongsTo(db.User, { foreignKey: "userId", as: "user" });
  };

  // Resumo seguro p/ o front (nunca expõe a chave pública crua nem o counter).
  WebauthnCredential.prototype.toClientJSON = function toClientJSON() {
    const { id, nome, deviceType, backedUp, lastUsedAt, createdAt } = this;
    return { id, nome: nome || "Passkey", deviceType, backedUp, lastUsedAt, createdAt };
  };

  return WebauthnCredential;
};
