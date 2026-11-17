const test = require("node:test");
const assert = require("node:assert");
const { mascararFatura } = require("../src/services/piiMask");

const FATURA = `ITAU UNIBANCO
Nome: MARIA SILVA SANTOS
CPF 123.456.789-09
RUA DAS FLORES 123 APTO 45
JARDIM PAULISTA SAO PAULO SP 01234-567
maria.santos@email.com  (11) 98765-4321
Agência 1234 Conta 56789-0
Total desta fatura 2.345,67
5502.XXXX.XXXX.1796 MARIA SILVA SANTOS (final 1796)
12/03 IFOOD *RESTAURANTE 45,90
15/03 AV PAULISTA LANCHES 32,00
02/02 MAGAZINE LUIZA 03/10 199,90
JOAO P OLIVEIRA (final 2168)
20/03 POSTO SHELL 150,00
23793.38128 60000.000003 00000.000400 1 84340000012345`;

test("remove CPF, endereço, contato, conta e código de barras", () => {
  const { texto } = mascararFatura(FATURA);
  for (const vazado of ["123.456.789-09", "RUA DAS FLORES", "01234-567", "maria.santos@email.com", "98765-4321", "56789-0", "23793.38128", "JARDIM PAULISTA"]) {
    assert.ok(!texto.includes(vazado), `vazou: ${vazado}\n${texto}`);
  }
});

test("mantém lançamentos, valores, parcelas e final do cartão", () => {
  const { texto } = mascararFatura(FATURA);
  for (const ok of ["12/03 IFOOD *RESTAURANTE 45,90", "15/03 AV PAULISTA LANCHES 32,00", "03/10 199,90", "(final 1796)", "(final 2168)", "2.345,67", "150,00"]) {
    assert.ok(texto.includes(ok), `sumiu: ${ok}\n${texto}`);
  }
});

test("pseudonimiza titulares e restaura na resposta", () => {
  const { texto, restaurar } = mascararFatura(FATURA);
  assert.ok(!/MARIA|SANTOS|OLIVEIRA/.test(texto), texto);
  assert.match(texto, /PESSOA_\d \(final 1796\)/);
  const nomes = ["PESSOA_1", "PESSOA_2"].map(restaurar).sort();
  assert.deepStrictEqual(nomes, ["JOAO P OLIVEIRA", "MARIA SILVA SANTOS"]);
  assert.strictEqual(restaurar("Titular"), "Titular");
});

test("usa nomes cadastrados (primeiro + último) e ignora nome de uma palavra", () => {
  const { texto } = mascararFatura("Cliente MARIA SANTOS\n10/03 LOJA ANA 20,00", { nomesConhecidos: ["Maria Silva Santos", "Ana"] });
  assert.ok(!texto.includes("MARIA SANTOS"), texto);
  assert.ok(texto.includes("LOJA ANA 20,00"), texto);
});
