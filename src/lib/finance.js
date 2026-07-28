// @ts-nocheck

// Sistemas de amortização suportados. A taxa é sempre informada em % ao mês
// (ex.: 1.5 = 1,5% a.m.); internamente convertemos para decimal (i = taxa/100).
export const SISTEMAS = [
  { id: "PRICE", label: "Price (parcela fixa)" },
  { id: "SAC", label: "SAC (parcela decrescente)" },
];

// Normaliza o sistema (default PRICE — compatível com contratos antigos).
export function normSistema(s) {
  return s === "SAC" ? "SAC" : "PRICE";
}

const toRate = (taxaMensal) => (taxaMensal || 0) / 100;

// ─── PRICE (prestação constante) ─────────────────────────────
export function calcPMT(pv, taxaMensal, n) {
  if (!pv || !n) return 0;
  const i = toRate(taxaMensal);
  if (i === 0) return pv / n;
  return (pv * i) / (1 - Math.pow(1 + i, -n));
}

// ─── SAC (amortização constante) ─────────────────────────────
// Amortização fixa = PV / n; a prestação decresce a cada parcela.
export function calcAmortizacaoSAC(pv, n) {
  return pv && n ? pv / n : 0;
}

// Prestação SAC da parcela k (1..n): amortFixa + juros sobre o saldo inicial de k.
export function calcParcelaSAC(pv, taxaMensal, n, k) {
  if (!pv || !n) return 0;
  const i = toRate(taxaMensal);
  const a = pv / n;
  const kk = Math.min(Math.max(1, k || 1), n);
  const saldoInicial = pv - (kk - 1) * a;
  return a + saldoInicial * i;
}

// ─── Genéricas por sistema ───────────────────────────────────
// Valor da parcela nº k. PRICE: constante. SAC: decrescente.
export function calcParcela(sistema, pv, taxaMensal, n, k = 1) {
  return normSistema(sistema) === "SAC"
    ? calcParcelaSAC(pv, taxaMensal, n, k)
    : calcPMT(pv, taxaMensal, n);
}

// Saldo devedor após `pago` parcelas (5º arg `sistema`, default PRICE).
export function calcSaldoDevedor(pv, taxaMensal, n, pago, sistema = "PRICE") {
  if (!pv || !n) return 0;
  const k = Math.min(Math.max(0, pago || 0), n);
  if (normSistema(sistema) === "SAC") {
    const a = pv / n;
    return Math.max(0, pv - k * a);
  }
  const i = toRate(taxaMensal);
  if (i === 0) return Math.max(0, pv * (1 - k / n));
  const pmt = calcPMT(pv, taxaMensal, n);
  return Math.max(0, pv * Math.pow(1 + i, k) - pmt * (Math.pow(1 + i, k) - 1) / i);
}

// Tabela de amortização completa. Fecha a última parcela exatamente no zero
// (a amortização final absorve o resíduo de arredondamento).
export function buildSchedule(sistema, pv, taxaMensal, n) {
  const rows = [];
  if (!pv || !n) return rows;
  const i = toRate(taxaMensal);
  const sac = normSistema(sistema) === "SAC";
  const amortFixa = pv / n;
  const pmt = sac ? 0 : calcPMT(pv, taxaMensal, n);
  let saldo = pv;
  for (let k = 1; k <= n; k++) {
    const juros = i === 0 ? 0 : saldo * i;
    const amort = k === n ? saldo : (sac ? amortFixa : pmt - juros);
    const prest = amort + juros;
    saldo = Math.max(0, saldo - amort);
    rows.push({ k, pmt: prest, juros, amort, saldo });
  }
  return rows;
}

// Totalizadores do empréstimo conforme o sistema (fórmulas fechadas).
export function resumoEmprestimo(sistema, pv, taxaMensal, n) {
  if (!pv || !n) return { parcelaInicial: 0, parcelaFinal: 0, totalPago: 0, totalJuros: 0, custoTotal: 0 };
  const i = toRate(taxaMensal);
  if (normSistema(sistema) === "SAC") {
    const a = pv / n;
    const parcelaInicial = a + pv * i;      // PV/n + PV*i
    const parcelaFinal = a + a * i;          // PV/n + (PV/n)*i
    const totalJuros = (pv * (n + 1) / 2) * i;
    const totalPago = pv + totalJuros;
    return { parcelaInicial, parcelaFinal, totalPago, totalJuros, custoTotal: totalPago / pv - 1 };
  }
  const pmt = calcPMT(pv, taxaMensal, n);
  const totalPago = pmt * n;
  return { parcelaInicial: pmt, parcelaFinal: pmt, totalPago, totalJuros: totalPago - pv, custoTotal: totalPago / pv - 1 };
}

export function calcParcelasPagas(dataPrimeira, n) {
  if (!dataPrimeira || !n) return 0;
  const d1 = new Date(`${dataPrimeira}T12:00:00`);
  if (Number.isNaN(d1.getTime())) return 0;

  const hoje = new Date();
  if (hoje < d1) return 0;

  let meses = (hoje.getFullYear() - d1.getFullYear()) * 12 + (hoje.getMonth() - d1.getMonth());
  if (hoje.getDate() >= d1.getDate()) meses += 1;

  return Math.min(n, Math.max(0, meses));
}

export function calcDataQuitacao(dataPrimeira, n) {
  if (!dataPrimeira || !n) return "";
  const d = new Date(`${dataPrimeira}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + (n - 1));
  return d.toISOString().split("T")[0];
}
