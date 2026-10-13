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

// ─── Conversão de taxa efetiva mensal ⇄ anual ────────────────
// Efetiva composta: (1 + i)^12 = (1 + ia). Ex.: 1% a.m. ≈ 12,68% a.a.
export const taxaMensalParaAnual = (m) => (Math.pow(1 + (m || 0) / 100, 12) - 1) * 100;
export const taxaAnualParaMensal = (a) => (Math.pow(1 + (a || 0) / 100, 1 / 12) - 1) * 100;

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

// ─── Amortização com aportes extraordinários ─────────────────
// Simula o contrato mês a mês. `extras` são aportes extraordinários pagos JUNTO
// da parcela `parcela`:  { parcela, valor, tipo }.
//   tipo "prazo"   → mantém a prestação e encurta o prazo (menos parcelas).
//   tipo "parcela" → mantém o prazo e reduz a prestação (recalcula a partir do saldo).
// Um aporte pode trazer os valores informados pelo banco, que SUBSTITUEM o cálculo
// automático dali em diante: novoSaldo (saldo devedor após o aporte), novaParcela
// (prestação seguinte, só Price) e novoPrazo (parcelas restantes).
// Retorna as linhas do fluxo: { k, pmt(prestação), juros, amort, extra, saldo }.
export function amortize(sistema, pv, taxaMensal, n, extras = []) {
  const rows = [];
  if (!pv || !n) return rows;
  const sac = normSistema(sistema) === "SAC";
  const i = toRate(taxaMensal);

  const byParcela = {};
  for (const e of extras || []) {
    const k = Math.max(1, Math.trunc(Number(e.parcela) || 0));
    const val = Math.max(0, Number(e.valor) || 0);
    const novoSaldo = Math.max(0, Number(e.novoSaldo) || 0);
    const novaParcela = Math.max(0, Number(e.novaParcela) || 0);
    const novoPrazo = Math.max(0, Math.trunc(Number(e.novoPrazo) || 0));
    if (!val && !novoSaldo && !novaParcela && !novoPrazo) continue;
    (byParcela[k] = byParcela[k] || []).push({ valor: val, tipo: e.tipo === "parcela" ? "parcela" : "prazo", novoSaldo, novaParcela, novoPrazo });
  }

  let saldo = pv;
  let nAlvo = n;                                  // parcela final alvo (muda ao reduzir prazo)
  let pmt = sac ? 0 : calcPMT(pv, taxaMensal, n); // prestação Price
  let amortFixa = sac ? pv / n : 0;               // amortização SAC
  let prazoFixo = false;                          // prazo informado pelo banco: quita em nAlvo

  // Meses p/ quitar `sld` mantendo a prestação/amortização atual.
  const projetaMeses = (sld) => {
    if (sld <= 0.005) return 0;
    if (sac) return Math.max(1, Math.ceil(sld / amortFixa - 1e-9));
    if (i === 0) return Math.max(1, Math.ceil(sld / pmt - 1e-9));
    const ratio = 1 - (sld * i) / pmt;
    if (ratio <= 0) return 999; // prestação não cobre os juros
    return Math.max(1, Math.ceil(-Math.log(ratio) / Math.log(1 + i) - 1e-9));
  };

  let k = 0;
  while (saldo > 0.005 && k < 1200) {
    k++;
    const juros = i === 0 ? 0 : saldo * i;
    let amort = sac ? Math.min(amortFixa, saldo) : Math.min(pmt - juros, saldo);
    if (amort < 0) amort = 0;
    if (saldo - amort < 0.005) amort = saldo; // fecha o resíduo na última
    if (prazoFixo && k >= nAlvo) amort = saldo; // prazo do banco: a última parcela quita
    const prest = juros + amort;
    saldo = Math.max(0, saldo - amort);

    let extra = 0;
    const exs = byParcela[k];
    if (exs && saldo > 0.005) {
      let tipoUlt = "prazo";
      let banco = null; // último aporte com valores informados pelo banco
      for (const e of exs) {
        const val = Math.min(e.valor, saldo);
        saldo = Math.max(0, saldo - val);
        extra += val;
        tipoUlt = e.tipo;
        if (e.novoSaldo || e.novaParcela || e.novoPrazo) banco = e;
      }
      if (banco && banco.novoSaldo) saldo = banco.novoSaldo;
      if (banco && banco.novoPrazo && saldo > 0.005) {
        nAlvo = k + banco.novoPrazo;
        prazoFixo = true;
        pmt = sac ? 0 : (banco.novaParcela || calcPMT(saldo, taxaMensal, banco.novoPrazo));
        amortFixa = sac ? saldo / banco.novoPrazo : 0;
      } else if (banco && banco.novaParcela && !sac && saldo > 0.005) {
        pmt = banco.novaParcela;
        prazoFixo = false;
        nAlvo = k + projetaMeses(saldo);
      } else if (saldo > 0.005) {
        if (tipoUlt === "parcela") {
          const rem = Math.max(1, nAlvo - k);          // mantém o prazo → recalcula prestação
          pmt = sac ? 0 : calcPMT(saldo, taxaMensal, rem);
          amortFixa = sac ? saldo / rem : 0;
        } else {
          nAlvo = k + projetaMeses(saldo);             // reduz prazo → mantém prestação
        }
      }
    }
    rows.push({ k, pmt: prest, juros, amort, extra, saldo });
    if (saldo <= 0.005) break;
  }
  return rows;
}

// Linhas do fluxo de um empréstimo (com seus aportes extraordinários).
export function emprestimoRows(emp) {
  return amortize(emp.sistema, emp.valorContratado, emp.taxa, emp.parcelas, emp.amortizacoes || []);
}

// Estado atual após `pago` parcelas: saldo, próxima prestação, restantes, prazo final,
// e totais do contrato inteiro (já considerando os aportes).
export function emprestimoEstado(emp, pago) {
  const rows = emprestimoRows(emp);
  const pv = Number(emp.valorContratado) || 0;
  const p = Math.min(rows.length, Math.max(0, pago || 0));
  const saldo = p <= 0 ? pv : rows[p - 1].saldo;
  const proxima = p < rows.length ? rows[p].pmt : 0;
  const totalPago = rows.reduce((s, r) => s + r.pmt + r.extra, 0);
  const totalJuros = rows.reduce((s, r) => s + r.juros, 0);
  return { rows, saldo, proxima, restantes: Math.max(0, rows.length - p), nFinal: rows.length, totalPago, totalJuros };
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

// Dia do mês em que a parcela do empréstimo vence: o informado ou o da 1ª parcela.
export function diaVencimentoEmprestimo(emp) {
  const d = parseInt(emp && emp.diaVencimento, 10);
  if (d >= 1 && d <= 31) return d;
  if (emp && emp.dataPrimeira) {
    const d1 = new Date(`${emp.dataPrimeira}T12:00:00`);
    if (!Number.isNaN(d1.getTime())) return d1.getDate();
  }
  return null;
}

// Parcela do empréstimo que cai em (year, monthIdx): { k, total, valor, data } ou null
// quando o contrato não tem parcela naquele mês. Com data da 1ª parcela, o nº da
// parcela sai do calendário; sem ela, vale a próxima a vencer (parcelas pagas manual).
export function parcelaEmprestimoNoMes(emp, year, monthIdx) {
  const rows = emprestimoRows(emp);
  if (!rows.length) return null;
  const dia = diaVencimentoEmprestimo(emp);
  const ultimoDia = new Date(year, monthIdx + 1, 0).getDate();
  const data = dia ? `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(Math.min(dia, ultimoDia)).padStart(2, "0")}` : null;
  const d1 = emp.dataPrimeira ? new Date(`${emp.dataPrimeira}T12:00:00`) : null;
  if (d1 && !Number.isNaN(d1.getTime())) {
    const k = (year - d1.getFullYear()) * 12 + (monthIdx - d1.getMonth()) + 1;
    if (k < 1 || k > rows.length) return null;
    return { k, total: rows.length, valor: rows[k - 1].pmt, data };
  }
  const p = Math.min(rows.length, Math.max(0, emp.pago || 0));
  if (p >= rows.length) return null;
  return { k: p + 1, total: rows.length, valor: rows[p].pmt, data };
}

// ─── Cartão: mês da 1ª parcela a partir da data real da compra ───────
// `fechamentoDia` é o dia em que a fatura "vira": compra até esse dia entra na
// fatura que fecha no próprio mês; depois dele, na do mês seguinte. A parcela conta
// no mês em que a fatura VENCE — o seguinte ao fechamento quando o vencimento cai
// antes (ou no mesmo dia) do fechamento. Sem vencimento, vale o mês do fechamento.
// Retorna "YYYY-MM-DD" (âncora da 1ª parcela) ou "" se não der para calcular.
export function primeiraParcelaCartao(dataCompraReal, fechamentoDia, vencimentoDia) {
  const fech = parseInt(fechamentoDia, 10);
  if (!dataCompraReal || !(fech >= 1 && fech <= 31)) return "";
  const d = new Date(`${String(dataCompraReal).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const venc = parseInt(vencimentoDia, 10);
  let meses = 0;
  if (d.getDate() > fech) meses += 1;
  if (venc >= 1 && venc <= 31 && venc <= fech) meses += 1;
  const alvo = new Date(d.getFullYear(), d.getMonth() + meses, 1, 12, 0, 0);
  const dia = Math.min(d.getDate(), 28);
  return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function calcDataQuitacao(dataPrimeira, n) {
  if (!dataPrimeira || !n) return "";
  const d = new Date(`${dataPrimeira}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + (n - 1));
  return d.toISOString().split("T")[0];
}
