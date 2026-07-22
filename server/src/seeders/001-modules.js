"use strict";

const { randomUUID } = require("crypto");

const MODULES = [
  { chave: "dashboard", nome: "Visão Geral", ordem: 1 },
  { chave: "lancamentos", nome: "Lançamentos", ordem: 2 },
  { chave: "extrato", nome: "Extrato", ordem: 3 },
  { chave: "importar", nome: "Importar PDF", ordem: 4 },
  { chave: "cartoes", nome: "Cartões de Crédito", ordem: 5 },
  { chave: "emprestimos", nome: "Empréstimos", ordem: 6 },
  { chave: "parcelados", nome: "Parcelados", ordem: 7 },
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
