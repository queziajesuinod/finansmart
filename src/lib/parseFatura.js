// @ts-nocheck
// Leitor de faturas/extratos. Suporta dois caminhos:
//  1) Parser ESTRUTURADO (CAIXA e similares) — agrupa por portador e reconcilia
//     com os subtotais oficiais. Usado quando o texto tem marcadores como
//     "Lançamentos no cartão", "(Cartão 1753)" ou valores com sufixo D/C.
//  2) Parser GENÉRICO (Nubank e a maioria dos bancos) — varre linha a linha
//     detectando data + valor em vários formatos.

// ─── categorização automática ────────────────────────────────
export function autoCategoria(desc) {
  const d = desc.toLowerCase();
  const map = [
    ["transporte", ["uber", "99", "taxi", "posto", "ipiranga", "shell", "petrobras", "combust", "gasolina", "estacion", "metro", "cptm", "passagem", "99app", "cabify", "onibus", "blablacar", "gol", "latam", "abastece", "autobel", "veiculo", "pit stop"]],
    ["alimentacao", ["ifood", "ifd", "mercado", "supermerc", "padaria", "restaurant", "lanche", "pizza", "burger", "mc donald", "mcdonald", "bk", "subway", "food", "acai", "hortifruti", "carrefour", "pao de acucar", "atacad", "assai", "comida", "cafe", "starbucks", "habib", "outback", "comper", "gauchao", "yassuda", "empadao", "picadinho", "grill", "sucos", "hlg comercio", "arabe", "confeitaria", "cacau show", "make burger", "padoca", "sn club", "vila jardim", "arena lma", "barzito", "carlitos", "estacao sul", "agua baiana", "kfc", "ana paula elias", "brumalu", "ariane", "j a sucos", "buffet", "make burgers"]],
    ["saude", ["farmac", "drogaria", "drogasil", "pacheco", "raia", "hospital", "clinic", "laborat", "medic", "odonto", "dentist", "psico", "exame", "unimed", "amil", "saude", "aacd", "mantenedores", "veterinari", "dose vet", "rdsaude", "imunita", "depillare", "escovaria"]],
    ["assinaturas", ["netflix", "spotify", "amazon prime", "prime video", "disney", "disney plus", "hbo", "max", "youtube", "apple.com", "apple .com", "google", "google one", "icloud", "playstation", "xbox", "gympass", "wellhub", "deezer", "paramount", "globoplay", "canva", "chatgpt", "openai", "anthropic", "claude", "melimais", "prime aluguel", "envio mens", "natura", "microsoft", "adobe", "ebw"]],
    ["educacao", ["escola", "faculdade", "curso", "udemy", "alura", "livraria", "livro", "papelaria", "universidade", "colegio", "ensino", "bercario", "baby time", "artvital", "planejar"]],
    ["vestuario", ["renner", "riachuelo", "cea", "c&a", "zara", "marisa", "hering", "nike", "adidas", "calcado", "sapato", "roupa", "moda", "loja", "carters", "milon", "bagaggio", "world tennis", "shopee", "useeb", "elitecalc", "biju", "ri happy", "cecikids"]],
    ["lazer", ["cinema", "cinemark", "ingresso", "show", "teatro", "game", "steam", "viagem", "hotel", "airbnb", "booking", "decolar", "parque", "clube", "netshoes", "arena", "british airw", "casasbahia", "bosque dos ipes", "leroy", "panini"]],
    ["moradia", ["aluguel", "condominio", "energia", "luz", "enel", "cemig", "copel", "agua", "sabesp", "gas", "internet", "vivo", "claro", "tim", "oi ", "net ", "telefon", "iptu", "yelumseg", "mosko gas"]],
  ];
  for (const [cat, kws] of map) { if (kws.some((k) => d.includes(k))) return cat; }
  return "outros";
}

// Normaliza a descrição em uma "chave de comerciante" estável, usada para
// aprender e reaplicar categorias (ex: "DL *UberRides" e "DL*UberRides 2/6"
// viram a mesma chave "dluberrides").
export function merchantKey(desc) {
  return (desc || "")
    .toLowerCase()
    .normalize("NFD")                                   // separa acentos (é → e + ´)
    .replace(/\d{1,2}\s*\/\s*\d{1,2}/g, "")            // marcador de parcela
    .replace(/parcela\s*\d+/g, "")
    .replace(/[^a-z]/g, "")                             // mantém só letras a-z (remove acentos, símbolos)
    .slice(0, 24);
}

// Aplica as regras aprendidas (chave → categoria) a uma lista de transações.
export function aplicarRegras(itens, regras) {
  if (!regras) return itens;
  return itens.map((i) => {
    const k = merchantKey(i.descricao);
    return k && regras[k] ? { ...i, categoria: regras[k] } : i;
  });
}

// ─── parcelamento ("PARC 3/10", "3/10", "Parcela 3 de 10") ───
export function detectaParcela(desc) {
  let m = desc.match(/parc(?:ela)?\.?\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})/i);
  if (!m) {
    const todas = [...desc.matchAll(/(?:^|\s)(\d{1,2})\/(\d{1,2})\b/g)];
    for (let i = todas.length - 1; i >= 0; i--) {
      const a = parseInt(todas[i][1]), t = parseInt(todas[i][2]);
      if (t > 1 && a <= t && t <= 99) return { parcelaAtual: a, parcelas: t };
    }
  }
  if (!m) m = desc.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (m) { const a = parseInt(m[1]), t = parseInt(m[2]); if (t > 1 && a <= t && t <= 99) return { parcelaAtual: a, parcelas: t }; }
  return { parcelaAtual: 1, parcelas: 1 };
}

// ═══════════════════════════════════════════════════════════════
// PARSER GENÉRICO
// ═══════════════════════════════════════════════════════════════
const MESES3 = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
const mesFromTok = (tok) => MESES3[String(tok).toLowerCase().slice(0, 3)];

// Linhas que NÃO são compras (pagamentos, saldos, cabeçalhos).
const SKIP = /pagamento em |pagamento recebido|obrigad[oa] pelo pagamento|pagamento efetuad|saldo restante|saldo anterior|saldo em aberto|total da fatura|fatura anterior|total de compras|^total\b|^limite|^utilizado|^dispon[ií]vel|pontos|bonifica|fator convers|total a pagar|valor total desta|melhor data|despesas a vencer|resumo da fatura|lan[çc]amentos:? *produtos/i;

// Detecta a data no INÍCIO da linha. Retorna {dia, mes(0-11), ano|null, len}.
function parseData(linha) {
  let m = linha.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (m) {
    const dia = +m[1], mes = +m[2] - 1;
    let ano = null;
    if (m[3]) ano = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    if (mes >= 0 && mes <= 11 && dia >= 1 && dia <= 31) return { dia, mes, ano, len: m[0].length };
  }
  m = linha.match(/^(\d{1,2})\s+(?:de\s+)?([A-Za-zçÇ]{3,})/);
  if (m) {
    const mes = mesFromTok(m[2]);
    const dia = +m[1];
    if (mes != null && dia >= 1 && dia <= 31) return { dia, mes, ano: null, len: m[0].length };
  }
  return null;
}

// Pega o ÚLTIMO valor monetário da linha. Retorna {valor, index}.
function parseValor(linha) {
  const re = /(-|−|–)?\s*R?\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*([DdCc])?/g;
  let m, last = null;
  while ((m = re.exec(linha)) !== null) last = m;
  if (!last) return null;
  const negativo = Boolean(last[1]) || (last[3] || "").toUpperCase() === "C";
  let valor = parseFloat(last[2].replace(/\./g, "").replace(",", "."));
  valor = negativo ? -Math.abs(valor) : Math.abs(valor);
  return { valor, index: last.index };
}

function limparDescricao(desc) {
  return desc
    .replace(/[•·]{2,}\s*\d+/g, " ")              // •••• 4354
    .replace(/\*{3,}\s*\d+/g, " ")
    .replace(/\s*-\s*NuPay/ig, " ")
    .replace(/\bBRL\b.*$/i, " ")                   // resíduo de conversão de moeda
    .replace(/\bUSD\b.*$/i, " ")
    .replace(/\bconvers[ãa]o\b.*$/i, " ")
    .replace(/\s+(sao paulo|são paulo|campo grande|rio de janeir\w*|brasil|br|sp|rj|mg|ms|df|pr|rs|ba|pe|ce|go)\.?\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseGenerico(texto, year, monthIdx) {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (const linha of linhas) {
    const dt = parseData(linha);
    if (!dt) continue;
    const vl = parseValor(linha);
    if (!vl || vl.valor === 0) continue;
    // texto entre a data e o valor
    const raw = linha.slice(dt.len, vl.index).trim();
    if (SKIP.test(linha) || SKIP.test(raw)) continue;
    if (!raw || !/[a-zA-Z]/.test(raw)) continue;

    const parc = detectaParcela(raw);
    const desc = limparDescricao(raw.replace(/\s*-?\s*parcela\s*\d+\s*\/\s*\d+/ig, "")) || raw;
    if (!desc || !/[a-zA-Z]/.test(desc)) continue;

    const ano = dt.ano || year;
    const dd = String(dt.dia).padStart(2, "0");
    const mm = String(dt.mes + 1).padStart(2, "0");
    out.push({
      descricao: desc.slice(0, 55),
      valor: vl.valor,
      data: `${ano}-${mm}-${dd}`,
      categoria: autoCategoria(desc),
      ...parc,
      portador: "Titular",
      final: "",
    });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════
// PARSER ESTRUTURADO (CAIXA) — agrupa por portador e reconcilia
// ═══════════════════════════════════════════════════════════════
function dividirCompras(linha) {
  const re = /(?:^|\s)(\d{2})\/(\d{2})\s+(?=[A-Za-zÀ-ú*])/g;
  const inicios = [];
  let m;
  while ((m = re.exec(linha)) !== null) {
    const dia = parseInt(m[1]), mes = parseInt(m[2]);
    if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) inicios.push(linha.indexOf(m[1] + "/" + m[2], m.index));
  }
  const uniq = [...new Set(inicios)].sort((a, b) => a - b);
  if (uniq.length <= 1) return [linha];
  const partes = [];
  for (let i = 0; i < uniq.length; i++) {
    const ini = uniq[i];
    const fim = i + 1 < uniq.length ? uniq[i + 1] : linha.length;
    const trecho = linha.slice(ini, fim).trim();
    if (/\d{1,3}(?:\.\d{3})*,\d{2}/.test(trecho)) partes.push(trecho);
  }
  return partes.length ? partes : [linha];
}

function parseFaturaGrupos(texto, year, monthIdx) {
  const linhas = texto.split(/\r?\n/).flatMap((l) => {
    const t = l.trim();
    if (/\(\s*final|\(\s*cart[aã]o|lan[çc]amentos|total/i.test(t)) return [t];
    return dividirCompras(t);
  });
  const grupos = [];
  const subtotaisGlobais = [];
  let atual = null;
  let pararFuturas = false;

  const semEsp = (s) => s.replace(/\s+/g, "").toLowerCase();
  const reHeaderPortador = /\(\s*(?:final|cart[aã]o)\s*(\d{3,4})\s*\)/i;

  for (let raw of linhas) {
    let linha = raw.trim();
    if (!linha) continue;
    const ne = semEsp(linha);

    if (/comprasparceladas-?pr[oó]ximasfaturas|^demaisfaturas$|^totalparapr[oó]ximasfaturas|^limitesdecr[eé]dito$|^limitedecr[eé]dito$|^encargoscobradosnestafatura|^simula[çc][aã]ode|^novotetodejuros|^demaistaxasdejuros/i.test(ne)) pararFuturas = true;
    if (pararFuturas) continue;

    if (/lan[çc]amentos\s*(no\s*cart[aã]o|produtos\s*e\s*servi[çc]os)/i.test(linha)) {
      const mSub = linha.match(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/);
      if (mSub) { const v = parseFloat(mSub[1].replace(/\./g, "").replace(",", ".")); subtotaisGlobais.push(v); if (atual) atual.subtotalDeclarado = v; }
      continue;
    }

    const hp = linha.match(reHeaderPortador);
    if (hp && !/^total/i.test(ne)) {
      const nomeRaw = linha.slice(0, hp.index).replace(/\d{4}\.\w+\.\w+\.\d{4}/g, "").trim();
      atual = { portador: nomeRaw || "Titular", final: hp[1], compras: [] };
      grupos.push(atual);
      linha = linha.slice(hp.index + hp[0].length).trim();
      if (!linha) continue;
    }
    if (/lan[çc]amentos:?produtoseservi[çc]os/i.test(ne)) { atual = { portador: "Produtos e Serviços", final: "svc", compras: [] }; grupos.push(atual); continue; }
    if (/lan[çc]amentosnocart[aã]o|totalfinal\(cart|totalcompras|^compras\(cart|^anuidade|^total[^a-z]/i.test(ne)) continue;
    if (/totaldafatura|pagamentoefetuado|obrigadopelopagamento|saldofinanciado|lan[çc]amentosatuais|totaldesta|valortotaldesta|resumodafatura|^data[^0-9]|^estabelecimento|valoremr\$|^continua|nosson[uú]mero|bancoita|autentica|^c[oó]digo|previs[aã]o|postagem|emiss[aã]o|localdepagamento|sacador|^usodobanco|nomedo|endere[çc]o|instru[çc][oõ]es|^titular|^vencimento|ototaldasua|^limite|^utilizado|^dispon[ií]vel|^saque/i.test(ne)) continue;
    if (/obrigadopelopagamento|pagamentoefetuado|pagamentorecebido|^pagamento[^a-z]/i.test(ne)) continue;
    if (/\d{2}\/\d{2}\/\d{4}/.test(linha)) continue;

    let limpa = linha;
    const mCompra = linha.match(/(\d{2})\/(\d{2})\s+(.+?)\s+(-?)\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*([DC]?)\s*$/);
    if (mCompra) limpa = mCompra[0].replace(/^\s+/, "");
    else limpa = linha.replace(/^[^\d]*?(?=\d{2}\/\d{2})/, "");

    const dm = limpa.match(/^(\d{2})\/(\d{2})\s+/);
    if (!dm) continue;
    const vm = limpa.match(/(-?)\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*([DC]?)\s*$/);
    if (!vm) continue;
    const isCredito = (vm[3] || "").toUpperCase() === "C";
    const desc0 = limpa.slice(dm[0].length).toLowerCase();
    if (isCredito && !/estorno|devolu|reembolso|ajuste/i.test(desc0)) continue;
    const neg = vm[1] === "-" || isCredito;
    let valor = parseFloat(vm[2].replace(/\./g, "").replace(",", "."));
    if (neg) valor = -valor;
    if (valor === 0) continue;
    const mes = parseInt(dm[2]), dia = parseInt(dm[1]);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) continue;
    let desc = limpa.slice(dm[0].length, limpa.length - vm[0].length).trim();
    desc = desc.replace(/\s{2,}/g, " ").replace(/\s+(sao paulo|brasil|br|sp|rj|mg|ms|df|pr|rs|ba|pe|ce|go|cuiaba|campo grande|osasco|belo horizont|porto alegre|serrana|jacarei|anapolis|petropolis|guarulhos|rio de janeir)\.?\s*$/i, "").trim();
    if (!desc || !/[a-zA-Z]/.test(desc)) continue;
    if (!atual) { atual = { portador: "Titular", final: "—", compras: [] }; grupos.push(atual); }
    const dd = String(dia).padStart(2, "0"), mm = String(mes).padStart(2, "0");
    atual.compras.push({ descricao: desc.slice(0, 55), valor, data: `${year}-${mm}-${dd}`, categoria: autoCategoria(desc), ...detectaParcela(desc) });
  }

  const limpos = grupos.filter((g) => g.compras.length > 0);
  const somaSubtotais = subtotaisGlobais.reduce((a, b) => a + b, 0);

  const baseMerchant = (c) => { let d = (c.descricao || "").toLowerCase(); d = d.replace(/\d{1,2}\s*\/\s*\d{1,2}/g, ""); d = d.replace(/[^a-zà-ú]/g, ""); return d.slice(0, 16); };
  const todasCompras = [];
  limpos.forEach((g) => g.compras.forEach((c) => todasCompras.push(c)));
  const menorParcela = {};
  todasCompras.forEach((c) => { if (c.parcelas > 1) { const b = baseMerchant(c); if (menorParcela[b] == null || c.parcelaAtual < menorParcela[b]) menorParcela[b] = c.parcelaAtual; } });
  const removerFuturas = new Set();
  todasCompras.forEach((c) => { if (c.parcelas > 1) { const b = baseMerchant(c); if (menorParcela[b] != null && c.parcelaAtual > menorParcela[b]) removerFuturas.add(c); } });
  limpos.forEach((g) => { g.compras = g.compras.filter((c) => !removerFuturas.has(c)); });

  let somaAtual = limpos.reduce((s, g) => s + g.compras.reduce((a, c) => a + c.valor, 0), 0);
  if (somaSubtotais > 0 && somaAtual - somaSubtotais > 0.01) {
    const mesAtual = monthIdx + 1;
    const candidatas = [];
    limpos.forEach((g) => g.compras.forEach((c) => { const mes = parseInt((c.data || "").slice(5, 7)) || 0; if (mes > mesAtual && mes - mesAtual < 7 && c.valor > 0) candidatas.push(c); }));
    candidatas.sort((a, b) => b.valor - a.valor);
    const rem = new Set();
    let excesso = somaAtual - somaSubtotais;
    for (const c of candidatas) { if (excesso <= 0.01) break; rem.add(c); excesso -= c.valor; }
    limpos.forEach((g) => { g.compras = g.compras.filter((c) => !rem.has(c)); });
  }

  const totalCompras = limpos.reduce((s, g) => s + g.compras.reduce((a, c) => a + c.valor, 0), 0);
  return { grupos: limpos, somaSubtotais, totalCompras };
}

function remontarLinhas(texto) {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  const reData = /^\d{2}\/\d{2}(?!\/)/;
  const reValor = /(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})\s*[DC]?\s*$/;
  for (let i = 0; i < linhas.length; i++) {
    let l = linhas[i];
    if (reData.test(l) && !reValor.test(l)) {
      let j = i + 1, juntou = l;
      while (j < linhas.length && j <= i + 3) { juntou += " " + linhas[j]; if (reValor.test(linhas[j])) break; j++; }
      if (reValor.test(juntou)) { out.push(juntou.replace(/\s{2,}/g, " ").trim()); i = j; continue; }
    }
    out.push(l);
  }
  return out.join("\n");
}

function flattenGrupos(r) {
  const out = [];
  r.grupos.forEach((g) => g.compras.forEach((c) => out.push({ ...c, portador: g.portador, final: g.final })));
  return out;
}

// ═══════════════════════════════════════════════════════════════
// PARSER ITAÚ — layout de 2 colunas com a categoria na linha de baixo,
// vários cartões (final XXXX), parcela colada no nome e estornos.
// Depende da extração "coluna a coluna" (ver ImportarTab): cada compra
// vem seguida da sua própria linha de categoria.
// ═══════════════════════════════════════════════════════════════
// Categorias que o próprio Itaú imprime → categorias do app.
const ITAU_CAT = [
  [/^alimenta/i, "alimentacao"],
  [/^ve[ií]culos/i, "transporte"],
  [/^sa[úu]de/i, "saude"],
  [/^vestu[áa]rio/i, "vestuario"],
  [/^educa/i, "educacao"],
  [/^turismo/i, "lazer"],
  [/^hobby/i, "lazer"],
  [/^lazer/i, "lazer"],
  [/^moradia/i, "moradia"],
  [/^diversos/i, "outros"],
  [/^servi/i, "outros"],
];
// Uma linha "de categoria" do Itaú começa com uma dessas palavras e traz o ". Cidade".
function itauCategoria(linha) {
  for (const [re, cat] of ITAU_CAT) if (re.test(linha)) return cat;
  return null;
}
function ehLinhaCategoriaItau(linha) {
  return /^(alimenta[çc]|ve[ií]culos|sa[úu]de|vestu[áa]rio|educa[çc]|turismo|hobby|lazer|moradia|diversos|servi[çc])/i.test(linha);
}
// Detecta se o texto extraído é uma fatura do Itaú. A assinatura mais forte é a
// linha de categoria com ponto (ex: "VEÍCULOS .CAMPO GRANDE"), exclusiva do Itaú,
// junto do cabeçalho "VALOR EM R$".
export function pareceItau(texto) {
  const t = texto || "";
  const temCategorias = (t.match(/^(alimenta[çc][ãa]o|ve[ií]culos|vestu[áa]rio|sa[úu]de|educa[çc][ãa]o|turismo|diversos)\s*\./gim) || []).length;
  return /valor\s+em\s+r\$/i.test(t) && temCategorias >= 3;
}

function parseItau(texto, year, monthIdx) {
  // Mês/ano de referência: prioriza o vencimento impresso na fatura.
  let refYear = year, refMonth = monthIdx + 1;
  const mv = texto.match(/vencimento[^0-9]{0,20}(\d{2})\/(\d{2})\/(\d{4})/i);
  if (mv) { refMonth = parseInt(mv[2], 10); refYear = parseInt(mv[3], 10); }

  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  const reFinal = /(.*?)\(\s*final\s*(\d{3,4})\s*\)/i;
  const reTxn = /^(\d{2})\/(\d{2})\s+(.+?)\s+(-\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;

  let parar = false;          // entrou em seção de próximas faturas/simulação
  let emProdutos = false;     // seção "produtos e serviços" (anuidade etc.)
  let portador = "Titular";
  let final = "";

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const ne = l.toLowerCase().replace(/\s+/g, "");

    // A partir daqui é tudo projeção/simulação — não são compras desta fatura.
    if (/comprasparceladas-?pr[oó]ximas|^simula[çc][aã]o|limitesdecr[eé]dito|limitedecr[eé]dito|encargoscobrados|novotetodejuros|demaistaxasdejuros|totalparapr[oó]ximas|^demaisfaturas/i.test(ne)) parar = true;
    if (parar) continue;

    // Cabeçalhos "Lançamentos: ...". Detecta a seção de produtos/serviços.
    if (/^lan[çc]amentos/i.test(l)) { emProdutos = /produtoseservi[çc]os/i.test(ne); continue; }

    // Cabeçalho de cartão: "FULANO (final 1796)".
    const mf = l.match(reFinal);
    if (mf) {
      const nome = mf[1].replace(/\d{4}\.\w+\.\w+\.\d{4}/g, "").trim();
      portador = nome || portador || "Titular";
      final = mf[2];
      emProdutos = false;
      continue;
    }

    // Ruído de cabeçalho de tabela e textos corridos.
    if (/^data\b|estabelecimento|valor\s*em\s*r\$|^total|^continua|^previs|^caso voc|^o pagamento|^consulte|^pague|^banco ita|^n[uú]mero|^nome do|^endere[çc]o|^local de|^sacador/i.test(l)) continue;
    if (/^\d{2}\/\d{2}\/\d{4}/.test(l)) continue; // datas dd/mm/aaaa (vencimento, processamento)

    const m = l.match(reTxn);
    if (!m) continue;
    const dia = parseInt(m[1], 10), mes = parseInt(m[2], 10);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) continue;

    const neg = Boolean(m[4]);
    let valor = parseFloat(m[5].replace(/\./g, "").replace(",", "."));
    if (neg) valor = -Math.abs(valor);
    if (valor === 0) continue;

    const raw = m[3].trim();
    if (!/[a-zA-ZÀ-ú]/.test(raw)) continue;

    // Categoria: usa a linha de baixo impressa pelo Itaú; senão adivinha.
    let categoria = null;
    if (i + 1 < linhas.length && ehLinhaCategoriaItau(linhas[i + 1])) categoria = itauCategoria(linhas[i + 1]);

    // Parcela colada ao nome ("L02/08", "01/02", "SFAUT02/03"). Não vale para
    // a seção de produtos/serviços (evita virar parcelado a anuidade).
    const parc = emProdutos ? { parcelaAtual: 1, parcelas: 1 } : detectaParcela(raw);

    // Descrição limpa: remove a parcela colada e a cidade no fim.
    let desc = raw
      .replace(/\s*[A-Za-z]?\d{2,}\s*\/\s*\d{2}\s*$/, "")   // "L02/08", "SFAUT02/03"
      .replace(/\s*\d{1,2}\s*\/\s*\d{1,2}\s*$/, "")          // "02/06"
      .replace(/\s{2,}/g, " ")
      .trim() || raw;
    if (!categoria) categoria = autoCategoria(desc);

    // Ano: se o mês da compra é maior que o mês da fatura, é do ano anterior
    // (parcelas antigas que o Itaú mostra com a data original, ex: 17/12).
    const ano = mes > refMonth ? refYear - 1 : refYear;
    const dd = String(dia).padStart(2, "0"), mm = String(mes).padStart(2, "0");

    out.push({
      descricao: desc.slice(0, 55),
      valor,
      data: `${ano}-${mm}-${dd}`,
      categoria,
      ...parc,
      portador: portador || "Titular",
      final: final || "",
    });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════
// ENTRADA PRINCIPAL — escolhe o melhor parser
// ═══════════════════════════════════════════════════════════════
export function parseFatura(texto, year, monthIdx) {
  // Itaú tem layout próprio (2 colunas + categoria impressa): parser dedicado.
  if (pareceItau(texto)) {
    const itau = parseItau(texto, year, monthIdx);
    if (itau.length >= 2) { itau.totalOficial = null; return itau; }
  }

  // Parser estruturado (CAIXA), com fallback de remontagem de linhas.
  let estru = parseFaturaGrupos(texto, year, monthIdx);
  let flatEstru = flattenGrupos(estru);
  if (flatEstru.length < 2) {
    const estru2 = parseFaturaGrupos(remontarLinhas(texto), year, monthIdx);
    if (flattenGrupos(estru2).length > flatEstru.length) { estru = estru2; flatEstru = flattenGrupos(estru2); }
  }

  const generico = parseGenerico(texto, year, monthIdx);

  // O texto "parece CAIXA" quando tem sufixos D/C ou marcadores de cartão.
  const pareceEstruturado = /lan[çc]amentos\s+no\s+cart[aã]o|\(\s*cart[aã]o\s*\d|\d,\d{2}\s*[DC]\b/i.test(texto);

  let out;
  let oficial = 0;
  if (pareceEstruturado && flatEstru.length >= 2) { out = flatEstru; oficial = estru.somaSubtotais; }
  else if (generico.length >= flatEstru.length) { out = generico; oficial = 0; }
  else { out = flatEstru; oficial = estru.somaSubtotais; }

  out.totalOficial = oficial > 0 ? oficial : null;
  return out;
}
