// @ts-nocheck
import { C, fmt } from "../../lib/constants";
import { Card, STitle, IcoTxt } from "../ui";
import { ChartColumn } from "../../lib/icons.jsx";

export default function HistoricoTab({ historicoMeses }) {
  const maxVal = Math.max(...historicoMeses.map((h) => Math.max(h.despesas, h.renda)), 1);
  return (
    <div>
      <Card style={{ marginBottom: 14 }}>
        <STitle><IcoTxt Icon={ChartColumn}>Últimos 6 meses</IcoTxt></STitle>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 140, marginBottom: 8 }}>
          {historicoMeses.map((h, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: 100 }}>
                {h.renda > 0 && <div style={{ flex: 1, background: `color-mix(in srgb, ${C.emerald} 16%, transparent)`, border: `1px solid color-mix(in srgb, ${C.emerald} 25%, transparent)`, borderRadius: "4px 4px 0 0", height: `${(h.renda / maxVal) * 100}%`, minHeight: 4 }} />}
                <div style={{ flex: 1, background: h.despesas > h.renda ? `color-mix(in srgb, ${C.red} 31%, transparent)` : `color-mix(in srgb, ${C.indigo} 31%, transparent)`, border: `1px solid color-mix(in srgb, ${h.despesas > h.renda ? C.red : C.indigo} 31%, transparent)`, borderRadius: "4px 4px 0 0", height: `${(h.despesas / maxVal) * 100}%`, minHeight: 4 }} />
              </div>
              <div style={{ fontSize: 10, color: C.muted, textAlign: "center" }}>{h.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 11, color: C.muted }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: `color-mix(in srgb, ${C.emerald} 31%, transparent)`, marginRight: 4 }} />Renda</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: `color-mix(in srgb, ${C.indigo} 31%, transparent)`, marginRight: 4 }} />Gastos</span>
        </div>
      </Card>
      {historicoMeses.map((h, i) => (
        <div key={i} style={{ background: C.surface, borderRadius: 11, padding: "11px 15px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 13, fontWeight: 600, minWidth: 40 }}>{h.label}</span>
          <div style={{ display: "flex", gap: 18 }}>
            <span style={{ fontSize: 12, color: C.emerald }}>{h.renda > 0 ? fmt(h.renda) : "—"}</span>
            <span style={{ fontSize: 12, color: C.amber }}>{h.despesas > 0 ? fmt(h.despesas) : "—"}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: (h.renda - h.despesas) >= 0 ? C.indigo : C.red }}>{h.renda > 0 || h.despesas > 0 ? fmt(h.renda - h.despesas) : "—"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
