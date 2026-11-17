// Mascaramento de dados pessoais antes de mandar o texto da fatura para a IA.
// A IA só precisa de estabelecimento, data, valor, parcelas e o final do cartão.
// Removemos CPF, número completo do cartão, endereço, CEP, e-mail, telefone,
// agência/conta e códigos de boleto. Os nomes dos titulares viram pseudônimos
// (PESSOA_1, PESSOA_2...) e são restaurados na resposta — o nome real nunca sai
// do servidor.

const VALOR_RE = /\d,\d{2}\b/; // linha com valor monetário = provável lançamento

// Cabeçalho de portador: "FULANO DE TAL (final 1796)" / "(cartão 1796)".
const HEADER_RE = /^(.*?)\(\s*(?:final|cart[aã]o)\s*\d{3,4}\s*\)/i;
const ROTULO_NOME_RE = /^\s*(?:nome(?:\s+do\s+(?:titular|cliente))?|titular|cliente)\s*:\s*(.+)$/i;
const NAO_E_NOME_RE = /lan[çc]amento|total|cart[aã]o|produtos|servi[çc]os|compras|fatura|pagamento/i;

const ENDERECO_RE = /^\s*(?:rua|r\.|av\.?|avenida|alameda|al\.|travessa|tv\.|estrada|est\.|rodovia|rod\.|pra[çc]a|largo|bairro\s*:|endere[çc]o\s*:)\s/i;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const limparNome = (s) => String(s || "")
  .replace(/\d{4}\.\w+\.\w+\.\d{4}/g, "") // "5502.XXXX.XXXX.1796" grudado no nome
  .replace(/\s+/g, " ")
  .trim();
const pareceNome = (s) => /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.' ]{2,59}$/.test(s) && !NAO_E_NOME_RE.test(s);

// Variações de um nome cadastrado: completo e "primeiro + último".
// Nomes de uma palavra só são ignorados (casariam com nomes de lojas).
function variacoesNomeCadastrado(nome) {
  const partes = limparNome(nome).split(" ").filter(Boolean);
  if (partes.length < 2) return [];
  const out = new Set([partes.join(" ")]);
  out.add(`${partes[0]} ${partes[partes.length - 1]}`);
  return [...out];
}

function detectarNomesNoTexto(linhas) {
  const nomes = new Set();
  for (const l of linhas) {
    const h = l.match(HEADER_RE);
    const r = h ? null : l.match(ROTULO_NOME_RE);
    const bruto = h ? h[1] : r ? r[1] : null;
    if (!bruto) continue;
    const nome = limparNome(bruto);
    if (pareceNome(nome)) nomes.add(nome);
  }
  return [...nomes];
}

function mascararPII(texto) {
  let t = String(texto || "");
  // Códigos longos (linha digitável / código de barras): >= 20 dígitos.
  t = t.replace(/\d[\d. ]{18,}\d/g, (m) => (m.replace(/\D/g, "").length >= 20 ? "[CODIGO]" : m));
  // Número de cartão: mantém só os 4 últimos dígitos.
  t = t.replace(/\b\d{4}[ .-]?(?:[\dXx*•]{4}[ .-]?){2}(\d{4})\b/g, "**** **** **** $1");
  t = t.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF]");
  t = t.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[EMAIL]");
  t = t.replace(/\b\d{5}-\d{3}\b/g, "[CEP]");
  t = t.replace(/(?:\(?\b\d{2}\)?\s?)?\b9?\d{4}-\d{4}\b/g, "[TELEFONE]");
  t = t.replace(/\b(ag[eê]ncia|ag\.?)\s*:?\s*[\d-]{3,}/gi, "$1 [OCULTO]");
  t = t.replace(/\b(conta(?:\s+corrente)?|c\/c)\s*:?\s*[\d.-]{4,}/gi, "$1 [OCULTO]");
  // Linhas de endereço (sem valor monetário, para não apagar lançamentos).
  t = t
    .split(/\r?\n/)
    .map((l) => ((ENDERECO_RE.test(l) || /\[CEP\]/.test(l)) && !VALOR_RE.test(l) ? "[ENDERECO]" : l))
    .join("\n");
  return t;
}

// Retorna { texto, restaurar } — restaurar(str) troca os pseudônimos de volta.
function mascararFatura(texto, { nomesConhecidos = [] } = {}) {
  const linhas = String(texto || "").split(/\r?\n/);
  const nomes = new Set(detectarNomesNoTexto(linhas));
  nomesConhecidos.forEach((n) => variacoesNomeCadastrado(n).forEach((v) => nomes.add(v)));

  // Mais longos primeiro, para "THIAGO A G DE MEDEIROS" vencer "THIAGO MEDEIROS".
  const ordenados = [...nomes].sort((a, b) => b.length - a.length);
  const mapa = new Map(); // pseudônimo -> nome original (como aparece na fatura)
  let mascarado = mascararPII(texto);
  ordenados.forEach((nome) => {
    const re = new RegExp(`(?<![A-Za-zÀ-ÿ])${nome.split(" ").map(escapeRe).join("\\s+")}(?![A-Za-zÀ-ÿ])`, "gi");
    let pseudo = null;
    mascarado = mascarado.replace(re, (achado) => {
      if (!pseudo) { pseudo = `PESSOA_${mapa.size + 1}`; mapa.set(pseudo, achado.replace(/\s+/g, " ").trim()); }
      return pseudo;
    });
  });

  const restaurar = (s) =>
    typeof s === "string" ? s.replace(/PESSOA[_ ]?(\d+)/gi, (m, n) => mapa.get(`PESSOA_${n}`) || m) : s;
  return { texto: mascarado, restaurar, pseudonimos: mapa.size };
}

module.exports = { mascararFatura, mascararPII };
