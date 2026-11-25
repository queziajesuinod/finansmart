// Regressão da fatura Itaú (layout 2 colunas, vários cartões, categoria na
// linha de baixo). A fixture é o texto REAL que o pdf.js extrai (anonimizado),
// com os acentos quebrados por espaço ("VE Í CULOS", "Lan ç amentos").
// Ver docs/importacao/itau.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseFatura, pareceItau, colarAcentosQuebrados } from "../src/lib/parseFatura.js";

const QUEBRADO = fs.readFileSync(new URL("./fixtures/itau-2026-10-acentos-quebrados.txt", import.meta.url), "utf8");
// O mesmo texto como sai depois da correção da extração (acentos colados).
const COLADO = colarAcentosQuebrados(QUEBRADO);

// Subtotais impressos ("Lançamentos no cartão (final XXXX)") e total da fatura.
const SUBTOTAIS = {
  "1796": 10869.70, "1628": 3858.14, "2168": 3136.27, "4850": 699.00, "9940": 50.00,
  "3801": 755.91, "0317": 735.25, "5310": 1625.75, "2922": 162.45, "1183": 254.80,
};
const PRODUTOS = 7.99;
const TOTAL = 22155.26;

const soma = (arr) => Math.round(arr.reduce((s, i) => s + i.valor, 0) * 100) / 100;

for (const [nome, texto] of [["acentos quebrados", QUEBRADO], ["acentos colados", COLADO]]) {
  test(`Itaú (${nome}): é reconhecido como Itaú`, () => {
    assert.equal(pareceItau(texto), true);
  });

  test(`Itaú (${nome}): soma bate com o total da fatura`, () => {
    assert.equal(soma(parseFatura(texto, 2026, 10)), TOTAL);
  });

  test(`Itaú (${nome}): cada cartão bate com o subtotal impresso`, () => {
    const r = parseFatura(texto, 2026, 10);
    for (const [final, esperado] of Object.entries(SUBTOTAIS)) {
      assert.equal(soma(r.filter((i) => i.final === final)), esperado, `cartão final ${final}`);
    }
  });

  test(`Itaú (${nome}): produtos e serviços ficam num grupo próprio e não viram parcelamento`, () => {
    const r = parseFatura(texto, 2026, 10);
    const prod = r.filter((i) => i.portador === "Produtos e Serviços");
    assert.equal(soma(prod), PRODUTOS);
    const anuidade = prod.find((i) => /^ANUIDADE/.test(i.descricao));
    assert.ok(anuidade, "anuidade encontrada");
    assert.equal(anuidade.parcelas, 1, "anuidade não pode virar plano de 12x");
    assert.ok(!r.some((i) => /lan.?[çc]?.?amentos/i.test(i.portador)), "linha de subtotal não vira portador");
  });

  test(`Itaú (${nome}): usa a categoria impressa pelo banco`, () => {
    const r = parseFatura(texto, 2026, 10);
    const cat = (desc) => r.find((i) => i.descricao.startsWith(desc))?.categoria;
    assert.equal(cat("AUTOBEL VEICULOS"), "transporte"); // VEÍCULOS
    assert.equal(cat("PessoaB"), "alimentacao"); // ALIMENTAÇÃO (o nome sozinho não indicaria isso)
    assert.equal(cat("DROGASIL 4260"), "saude"); // SAÚDE
    assert.equal(cat("LOJAS AMERICANAS"), "vestuario"); // VESTUÁRIO
    assert.equal(cat("BERCARIO BABY TIME"), "educacao"); // EDUCAÇÃO
  });

  test(`Itaú (${nome}): descrição sem a parcela colada e sem comer letras`, () => {
    const descs = parseFatura(texto, 2026, 10).map((i) => i.descricao);
    for (const d of ["TOBELLIANITA SHOES", "BERCARIO BABY TIME", "CAPPTA *L. A SERVI", "AUTOBEL VEICULOS", "141 - VIA VENETO", "CENTAURO CE174", "MERCADOLIVRE*PANAS"]) {
      assert.ok(descs.includes(d), `esperava "${d}"`);
    }
  });

  test(`Itaú (${nome}): parcelas e "próximas faturas" fora`, () => {
    const r = parseFatura(texto, 2026, 10);
    const autobel = r.filter((i) => i.descricao === "AUTOBEL VEICULOS");
    // A seção "Compras parceladas - próximas faturas" traz AUTOBEL 07/08: não pode entrar.
    assert.equal(autobel.length, 1);
    assert.deepEqual([autobel[0].parcelaAtual, autobel[0].parcelas], [6, 8]);
  });

  test(`Itaú (${nome}): registra o pagamento da fatura anterior (não é gasto)`, () => {
    const r = parseFatura(texto, 2026, 10);
    assert.deepEqual(r.pagamentos, [{ data: "2026-09-21", valor: 20277.46, descricao: "Pagamento" }]);
  });

  test(`Itaú (${nome}): ano vem do vencimento`, () => {
    const r = parseFatura(texto, 2026, 10);
    assert.ok(r.every((i) => /^2026-\d{2}-\d{2}$/.test(i.data)));
  });
}

test("colarAcentosQuebrados junta só acentos colados na palavra", () => {
  assert.equal(colarAcentosQuebrados("VE Í CULOS .CAMPO GRANDE"), "VEÍCULOS .CAMPO GRANDE");
  assert.equal(colarAcentosQuebrados("Lan ç amentos no cart ã o (final 1796)"), "Lançamentos no cartão (final 1796)");
  assert.equal(colarAcentosQuebrados("ALIMENTA ÇÃ O .CAMPO GRANDE"), "ALIMENTAÇÃO .CAMPO GRANDE");
  assert.equal(colarAcentosQuebrados("18/09 RESTAURANTE SESC SABOR 31,88"), "18/09 RESTAURANTE SESC SABOR 31,88");
});
