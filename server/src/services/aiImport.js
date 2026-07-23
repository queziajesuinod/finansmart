// Leitura de faturas com IA (reforço). Usa a API da Groq (compatível com OpenAI),
// gratuita e que NÃO treina com os dados enviados. Recebe o TEXTO já extraído do
// PDF no dispositivo do usuário (o PDF em si nunca sai do aparelho) e devolve as
// compras estruturadas em JSON. A chave fica só no servidor (GROQ_API_KEY).

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const CATEGORIAS = [
  "moradia", "alimentacao", "transporte", "saude",
  "lazer", "educacao", "vestuario", "assinaturas", "outros",
];

const aiEnabled = () => Boolean(process.env.GROQ_API_KEY);

function systemPrompt(refYear, refMonth) {
  return `Você é um extrator de faturas de cartão de crédito brasileiras. Recebe o TEXTO bruto de uma fatura (pode estar bagunçado, com colunas embaralhadas) e devolve APENAS as compras/lançamentos DESTA fatura, em JSON.

Mês de referência da fatura: ${String(refMonth).padStart(2, "0")}/${refYear}.

REGRAS:
- Inclua todas as compras, saques e taxas do período atual, de TODOS os cartões (titular e adicionais).
- Estornos, devoluções e créditos entram com valor NEGATIVO.
- NÃO inclua: pagamento da fatura anterior, saldos, "compras parceladas - próximas faturas", simulações, limites, encargos projetados, totais e subtotais.
- Parcelas: se a compra mostra algo como "02/08", "L03/10" ou "Parcela 3/10", preencha parcelaAtual e parcelas (o total). Se não for parcelada, use parcelaAtual=1 e parcelas=1. Remova esse marcador da descrição.
- data no formato YYYY-MM-DD. A fatura mostra só dia/mês; use o ano de referência. Se o mês da compra for MAIOR que o mês de referência (${refMonth}), use o ANO ANTERIOR (${refYear - 1}) — são parcelas antigas.
- descricao: nome limpo do estabelecimento (sem cidade, sem marcador de parcela), máx 55 caracteres.
- categoria: escolha UMA entre: ${CATEGORIAS.join(", ")}. Se a fatura já imprime a categoria (ex: "ALIMENTAÇÃO", "VEÍCULOS"→transporte, "DIVERSOS"→outros), respeite-a.
- portador: nome do titular do cartão daquele lançamento (o titular OU um adicional — ex: numa fatura Itaú pode ter "THIAGO" e "RAYENE"). Use "Titular" se não houver nome. final: os 4 últimos dígitos do cartão daquele lançamento, se houver.
- totalOficial: o valor total desta fatura impresso no documento (número), se você encontrar.

Extraia também os DADOS DO CARTÃO/CONTA (bloco "cartao"):
- banco: emissor (ex: "Itaú", "Nubank", "CAIXA").
- nome: apelido/bandeira do cartão se aparecer (ex: "Visa Azul"), senão null.
- limite: o "Limite total de crédito" impresso (número), senão null.
- vencimentoDia: o DIA do vencimento da fatura (1-31), senão null.
- portadores: lista dos titulares/adicionais encontrados, cada um {"nome": string, "final": string}. Ex: [{"nome":"THIAGO A G DE MEDEIROS","final":"1796"},{"nome":"RAYENE MEDEIROS","final":"2168"}].

Responda SOMENTE com JSON válido no formato:
{"totalOficial": number|null, "cartao": {"banco": string|null, "nome": string|null, "limite": number|null, "vencimentoDia": number|null, "portadores": [{"nome": string, "final": string}]}, "compras": [{"descricao": string, "valor": number, "data": "YYYY-MM-DD", "categoria": string, "parcelaAtual": number, "parcelas": number, "portador": string, "final": string}]}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Chamada genérica ao Groq (reutilizada pelo importador e pelo assistente).
// Retorna o texto da resposta. json=true força response_format JSON. 1 retry em 429.
async function groqCompletion(messages, { json = false, maxTokens = 1024, temperature } = {}) {
  if (!aiEnabled()) { const err = new Error("Serviço de IA não configurado no servidor."); err.code = "ai_disabled"; err.status = 501; throw err; }
  const body = { model: MODEL, temperature: temperature != null ? temperature : (json ? 0 : 0.3), max_tokens: maxTokens, messages };
  if (json) body.response_format = { type: "json_object" };

  for (let tentativa = 0; tentativa < 2; tentativa++) {
    let res;
    try {
      res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify(body),
      });
    } catch (e) {
      const err = new Error("Não foi possível contatar o serviço de IA.");
      err.code = "ai_unreachable"; err.status = 502; throw err;
    }
    if (res.status === 429 && tentativa === 0) { await sleep(2500); continue; } // rate limit: espera e tenta de novo
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const err = new Error(`Serviço de IA retornou erro ${res.status}.`);
      err.code = "ai_error"; err.status = res.status === 429 ? 429 : 502; err.detail = txt.slice(0, 300); throw err;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  }
  const err = new Error("O serviço de IA está ocupado (limite de uso). Tente novamente em instantes.");
  err.code = "ai_rate_limited"; err.status = 429; throw err;
}

// Uma chamada ao Groq com JSON mode para a leitura de fatura.
async function chamarGroq(conteudo, refYear, refMonth) {
  const raw = await groqCompletion(
    [{ role: "system", content: systemPrompt(refYear, refMonth) }, { role: "user", content: `Texto da fatura:\n\n${conteudo}` }],
    { json: true, maxTokens: 8000 }
  );
  try { return JSON.parse(raw || "{}"); }
  catch { const err = new Error("A IA respondeu em formato inesperado."); err.code = "ai_bad_json"; err.status = 502; throw err; }
}

// Normaliza a resposta da IA em { compras, totalOficial, cartao }.
function parseResposta(parsed) {
  const compras = (Array.isArray(parsed.compras) ? parsed.compras : [])
    .map((c) => ({
      descricao: String(c.descricao || "").slice(0, 55),
      valor: Number(c.valor) || 0,
      data: /^\d{4}-\d{2}-\d{2}$/.test(c.data) ? c.data : null,
      categoria: CATEGORIAS.includes(c.categoria) ? c.categoria : "outros",
      parcelaAtual: Math.max(1, parseInt(c.parcelaAtual, 10) || 1),
      parcelas: Math.max(1, parseInt(c.parcelas, 10) || 1),
      portador: String(c.portador || "Titular").slice(0, 40) || "Titular",
      final: String(c.final || "").replace(/\D/g, "").slice(0, 4),
    }))
    .filter((c) => c.descricao && c.data && c.valor !== 0);

  const totalOficial = Number(parsed.totalOficial) > 0 ? Number(parsed.totalOficial) : null;

  let cartao = null;
  const cc = parsed.cartao;
  if (cc && typeof cc === "object") {
    const dia = parseInt(cc.vencimentoDia, 10);
    const portadores = Array.isArray(cc.portadores)
      ? cc.portadores.map((p) => ({ nome: String(p?.nome || "").slice(0, 40), final: String(p?.final || "").replace(/\D/g, "").slice(0, 4) })).filter((p) => p.nome)
      : [];
    cartao = {
      banco: String(cc.banco || "").slice(0, 40),
      nome: String(cc.nome || "").slice(0, 40),
      limite: Number(cc.limite) > 0 ? Number(cc.limite) : null,
      vencimentoDia: dia >= 1 && dia <= 31 ? dia : null,
      portadores,
    };
  }
  return { compras, totalOficial, cartao };
}

// Divide a fatura em blocos ~maxChars, carregando o cabeçalho (vencimento/limite)
// e o último "Cartão (final XXXX)" para cada bloco não perder o contexto.
function dividirEmBlocos(texto, maxChars) {
  const linhas = texto.split(/\r?\n/);
  const preambulo = linhas.slice(0, 25).join("\n");
  const headerRe = /\(\s*final\s*\d{3,4}\s*\)/i;
  const blocos = [];
  let start = 0;
  while (start < linhas.length) {
    let end = start, size = 0;
    while (end < linhas.length && size < maxChars) { size += linhas[end].length + 1; end++; }
    let ultimoCartao = "";
    for (let i = start - 1; i >= 0; i--) { if (headerRe.test(linhas[i])) { ultimoCartao = linhas[i]; break; } }
    const corpo = linhas.slice(start, end).join("\n");
    const ctx = start === 0 ? "" : `${preambulo}\n${ultimoCartao ? "Cartão desta parte: " + ultimoCartao : ""}\n`;
    blocos.push(ctx + corpo);
    start = end;
  }
  return blocos;
}

// Extrai as compras da fatura via IA. Para faturas grandes, processa em blocos
// e junta os resultados (evita cortar transações no limite de tokens).
async function lerFaturaComIA({ texto, refYear, refMonth }) {
  if (!aiEnabled()) {
    const err = new Error("Leitura com IA não configurada no servidor.");
    err.code = "ai_disabled"; err.status = 501; throw err;
  }
  if (!texto || texto.trim().length < 20) {
    const err = new Error("Texto da fatura muito curto para analisar.");
    err.code = "empty_text"; err.status = 400; throw err;
  }

  const MAX_BLOCO = 11000; // ~caracteres por chamada
  const blocos = texto.length <= 12000 ? [texto] : dividirEmBlocos(texto, MAX_BLOCO);

  const todas = [];
  let totalOficial = null;
  let cartao = null;
  const portadoresSet = new Map();

  for (let i = 0; i < blocos.length; i++) {
    const parsed = await chamarGroq(blocos[i], refYear, refMonth);
    const r = parseResposta(parsed);
    todas.push(...r.compras); // blocos são contíguos (sem sobreposição) → sem dedup
    if (totalOficial == null && r.totalOficial != null) totalOficial = r.totalOficial;
    if (!cartao && r.cartao && (r.cartao.banco || r.cartao.limite || r.cartao.vencimentoDia)) cartao = r.cartao;
    (r.cartao?.portadores || []).forEach((p) => { const k = p.final || p.nome; if (k && !portadoresSet.has(k)) portadoresSet.set(k, p); });
    if (i < blocos.length - 1) await sleep(400); // respeita o rate limit da cota grátis
  }

  if (cartao) cartao.portadores = [...portadoresSet.values()];
  return { compras: todas, totalOficial, cartao, blocos: blocos.length };
}

module.exports = { lerFaturaComIA, aiEnabled, groqCompletion };
