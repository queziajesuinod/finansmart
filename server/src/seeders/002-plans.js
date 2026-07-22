"use strict";

const { randomUUID } = require("crypto");

const PLANS = [
  { slug: "basico", nome: "Básico", descricao: "Controle essencial: renda, lançamentos, extrato, metas e histórico.", precoCentavos: 1990, intervalo: "month" },
  { slug: "completo", nome: "Completo", descricao: "Todos os módulos, incluindo cartões, empréstimos, parcelados, importação de PDF e assistente IA.", precoCentavos: 3990, intervalo: "month" },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      "plans",
      PLANS.map((p) => ({ id: randomUUID(), ...p, stripePriceId: null, ativo: true, createdAt: now, updatedAt: now })),
      { ignoreDuplicates: true }
    );
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("plans", null, {});
  },
};
