// Montagem das linhas de uma página a partir dos fragmentos do pdf.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { textoDaPagina } from "../src/lib/pdfTexto.js";

// Fragmento no formato do pdf.js: transform[4] = x, transform[5] = y, width em pt.
const frag = (str, x, y, width) => ({ str, transform: [1, 0, 0, 1, x, y], width });

test("cola a letra acentuada encostada na palavra (fonte diferente no PDF)", () => {
  const itens = [frag("VE", 100, 500, 12), frag("Í", 112, 500, 3), frag("CULOS .CAMPO GRANDE", 115, 500, 80)];
  assert.equal(textoDaPagina(itens, 595), "VEÍCULOS .CAMPO GRANDE\n");
});

test("mantém o espaço quando há distância entre os fragmentos", () => {
  const itens = [frag("18/09", 60, 400, 20), frag("COMPER", 90, 400, 30), frag("245", 123, 400, 12), frag("139,66", 300, 400, 25)];
  assert.equal(textoDaPagina(itens, 595), "18/09 COMPER 245 139,66\n");
});

test("não cola quando o fragmento já termina com espaço", () => {
  const itens = [frag("COMPER ", 90, 400, 33), frag("245", 123, 400, 12)];
  assert.equal(textoDaPagina(itens, 595), "COMPER 245\n");
});

test("linhas em ordem de cima para baixo", () => {
  const itens = [frag("segunda", 60, 380, 30), frag("primeira", 60, 400, 30)];
  assert.equal(textoDaPagina(itens, 595), "primeira\nsegunda\n");
});

test("duas colunas: emite a coluna esquerda inteira e depois a direita", () => {
  const itens = [
    frag("01/10", 60, 400, 20), frag("LOJA A", 85, 400, 30), frag("10,00", 300, 400, 20),
    frag("05/10", 360, 400, 20), frag("LOJA C", 385, 400, 30), frag("30,00", 540, 400, 20),
    frag("02/10", 60, 380, 20), frag("LOJA B", 85, 380, 30), frag("20,00", 300, 380, 20),
    frag("06/10", 360, 380, 20), frag("LOJA D", 385, 380, 30), frag("40,00", 540, 380, 20),
    frag("07/10", 360, 360, 20), frag("LOJA E", 385, 360, 30), frag("50,00", 540, 360, 20),
  ];
  assert.equal(textoDaPagina(itens, 595), "01/10 LOJA A 10,00\n02/10 LOJA B 20,00\n05/10 LOJA C 30,00\n06/10 LOJA D 40,00\n07/10 LOJA E 50,00\n");
});

test("duas colunas com só 1 compra na direita (última página): usa o cabeçalho da coluna", () => {
  const itens = [
    frag("Lançamentos: compras e saques", 60, 420, 150), frag("Lançamentos: compras e saques", 360, 420, 150),
    frag("01/10", 60, 400, 20), frag("LOJA A", 85, 400, 30), frag("10,00", 300, 400, 20),
    frag("06/10", 360, 400, 20), frag("LOJA C", 385, 400, 30), frag("30,00", 540, 400, 20),
    frag("02/10", 60, 380, 20), frag("LOJA B", 85, 380, 30), frag("20,00", 300, 380, 20),
  ];
  assert.equal(textoDaPagina(itens, 595),
    "Lançamentos: compras e saques\n01/10 LOJA A 10,00\n02/10 LOJA B 20,00\nLançamentos: compras e saques\n06/10 LOJA C 30,00\n");
});

test("uma coluna com parcela solta no meio da linha não vira duas colunas", () => {
  const itens = [
    frag("01/10", 60, 400, 20), frag("LOJA A", 85, 400, 30), frag("10/12", 320, 400, 20), frag("10,00", 540, 400, 20),
    frag("02/10", 60, 380, 20), frag("LOJA B", 85, 380, 30), frag("20,00", 540, 380, 20),
  ];
  assert.equal(textoDaPagina(itens, 595), "01/10 LOJA A 10/12 10,00\n02/10 LOJA B 20,00\n");
});

test("página sem texto devolve vazio", () => {
  assert.equal(textoDaPagina([frag("  ", 10, 10, 5)], 595), "");
});
