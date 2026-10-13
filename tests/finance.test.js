// Testes dos cálculos financeiros (node --test). Rodar: npm test
import test from "node:test";
import assert from "node:assert/strict";
import {
  calcPMT, calcSaldoDevedor, buildSchedule, amortize, emprestimoEstado,
  parcelaEmprestimoNoMes, diaVencimentoEmprestimo, primeiraParcelaCartao, calcDataQuitacao,
} from "../src/lib/finance.js";
import { addMonths, monthDiff, entradasDoMes, holeritesVigentes, rendasExtrasDoMes } from "../src/lib/constants.js";

const perto = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

// Contrato de referência: R$ 496.000, 8,3714% a.a. (0,6722% a.m.), 360 parcelas, Price.
const CAIXA = { sistema: "PRICE", valorContratado: 496000, taxa: 0.6722, parcelas: 360, dataPrimeira: "2022-08-20", amortizacoes: [] };

test("Price: prestação e saldo devedor", () => {
  perto(calcPMT(496000, 0.6722, 360), 3662.46);
  perto(calcSaldoDevedor(496000, 0.6722, 360, 49), 477019.65, 0.05);
  perto(calcPMT(1200, 0, 12), 100);
});

test("tabela de amortização fecha no zero (Price e SAC)", () => {
  for (const sistema of ["PRICE", "SAC"]) {
    const rows = buildSchedule(sistema, 100000, 1, 48);
    assert.equal(rows.length, 48);
    perto(rows[47].saldo, 0);
    perto(rows.reduce((s, r) => s + r.amort, 0), 100000);
  }
});

test("aporte que reduz prazo mantém a prestação e encurta o contrato", () => {
  const est = emprestimoEstado({ ...CAIXA, amortizacoes: [{ parcela: 49, valor: 10000, tipo: "prazo" }] }, 49);
  perto(est.proxima, 3662.46);
  assert.ok(est.nFinal < 360);
  perto(est.rows.at(-1).saldo, 0);
});

test("aporte que reduz parcela mantém o prazo e baixa a prestação", () => {
  const est = emprestimoEstado({ ...CAIXA, amortizacoes: [{ parcela: 49, valor: 10000, tipo: "parcela" }] }, 49);
  assert.equal(est.nFinal, 360);
  assert.ok(est.proxima < 3662.46);
});

test("valores informados pelo banco substituem o cálculo do aporte", () => {
  const emp = { ...CAIXA, amortizacoes: [{ parcela: 49, valor: 10000, tipo: "prazo", novoSaldo: 465000, novaParcela: 3600, novoPrazo: 300 }] };
  const est = emprestimoEstado(emp, 49);
  perto(est.saldo, 465000);
  perto(est.proxima, 3600);
  assert.equal(est.nFinal, 349); // 49 pagas + 300 restantes
  perto(est.rows.at(-1).saldo, 0);
});

test("valores do banco no SAC: saldo e prazo (parcela não se aplica)", () => {
  const rows = amortize("SAC", 496000, 0.6722, 360, [{ parcela: 49, valor: 10000, novoSaldo: 400000, novoPrazo: 200 }]);
  perto(rows[48].saldo, 400000);
  assert.equal(rows.length, 249);
  perto(rows.at(-1).saldo, 0);
});

test("sem aportes o motor de amortização bate com a tabela simples", () => {
  const a = amortize("PRICE", 50000, 1.5, 24, []);
  const b = buildSchedule("PRICE", 50000, 1.5, 24);
  assert.equal(a.length, b.length);
  perto(a[10].saldo, b[10].saldo);
});

test("parcela do empréstimo no mês: número, valor e data de vencimento", () => {
  const set = parcelaEmprestimoNoMes(CAIXA, 2026, 8); // setembro/2026
  assert.equal(set.k, 50);
  assert.equal(set.data, "2026-09-20");
  perto(set.valor, 3662.46);
  assert.equal(parcelaEmprestimoNoMes(CAIXA, 2022, 6), null); // antes da 1ª parcela
  assert.equal(parcelaEmprestimoNoMes({ ...CAIXA, diaVencimento: 31 }, 2026, 1).data, "2026-02-28"); // prende no fim do mês
  assert.equal(diaVencimentoEmprestimo(CAIXA), 20);
  assert.equal(diaVencimentoEmprestimo({ ...CAIXA, diaVencimento: 5 }), 5);
});

test("cartão: mês da 1ª parcela pelo dia de fechamento", () => {
  // Fecha dia 25, vence dia 5 (vencimento no mês seguinte ao fechamento).
  assert.equal(primeiraParcelaCartao("2026-02-19", 25, 5), "2026-03-19"); // antes de virar
  assert.equal(primeiraParcelaCartao("2026-04-29", 25, 5), "2026-06-28"); // depois de virar
  assert.equal(primeiraParcelaCartao("2026-04-25", 25, 5), "2026-05-25"); // no dia do fechamento ainda entra
  assert.equal(primeiraParcelaCartao("2026-12-30", 25, 5), "2027-02-28"); // vira o ano
  // Fecha dia 3, vence dia 10 (vencimento no mesmo mês do fechamento).
  assert.equal(primeiraParcelaCartao("2026-04-02", 3, 10), "2026-04-02");
  assert.equal(primeiraParcelaCartao("2026-04-04", 3, 10), "2026-05-04");
  // Sem fechamento não há o que calcular.
  assert.equal(primeiraParcelaCartao("2026-04-04", null, 10), "");
});

test("datas: addMonths sem overflow de dia, monthDiff e quitação", () => {
  const d = addMonths("2026-01-31", 1);
  assert.equal(d.getMonth(), 1);
  assert.equal(d.getDate(), 28);
  assert.equal(monthDiff("2026-01-31", "2026-03-01"), 2);
  assert.equal(calcDataQuitacao("2022-08-20", 360), "2052-07-20");
});

test("receitas: vigência e data das entradas do mês", () => {
  const holerites = [
    { id: "a", membroId: null, mesRef: "2026-08", titulo: "Emprego", salarioBruto: 5000, descontos: [{ nome: "INSS", valor: 500 }], outrosRendimentos: [], recorrente: true, diaRecebimento: 5 },
    { id: "b", membroId: null, mesRef: "2026-10", titulo: "Emprego", salarioBruto: 6000, descontos: [], outrosRendimentos: [], recorrente: true, diaRecebimento: 31 },
  ];
  const extras = [
    { id: "x", mesRef: "2026-09", descricao: "Freela", valor: 300, recorrente: false, data: "2026-09-18" },
    { id: "y", mesRef: "2026-08", descricao: "Aluguel", valor: 1000, recorrente: true, data: null },
  ];
  assert.equal(holeritesVigentes(holerites, 2026, 8).length, 1); // setembro: só o de agosto
  assert.equal(rendasExtrasDoMes(extras, 2026, 8).length, 2);
  const set = entradasDoMes(holerites, extras, 2026, 8);
  assert.deepEqual(set.map((e) => [e.descricao, e.data, e.valor]), [
    ["Emprego", "2026-09-05", 4500],
    ["Freela", "2026-09-18", 300],
    ["Aluguel", null, 1000], // sem data fica por último
  ]);
  // Outubro: o holerite novo substitui o antigo; dia 31 existe em outubro.
  const out = entradasDoMes(holerites, extras, 2026, 9);
  assert.deepEqual(out.map((e) => [e.descricao, e.data]), [["Emprego", "2026-10-31"], ["Aluguel", null]]);
});
