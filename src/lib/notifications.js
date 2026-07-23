// @ts-nocheck
// Central de notificações: gera alertas proativos a partir do estado financeiro
// do usuário e guarda quais já foram lidos (localStorage). Novos tipos de
// notificação são só mais uma regra em gerarNotificacoes().
import { fmt, MONTH_NAMES } from "./constants";

const READ_KEY = "jp:notif:read";

export function loadRead() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); }
  catch { return new Set(); }
}
export function saveRead(set) {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...set].slice(-300))); } catch { /* ignore */ }
}

// Severidades → usadas pelo componente para cor/ícone.
//  alta (danger) · media (atenção) · info · sucesso
function dueEmDias(dia, today) {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let due = new Date(today.getFullYear(), today.getMonth(), dia);
  if (dia < today.getDate()) due = new Date(today.getFullYear(), today.getMonth() + 1, dia);
  return { dias: Math.round((due - base) / 86400000), due };
}

// Recebe um retrato do estado e devolve a lista de notificações (deduplicadas).
export function gerarNotificacoes(ctx) {
  const {
    year, monthIdx, today = new Date(),
    totalRenda = 0, totalDespesas = 0, projecao = 0,
    porCategoria = [], cartoes = [], parcelVencendoMes = [], goals = [], assinaturas = [],
  } = ctx || {};
  const periodo = `${year}-${monthIdx}`;
  const mesNome = MONTH_NAMES[monthIdx] || "";
  const out = new Map(); // id → notif (dedup por id)
  const add = (n) => { if (!out.has(n.id)) out.set(n.id, { tab: "dashboard", ...n }); };

  // 1) Renda não informada.
  if (totalRenda === 0) {
    add({ id: `renda-vazia-${periodo}`, severidade: "info", tab: "dashboard",
      titulo: "Informe sua renda", msg: `Cadastre a renda de ${mesNome} para acompanhar o saldo e as projeções.` });
  }

  // 2) Gastos acima da renda (déficit já concretizado) — ou 3) projeção negativa.
  if (totalRenda > 0 && totalDespesas > totalRenda) {
    add({ id: `deficit-${periodo}`, severidade: "alta", tab: "extrato",
      titulo: "Gastos acima da renda", msg: `Seus gastos (${fmt(totalDespesas)}) já passaram da sua renda (${fmt(totalRenda)}) em ${mesNome}.` });
  } else if (totalRenda > 0 && projecao < 0) {
    add({ id: `proj-neg-${periodo}`, severidade: "alta", tab: "dashboard",
      titulo: "Saldo pode ficar negativo", msg: `No ritmo atual, seu saldo no fim de ${mesNome} deve fechar em ${fmt(projecao)}.` });
  }

  // 4) Categoria dominante (>45% dos gastos).
  if (totalDespesas > 0 && porCategoria.length) {
    const top = porCategoria[0];
    const pct = (top.total / totalDespesas) * 100;
    if (pct >= 45) {
      add({ id: `cat-alta-${top.id}-${periodo}`, severidade: "media", tab: "extrato",
        titulo: `Concentração em ${top.label}`, msg: `${top.label} representa ${pct.toFixed(0)}% dos seus gastos de ${mesNome} (${fmt(top.total)}).` });
    }
  }

  // 5) Faturas de cartão vencendo em até 5 dias (deduplicadas por banco+dia).
  const vistos = new Set();
  for (const c of cartoes || []) {
    if (!c.vencimentoDia) continue;
    const chave = `${(c.banco || c.nome || "").toLowerCase()}-${c.vencimentoDia}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const { dias, due } = dueEmDias(c.vencimentoDia, today);
    if (dias >= 0 && dias <= 5) {
      const dueYM = `${due.getFullYear()}-${due.getMonth()}`;
      const quando = dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`;
      add({ id: `fatura-${chave}-${dueYM}`, severidade: "media", tab: "cartoes",
        titulo: `Fatura ${c.banco || c.nome || ""} vence ${quando}`, msg: `A fatura do cartão ${c.nome || c.banco || ""} vence no dia ${c.vencimentoDia}.` });
    }
  }

  // 6) Parcelas encerrando este mês.
  if ((parcelVencendoMes || []).length) {
    const n = parcelVencendoMes.length;
    add({ id: `parc-encerra-${periodo}`, severidade: "info", tab: "parcelados",
      titulo: `${n} parcelamento${n > 1 ? "s" : ""} encerrando`, msg: `${n} compra${n > 1 ? "s" : ""} parcelada${n > 1 ? "s" : ""} chega${n > 1 ? "m" : ""} à última parcela em ${mesNome} — em breve sobra mais no orçamento.` });
  }

  // 7) Metas: atingidas (persistente) e quase lá (>=90%).
  for (const g of goals || []) {
    const alvo = Number(g.alvo) || 0, atual = Number(g.atual) || 0;
    if (alvo <= 0) continue;
    const p = atual / alvo;
    if (p >= 1) add({ id: `meta-ok-${g.id}`, severidade: "sucesso", tab: "metas",
      titulo: `Meta alcançada 🎉`, msg: `Você atingiu a meta "${g.nome}" (${fmt(atual)} de ${fmt(alvo)}).` });
    else if (p >= 0.9) add({ id: `meta-quase-${g.id}-${periodo}`, severidade: "info", tab: "metas",
      titulo: `Quase lá: ${g.nome}`, msg: `Faltam ${fmt(alvo - atual)} para concluir a meta "${g.nome}".` });
  }

  // 8) Assinaturas que aumentaram de valor.
  for (const s of assinaturas || []) {
    if (!s.aumento) continue;
    add({ id: `assinatura-aumento-${s.key}-${Math.round(s.aumento.para * 100)}`, severidade: "media", tab: "dashboard",
      titulo: `${s.nome} ficou mais cara`, msg: `A assinatura ${s.nome} subiu de ${fmt(s.aumento.de)} para ${fmt(s.aumento.para)} (+${fmt(s.aumento.delta)}/mês).` });
  }

  // Ordena por severidade (alta → sucesso).
  const ordem = { alta: 0, media: 1, info: 2, sucesso: 3 };
  return [...out.values()].sort((a, b) => (ordem[a.severidade] ?? 9) - (ordem[b.severidade] ?? 9));
}
