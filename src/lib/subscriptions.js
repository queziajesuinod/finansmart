// @ts-nocheck
// Detecta assinaturas / cobranças recorrentes a partir das compras de cartão
// (todas as faturas importadas) + despesas lançadas. Um gasto é considerado
// assinatura quando: está na categoria "assinaturas", OU bate com um serviço
// conhecido (Netflix, Spotify...), OU se repete em ≥2 meses com valor parecido.
import { merchantKey } from "./parseFatura";

// Serviços conhecidos de assinatura (nome no extrato → é recorrente).
const KEYWORDS = [
  // Streaming de vídeo (inclui brasileiros)
  "netflix", "primevideo", "prime video", "amazon prime", "disney", "disneyplus", "disney+",
  "star+", "starplus", "hbo", "hbomax", "max ", "globoplay", "paramount", "telecine",
  "premiere", "mubi", "looke", "clarovideo", "claro video", "directvgo", "directv go",
  "pluto tv", "plutotv", "apple tv", "appletv", "crunchyroll", "youtube",
  // Música / áudio
  "spotify", "deezer", "tidal", "apple music", "applemusic", "audible", "kindle",
  // Fitness / academia
  "gympass", "wellhub", "smartfit", "smart fit", "bodytech", "bio ritmo",
  // Software / produtividade / nuvem
  "apple.com", "apple .com", "icloud", "google one", "googleone", "microsoft", "office 365",
  "adobe", "canva", "chatgpt", "openai", "anthropic", "claude", "dropbox", "notion",
  "linkedin", "playstation", "xbox", "twitch",
  // Clubes / marketplaces / mercado livre
  "melimais", "meli+", "clube ifood", "ifood clube", "rappi", "envio mens",
];
const ehServicoConhecido = (desc) => { const l = (desc || "").toLowerCase(); return KEYWORDS.some((k) => l.includes(k)); };

// Limpa o nome para exibição (tira marcador de parcela e cidade final).
function limparNome(desc) {
  return (desc || "")
    .replace(/\s*\d{1,2}\s*\/\s*\d{1,2}\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim() || desc;
}

// Mesmo valor ao longo dos meses (assinatura cobra sempre o mesmo).
function mesmoValor(vals) {
  if (vals.length < 2) return false;
  return Math.max(...vals) - Math.min(...vals) <= 0.01;
}

// minMeses: um serviço fora da lista vira "recorrente" quando repete o MESMO
// valor em MAIS DE `minMeses` meses (e não é parcela). Padrão: 3.
export function detectarAssinaturas({ cartoes = [], despesas = [], minMeses = 3 }) {
  const charges = [];
  for (const c of cartoes || []) {
    for (const x of c.compras || []) {
      if ((x.valor || 0) > 0) charges.push({ key: merchantKey(x.descricao), descricao: x.descricao, valor: x.valor, data: x.data, categoria: x.categoria, origem: c.nome || c.banco || "Cartão", parcelas: x.parcelas || 1 });
    }
  }
  for (const d of despesas || []) {
    if ((d.valor || 0) > 0) charges.push({ key: merchantKey(d.descricao), descricao: d.descricao, valor: d.valor, data: d.data, categoria: d.categoria, origem: "Lançamento", parcelas: 1 });
  }

  const grupos = new Map();
  for (const ch of charges) { if (!ch.key) continue; if (!grupos.has(ch.key)) grupos.set(ch.key, []); grupos.get(ch.key).push(ch); }

  const itens = [];
  for (const [key, list] of grupos) {
    list.sort((a, b) => String(a.data).localeCompare(String(b.data)));
    // 1 representante por mês (a última cobrança daquele mês).
    const porMes = new Map();
    for (const ch of list) porMes.set(String(ch.data).slice(0, 7), ch);
    const meses = [...porMes.keys()].sort();
    const reps = meses.map((m) => porMes.get(m));
    const recente = reps[reps.length - 1];
    const anterior = reps.length >= 2 ? reps[reps.length - 2] : null;

    // Recorrente por padrão: MESMO valor em MAIS DE `minMeses` meses e não-parcela.
    const naoEhParcela = reps.every((r) => (r.parcelas || 1) <= 1);
    const recorrentePorPadrao = meses.length > minMeses && mesmoValor(reps.map((r) => r.valor)) && naoEhParcela;
    const ehAssinatura = recente.categoria === "assinaturas" || ehServicoConhecido(recente.descricao) || recorrentePorPadrao;
    if (!ehAssinatura) continue;

    let aumento = null;
    if (anterior && recente.valor - anterior.valor > 0.5 && recente.valor > anterior.valor * 1.02) {
      aumento = { de: anterior.valor, para: recente.valor, delta: recente.valor - anterior.valor };
    }

    itens.push({
      key,
      nome: limparNome(recente.descricao),
      valor: recente.valor,
      categoria: recente.categoria || "assinaturas",
      meses: meses.length,
      origem: recente.origem,
      aumento,
    });
  }

  // Aumentos primeiro, depois por valor.
  itens.sort((a, b) => (b.aumento ? 1 : 0) - (a.aumento ? 1 : 0) || b.valor - a.valor);
  const totalMes = itens.reduce((s, i) => s + i.valor, 0);
  return { itens, totalMes };
}
