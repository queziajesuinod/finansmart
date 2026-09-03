"use strict";

// Log de importações de fatura (métricas parse-vs-confirmado + correções de
// categoria) para a análise do admin. As conexões já setam search_path (config).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("import_logs", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      banco: { type: Sequelize.STRING, allowNull: true },
      mesRef: { type: Sequelize.STRING, allowNull: true },
      fonte: { type: Sequelize.STRING(8), allowNull: false, defaultValue: "local" },
      itensParsed: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      itensConfirmados: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      itensRemovidos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      parcelas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      categoriasCorrigidas: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      totalDetectado: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      totalUsado: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      limiteDetectado: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      teveEstorno: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      correcoes: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("import_logs", ["userId"]);
    await queryInterface.addIndex("import_logs", ["banco"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("import_logs");
  },
};
