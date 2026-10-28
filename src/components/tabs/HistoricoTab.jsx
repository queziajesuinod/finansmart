// @ts-nocheck
import { C, fmt } from "../../lib/constants";
import { Card, STitle, IcoTxt } from "../ui";
import { ChartColumn } from "../../lib/icons.jsx";

// Caminhos (linha + área) de uma série, escalada de 0 ao máximo comum.
function paths(vals, maxV, W = 320, H = 120) {
  const n = vals.length;
  if (!n) return { line: "", area: "", last: null };
  const padX = 8, padTop = 12, padBot = 18, innerW = W - padX * 2, innerH = H - padTop - padBot;
  const pts = vals.map((v, i) => [n === 1 ? W / 2 : padX + (i / (n - 1)) * innerW, padTop + (1 - (v / (maxV || 1))) * innerH]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[n - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
  return { line, area, last: pts[n - 1] };
}

export default function HistoricoTab({ historicoMeses }) {
  const maxVal = Math.max(...historicoMeses.map((h) => Math.max(h.despesas, h.renda)), 1);
  const R = paths(historicoMeses.map((h) => h.renda), maxVal);
  const D = paths(historicoMeses.map((h) => h.despesas), maxVal);
  return (
    <div>
      <Card style={{ marginBottom: 14 }}>
        <STitle><IcoTxt Icon={ChartColumn}>Renda × Gastos · últimos 6 meses</IcoTxt></STitle>
        <svg className="vg-chart" style={{ height: 150, color: C.muted }} viewBox="0 0 320 120" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="hRenda" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--success)", stopOpacity: .28 }} />
              <stop offset="1" style={{ stopColor: "var(--success)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <line x1="0" y1="34" x2="320" y2="34" style={{ stroke: "var(--border)" }} />
          <line x1="0" y1="68" x2="320" y2="68" style={{ stroke: "var(--border)" }} />
          {R.area && <path d={R.area} fill="url(#hRenda)" />}
          {R.line && <path d={R.line} fill="none" style={{ stroke: "var(--success)" }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          {D.line && <path d={D.line} fill="none" style={{ stroke: "var(--warning)" }} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" />}
          {R.last && <circle cx={R.last[0]} cy={R.last[1]} r="4" style={{ fill: "var(--success)", stroke: "var(--surface)" }} strokeWidth="2" />}
          {D.last && <circle cx={D.last[0]} cy={D.last[1]} r="4" style={{ fill: "var(--warning)", stroke: "var(--surface)" }} strokeWidth="2" />}
        </svg>
        <div className="vg-xlabels">{historicoMeses.map((h, i) => <span key={i}>{h.label}</span>)}</div>
        <div style={{ display: "flex", gap: 18, fontSize: 11, color: C.muted, marginTop: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 15, height: 3, borderRadius: 2, background: C.emerald, display: "inline-block" }} /> Renda</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 15, height: 3, borderRadius: 2, background: C.amber, display: "inline-block" }} /> Gastos</span>
        </div>
      </Card>

      {historicoMeses.map((h, i) => {
        const saldo = h.renda - h.despesas;
        const temDado = h.renda > 0 || h.despesas > 0;
        return (
          <div key={i} style={{ background: C.surface, borderRadius: "var(--r-lg)", padding: "12px 15px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, border: `1px solid ${C.border}`, boxShadow: "var(--shadow-sm), var(--edge)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, minWidth: 40 }}>{h.label}</span>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: C.emerald, fontWeight: 700 }}>{h.renda > 0 ? fmt(h.renda) : "—"}</span>
              <span style={{ fontSize: 12, color: C.amber, fontWeight: 700 }}>{h.despesas > 0 ? fmt(h.despesas) : "—"}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: saldo >= 0 ? C.primary : C.red, minWidth: 82, textAlign: "right" }}>{temDado ? fmt(saldo) : "—"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
