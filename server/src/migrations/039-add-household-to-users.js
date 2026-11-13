"use strict";

// Login familiar (household) — modelo "dados do dono": o espaço financeiro da
// família é a conta do titular. Um dependente com login tem householdOwnerId
// apontando para o titular; householdRole define o que pode fazer. membroId liga
// o login a um Membro (só para o default do seletor — NÃO é usado para escopo,
// pois todos no household veem tudo). householdOwnerId null = titular do próprio.
// Schema-aware (respeita DB_SCHEMA, ex. "dev") e sem FK no addColumn — o mesmo
// padrão de 017-add-membro-id (referência "solta" por UUID, sem constraint).
const schema = process.env.DB_SCHEMA || undefined;
const tbl = (name) => (schema ? { tableName: name, schema } : name);

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(tbl("users"), "householdOwnerId", { type: Sequelize.UUID, allowNull: true });
    await queryInterface.addColumn(tbl("users"), "householdRole", { type: Sequelize.STRING(20), allowNull: true });
    await queryInterface.addColumn(tbl("users"), "membroId", { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addIndex(tbl("users"), ["householdOwnerId"]);
  },
  async down(queryInterface) {
    await queryInterface.removeColumn(tbl("users"), "householdOwnerId");
    await queryInterface.removeColumn(tbl("users"), "householdRole");
    await queryInterface.removeColumn(tbl("users"), "membroId");
  },
};
