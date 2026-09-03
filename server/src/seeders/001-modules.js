"use strict";

const { randomUUID } = require("crypto");

const MODULES = [
  { chave: "dashboard", nome: "Visão Geral", ordem: 1 },
  { chave: "lancamentos", nome: "Lançamentos", ordem: 2 },
  { chave: "extrato", nome: "Extrato", ordem: 3 },
  // "importar" foi absorvido pelo módulo "cartoes" (botão dentro do Cartão de Crédito).
  { chave: "cartoes", nome: "Cartões de Crédito", ordem: 5 },
  { chave: "emprestimos", nome: "Empréstimos", ordem: 6 },
  // "parcelados" foi absorvido pelo módulo "cartoes" (aba dentro do Cartão de Crédito).
  { chave: "metas", nome: "Metas", ordem: 8 },
  { chave: "historico", nome: "Histórico", ordem: 9 },
  { chave: "assistente", nome: "Assistente IA", ordem: 10 },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      "modules",
      MODULES.map((m) => ({ id: randomUUID(), ...m, descricao: null, createdAt: now, updatedAt: now })),
      { ignoreDuplicates: true }
    );
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("modules", null, {});
  },
};
