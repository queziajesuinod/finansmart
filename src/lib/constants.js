// @ts-nocheck

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Tokens do tema — referenciam variáveis CSS (trocam entre light/dark sozinhas).
// Ver os valores em src/index.css.
export const C = {
  bg: "var(--bg)",
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  fill: "var(--fill)",
  fill2: "var(--fill-2)",
  track: "var(--track)",
  border: "var(--border)",
  borderStrong: "var(--border-strong)",
  text: "var(--text)",
  muted: "var(--muted)",
  subtle: "var(--subtle)",
  primary: "var(--primary)",
  onPrimary: "var(--on-primary)",
  accent: "var(--accent)",
  // Aliases mantidos p/ compatibilidade com o código existente:
  indigo: "var(--accent)",
  violet: "var(--accent)",
  emerald: "var(--success)",
  amber: "var(--warning)",
  red: "var(--danger)",
  cyan: "var(--info)",
  rose: "var(--danger)",
  sky: "var(--accent)",
};

// Mistura uma cor com transparência (para fundos suaves tint).
export const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export const CATEGORIES = [
  { id: "moradia", label: "Moradia", color: "var(--cat-moradia)" },
  { id: "alimentacao", label: "Alimentação", color: "var(--cat-alimentacao)" },
  { id: "transporte", label: "Transporte", color: "var(--cat-transporte)" },
  { id: "saude", label: "Saúde", color: "var(--cat-saude)" },
  { id: "lazer", label: "Lazer", color: "var(--cat-lazer)" },
  { id: "educacao", label: "Educação", color: "var(--cat-educacao)" },
  { id: "vestuario", label: "Vestuário", color: "var(--cat-vestuario)" },
  { id: "assinaturas", label: "Assinaturas", color: "var(--cat-assinaturas)" },
  { id: "outros", label: "Outros", color: "var(--cat-outros)" },
];

export const today = new Date();
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function fmt(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export function fmtPct(v) {
  return `${Math.round(v)}%`;
}

export function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

// Salário vigente: o último salário informado em algum mês ANTERIOR a (year, monthIdx).
// Usado para herdar o salário automaticamente quando o mês atual está vazio.
export function salarioVigente(incomes, year, monthIdx) {
  for (let i = 1; i <= 24; i++) {
    const d = new Date(year, monthIdx - i, 1);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    const v = incomes[k] && incomes[k].renda;
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return { valor: String(v), de: k, mes: d.getMonth(), ano: d.getFullYear() };
    }
  }
  return { valor: "", de: null, mes: null, ano: null };
}

// Renda de salário efetiva de um mês: a explícita, se houver; senão a herdada.
export function rendaSalarioEfetiva(incomes, year, monthIdx) {
  const k = `${year}-${monthIdx}`;
  const propria = incomes[k] && incomes[k].renda;
  if (propria !== undefined && propria !== null && String(propria).trim() !== "") return String(propria);
  return salarioVigente(incomes, year, monthIdx).valor;
}

// ─── Holerites (renda fixa estruturada) ──────────────────────
// mesRef é "YYYY-MM" (MM 01-12). Índice comparável = ano*12 + (mês-1).
export function mesRefDe(year, monthIdx) {
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
}
function idxDeMesRef(mesRef) {
  const [y, m] = String(mesRef || "").split("-").map(Number);
  if (!y || !m) return null;
  return y * 12 + (m - 1);
}

// Líquido de um holerite = salário bruto − soma dos descontos.
export function liquidoHolerite(h) {
  const bruto = Number(h && h.salarioBruto) || 0;
  const desc = ((h && h.descontos) || []).reduce((s, d) => s + (Number(d && d.valor) || 0), 0);
  return bruto - desc;
}
export function totalOutrosRendimentos(h) {
  return ((h && h.outrosRendimentos) || []).reduce((s, r) => s + (Number(r && r.valor) || 0), 0);
}
// Renda do holerite = líquido + benefícios (outros rendimentos, ex.: VR/VA).
// Os benefícios contam como renda.
export function rendaHolerite(h) {
  return liquidoHolerite(h) + totalOutrosRendimentos(h);
}

// Holerites vigentes num mês: recorrentes valem do seu mesRef em diante (o mais
// recente por membro+título "vence"); não-recorrentes valem só no próprio mês.
export function holeritesVigentes(holerites, year, monthIdx) {
  const alvo = year * 12 + monthIdx;
  const lista = Array.isArray(holerites) ? holerites : [];
  const recorrentes = {}; // chave membroId|titulo → holerite mais recente ≤ alvo
  const pontuais = [];
  for (const h of lista) {
    const idx = idxDeMesRef(h.mesRef);
    if (idx == null) continue;
    if (h.recorrente === false) { if (idx === alvo) pontuais.push(h); continue; }
    if (idx > alvo) continue; // ainda não começou
    const chave = `${h.membroId || ""}|${String(h.titulo || "").toLowerCase().trim()}`;
    const atual = recorrentes[chave];
    if (!atual || idx > idxDeMesRef(atual.mesRef)) recorrentes[chave] = h;
  }
  return [...Object.values(recorrentes), ...pontuais];
}

// Rendas extras vigentes num mês: as pontuais valem só no próprio mês; as
// recorrentes valem do seu mesRef em diante (até serem excluídas).
export function rendasExtrasDoMes(rendasExtras, year, monthIdx) {
  const alvo = year * 12 + monthIdx;
  return (Array.isArray(rendasExtras) ? rendasExtras : []).filter((r) => {
    const idx = idxDeMesRef(r.mesRef);
    if (idx == null) return false;
    return r.recorrente ? idx <= alvo : idx === alvo;
  });
}
