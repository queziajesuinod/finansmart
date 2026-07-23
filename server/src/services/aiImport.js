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

// Extrai as compras da fatura via IA. Retorna { compras: [...], totalOficial }.
async function lerFaturaComIA({ texto, refYear, refMonth }) {
  if (!aiEnabled()) {
    const err = new Error("Leitura com IA não configurada no servidor.");
    err.code = "ai_disabled";
    err.status = 501;
    throw err;
  }
  if (!texto || texto.trim().length < 20) {
    const err = new Error("Texto da fatura muito curto para analisar.");
    err.code = "empty_text";
    err.status = 400;
    throw err;
  }

  // Corta texto exagerado para caber no limite de tokens do modelo.
  const conteudo = texto.length > 24000 ? texto.slice(0, 24000) : texto;

  const body = {
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt(refYear, refMonth) },
      { role: "user", content: `Texto da fatura:\n\n${conteudo}` },
    ],
  };

  let res;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const err = new Error("Não foi possível contatar o serviço de IA.");
    err.code = "ai_unreachable";
    err.status = 502;
    throw err;
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err = new Error(`Serviço de IA retornou erro ${res.status}.`);
    err.code = "ai_error";
    err.status = res.status === 429 ? 429 : 502;
    err.detail = txt.slice(0, 300);
    throw err;
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const err = new Error("A IA respondeu em formato inesperado.");
    err.code = "ai_bad_json";
    err.status = 502;
    throw err;
  }

  const compras = Array.isArray(parsed.compras) ? parsed.compras : [];
  const limpas = compras
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

  // Dados do cartão/conta.
  let cartao = null;
  const cc = parsed.cartao;
  if (cc && typeof cc === "object") {
    const dia = parseInt(cc.vencimentoDia, 10);
    const portadores = Array.isArray(cc.portadores)
      ? cc.portadores
          .map((p) => ({ nome: String(p?.nome || "").slice(0, 40), final: String(p?.final || "").replace(/\D/g, "").slice(0, 4) }))
          .filter((p) => p.nome)
      : [];
    cartao = {
      banco: String(cc.banco || "").slice(0, 40),
      nome: String(cc.nome || "").slice(0, 40),
      limite: Number(cc.limite) > 0 ? Number(cc.limite) : null,
      vencimentoDia: dia >= 1 && dia <= 31 ? dia : null,
      portadores,
    };
  }

  return { compras: limpas, totalOficial, cartao };
}

module.exports = { lerFaturaComIA, aiEnabled };
