"use strict";

const { randomUUID } = require("crypto");

// Quais módulos cada plano libera (por chave).
const PLAN_MODULES = {
  basico: ["dashboard", "lancamentos", "extrato", "metas", "historico"],
  completo: ["dashboard", "lancamentos", "extrato", "importar", "cartoes", "emprestimos", "parcelados", "metas", "historico", "assistente"],
};

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const [plans] = await queryInterface.sequelize.query('SELECT id, slug FROM plans;');
    const [modules] = await queryInterface.sequelize.query('SELECT id, chave FROM modules;');
    const modByChave = Object.fromEntries(modules.map((m) => [m.chave, m.id]));

    const rows = [];
    for (const plan of plans) {
      const chaves = PLAN_MODULES[plan.slug] || [];
      for (const chave of chaves) {
        const moduleId = modByChave[chave];
        if (moduleId) rows.push({ id: randomUUID(), planId: plan.id, moduleId, createdAt: now, updatedAt: now });
      }
    }
    if (rows.length) await queryInterface.bulkInsert("plan_modules", rows, { ignoreDuplicates: true });
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("plan_modules", null, {});
  },
};
