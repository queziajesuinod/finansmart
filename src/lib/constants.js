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
