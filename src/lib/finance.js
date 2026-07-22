// @ts-nocheck

export function calcPMT(pv, taxaMensal, n) {
  if (!pv || !n) return 0;
  const i = taxaMensal / 100;
  if (i === 0) return pv / n;
  return (pv * i) / (1 - Math.pow(1 + i, -n));
}

export function calcSaldoDevedor(pv, taxaMensal, n, pago) {
  if (!pv || !n) return 0;
  const i = taxaMensal / 100;
  if (i === 0) return Math.max(0, pv * (1 - pago / n));
  const pmt = calcPMT(pv, taxaMensal, n);
  const k = pago;
  return Math.max(0, pv * Math.pow(1 + i, k) - pmt * (Math.pow(1 + i, k) - 1) / i);
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
