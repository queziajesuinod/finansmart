"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("plans", {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      nome: { type: Sequelize.STRING, allowNull: false },
      slug: { type: Sequelize.STRING, allowNull: false, unique: true },
      descricao: { type: Sequelize.STRING, allowNull: true },
      precoCentavos: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      intervalo: { type: Sequelize.ENUM("month", "year"), allowNull: false, defaultValue: "month" },
      stripePriceId: { type: Sequelize.STRING, allowNull: true },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("plans");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_plans_intervalo";');
  },
};
