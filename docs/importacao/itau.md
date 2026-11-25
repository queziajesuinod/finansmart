# Importação de fatura — Itaú

Mapa de como o PDF da fatura de cartão do Itaú é montado e de como o app extrai
os dados dele. Referência real: fatura com vencimento em 25/10/2026, 6 páginas,
10 cartões (titular, adicionais e virtuais), 132 lançamentos, total R$ 22.155,26.

Código: [`src/lib/pdfTexto.js`](../../src/lib/pdfTexto.js) (PDF → texto) e
`parseItau` em [`src/lib/parseFatura.js`](../../src/lib/parseFatura.js) (texto → compras).
Testes: [`tests/parseItau.test.js`](../../tests/parseItau.test.js) e
[`tests/pdfTexto.test.js`](../../tests/pdfTexto.test.js).

## 1. Como o PDF é gerado

| Página | Conteúdo | O que o app usa |
|---|---|---|
| 1 | Resumo, boleto, pagamento mínimo, parcelas fixas | vencimento, total, limite, pagamento anterior |
| 2–4 | **Lançamentos**, em **2 colunas** | as compras |
| 4 (fim) | "Compras parceladas - próximas faturas" | nada (são parcelas futuras) |
| 5 | Limites, encargos, simulações | nada |
| 6 | Oferta de parcelamento da fatura | nada |

Cada lançamento ocupa **duas linhas** na coluna:

```
29/04  AUTOBEL VEICULOS L06/08        902,87     ← data, estabelecimento + parcela, valor
       VEÍCULOS .CAMPO GRANDE                    ← categoria impressa pelo Itaú + ". cidade"
```

Os lançamentos são agrupados por cartão:

```
FULANO DE TAL (final 1796)                       ← cabeçalho do cartão (portador + 4 finais)
DATA ESTABELECIMENTO VALOR EM R$                 ← cabeçalho da tabela (ruído)
...lançamentos...
Lançamentos no cartão (final 1796) 10.869,70     ← subtotal do cartão
```

Depois de todos os cartões vem a seção da conta e os totais:

```
Lançamentos: produtos e serviços
19/09 ANUIDADE DIFERENCI05/12 94,50
Titular 1796                                     ← no lugar da categoria
18/10 ESTORNO DE ANUIDADE DIF - 94,50
18/10 ENVIO MENS.AUTOMATICA 7,99
Lançamentos produtos e serviços 7,99
Total dos lançamentos atuais 22.155,26           ← tem que bater com a soma de tudo
Compras parceladas - próximas faturas            ← daqui em diante, PARAR
```

## 2. O que o pdf.js devolve (e por que quebrava)

1. **Duas colunas na mesma altura.** O Itaú imprime os lançamentos como um
   jornal: desce a coluna esquerda e continua no topo da direita (o mesmo cartão
   pode atravessar as duas colunas e as páginas). O pdf.js não sabe disso: ele
   devolve o texto por **altura**, então uma linha visual traz uma compra da
   esquerda e outra da direita (`01/10 LOJA A 10,00 06/10 LOJA C 30,00`), e as
   linhas de categoria das duas ficam grudadas. Lido assim, o parser vê uma
   compra só — com a descrição "LOJA A 10,00 06/10 LOJA C" — e a outra some.

   Por isso a extração reconstrói a ordem de leitura: corta a página no início
   da coluna direita e emite a **coluna esquerda inteira e depois a direita**.
   Assim cada compra fica seguida da sua linha de categoria e o cabeçalho
   `NOME (final X)` continua valendo para as compras que seguem na outra coluna.

   A página é tratada como 2 colunas quando a metade direita tem **3+ datas
   `dd/mm`** OU o **cabeçalho da coluna** (`Lançamentos: compras e saques`,
   `DATA ESTABELECIMENTO`), que o Itaú repete no topo de cada coluna. O cabeçalho
   cobre a última página, em que a coluna direita pode ter só 1–2 compras.
   O corte fica 10 pt à esquerda da data/cabeçalho mais à esquerda da metade
   direita. Uma data solta no meio da linha (ex.: parcela `10/12`) sem
   cabeçalho não basta, para não partir faturas de uma coluna só.
2. **Letras acentuadas em outra fonte.** O Itaú desenha `Í`, `Ç`, `Ã`… com uma
   fonte separada; o pdf.js devolve `VE` + `Í` + `CULOS` como fragmentos
   **encostados**. A extração antiga juntava todos os fragmentos com espaço e
   gerava `VE Í CULOS`, `Lan ç amentos`, `cart ã o`. Efeitos:
   - a seção "produtos e serviços" não era reconhecida → a anuidade virava um
     **parcelamento de 12×** e caía no último cartão;
   - o subtotal `Lan ç amentos no cart ã o (final X)` virava um portador falso;
   - as categorias com acento (ALIMENTAÇÃO, VEÍCULOS, SAÚDE, VESTUÁRIO,
     EDUCAÇÃO) eram ignoradas e o app chutava pela descrição.

   **Correção:** `textoDaPagina` só põe espaço entre fragmentos com distância
   real (≥ 0,6 pt). E `parseItau` aplica `colarAcentosQuebrados` antes de ler,
   para textos colados à mão que vieram da extração antiga.

## 3. Regras de extração (`parseItau`)

Lê linha a linha, de cima para baixo:

| Linha | Regra |
|---|---|
| `Compras parceladas - próximas faturas`, `Limites de crédito`, `Simulação…`, `Encargos cobrados`, `Total para próximas`, `Demais faturas` | **para** de ler (o resto é projeção) |
| começa com `Lançamentos` (sem espaços) | cabeçalho ou subtotal: pula. Se for "produtos e serviços", troca o portador para `Produtos e Serviços` (final `svc`) e desliga parcelas |
| `NOME (final 1234)` | novo cartão: portador = NOME, final = 1234 |
| `DATA…`, `VALOR EM R$`, `Total…`, `Continua…`, prosa do banco | ruído: pula |
| `dd/mm/aaaa …` | datas do resumo/boleto: pula |
| `dd/mm DESCRIÇÃO [-] 1.234,56` | **lançamento** |

Para cada lançamento:

- **Valor:** `-` antes do número = estorno/crédito (negativo). Valor zero é ignorado.
- **Categoria:** vem da **linha de baixo** (`ALIMENTAÇÃO .CIDADE`). Mapa:
  ALIMENTAÇÃO→alimentação, VEÍCULOS→transporte, SAÚDE→saúde,
  VESTUÁRIO→vestuário, EDUCAÇÃO→educação, TURISMO/HOBBY/LAZER→lazer,
  MORADIA→moradia, DIVERSOS/SERVIÇOS→outros. Sem linha de categoria → `autoCategoria`.
- **Parcela:** vem **colada** ao nome (`SHOES03/05`, `CE174 04/06`) ou com
  marcador de letra separado por espaço (` L06/08`, ` C04/05`). Na seção de
  produtos e serviços nunca vira parcela.
- **Descrição:** tira a parcela do fim. A letra antes da parcela só é marcador
  quando vem separada por espaço — colada, é a última letra do nome
  (`TOBELLIANITA SHOES03/05` → `TOBELLIANITA SHOES`).
- **Data/ano:** o Itaú imprime só `dd/mm`, às vezes com a data **original** da
  compra parcelada (ex.: `29/04` numa fatura de outubro). O ano vem do
  **vencimento** (`Vencimento: 25/10/2026`); mês da compra maior que o mês do
  vencimento = ano anterior. O plano do parcelamento é recalculado depois pelo
  mês da fatura e pelo nº da parcela, não por essa data.
- **Pagamento anterior:** `Pagamento efetuado em 21/09/2026 - 20.277,46`
  (página 1) vira um pagamento (quitação), não um gasto.

## 4. Como conferir uma fatura nova

A fatura se autoverifica — use estes números para validar o parser:

1. Soma dos lançamentos de cada cartão = `Lançamentos no cartão (final X)`.
2. Soma de produtos e serviços = `Lançamentos produtos e serviços`.
3. Soma de tudo = `Total dos lançamentos atuais` = `Total desta fatura`.
4. Nenhum item de "Compras parceladas - próximas faturas" (ex.: `AUTOBEL L07/08`
   não pode aparecer se a fatura trouxe `L06/08`).

Se algum número não bater, gere uma fixture nova (seção 5) e escreva o teste
antes de mexer no parser.

## 5. Fixture de teste

`tests/fixtures/itau-2026-10-acentos-quebrados.txt` é o texto real extraído
(com os acentos quebrados, o pior caso), **anonimizado**: nomes de portadores e
de pessoas físicas trocados (`FULANO DE TAL`, `PessoaB`…), sem CPF, endereço,
boleto ou páginas 1, 5 e 6. Os testes rodam o parser nela e na versão com os
acentos colados.

Para gerar uma fixture de outra fatura: extraia o texto com o mesmo pdf.js do
app (3.11.174) usando `textoDaPagina`, corte do início dos lançamentos até
`Total para próximas faturas`, troque todo nome de pessoa e nunca versione CPF,
endereço, número de cartão completo ou código de barras.

## 6. Armadilhas conhecidas

- **Mês da fatura:** a fatura entra no mês do **vencimento** (aqui, outubro). Vendo
  outro mês na aba Cartões, ela não aparece — o app avisa ao salvar.
- **Parcelados:** além de ficarem na fatura, as compras parceladas viram planos na
  aba Parcelados (com os meses anteriores incluídos).
- **IA:** a leitura com IA só entra como reforço quando a soma não bate com o total.
  Com o parser certo ela nem é chamada nesta fatura.
- **Nomes truncados:** o Itaú corta o estabelecimento em ~22 caracteres
  (`BRITISH AIRW50104308/10` → `BRITISH AIRW501043`, parcela 8/10).
- **Outros bancos:** a correção da extração (`textoDaPagina`) vale para todos os
  PDFs. Só cola fragmentos que estão encostados e sem espaço no próprio texto, mas
  ainda não foi testada com PDFs reais de Nubank, Bradesco e CAIXA.
