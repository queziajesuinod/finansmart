// @ts-nocheck
// Painel "Assinaturas & recorrentes": total por mês + lista com valor de cada
// serviço, badge de meses recorrentes e alerta de aumento.
import { C, fmt, tint } from "../lib/constants";
import { Card, Label, STitle, IcoTxt } from "./ui";
import { Smartphone, TrendingUp, RefreshCw } from "../lib/icons.jsx";
import { MerchantIcon } from "../lib/brandIcons.jsx";

export default function AssinaturasPanel({ assinaturas, minMeses = 3, onMinMeses }) {
  const itens = assinaturas?.itens || [];
  if (!itens.length) return null;
  const stepBtn = { width: 24, height: 24, borderRadius: 7, border: `1px solid ${C.border}`, background: "var(--fill-2)", color: C.subtle, cursor: "pointer", fontSize: 15, fontWeight: 800, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center" };
  const totalMes = assinaturas.totalMes || 0;
  const comAumento = itens.filter((i) => i.aumento).length;

  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <STitle style={{ margin: 0 }}><IcoTxt Icon={Smartphone} size={15}>Assinaturas & recorrentes</IcoTxt></STitle>
        <div style={{ textAlign: "right" }}>
          <Label>Por mês</Label>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.violet, letterSpacing: "-0.5px" }}>{fmt(totalMes)}</div>
        </div>
      </div>

      {comAumento > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: tint(C.red, 8), border: `1px solid ${tint(C.red, 20)}`, borderRadius: 9, padding: "8px 11px", marginBottom: 10 }}>
          <TrendingUp size={14} color={C.red} />
          <span style={{ fontSize: 11.5, color: C.subtle }}>{comAumento} assinatura{comAumento > 1 ? "s tiveram" : " teve"} aumento recente.</span>
        </div>
      )}

      {itens.map((s) => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
          <MerchantIcon desc={s.nome} cat={s.categoria} size={17} box={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nome}</div>
            <div style={{ fontSize: 10.5, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
              {s.origem}
              {s.meses > 1 && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><RefreshCw size={10} /> {s.meses} meses</span>}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{fmt(s.valor)}</div>
            {s.aumento && (
              <div style={{ fontSize: 10, fontWeight: 700, color: C.red, display: "inline-flex", alignItems: "center", gap: 3 }}>
                <TrendingUp size={10} /> +{fmt(s.aumento.delta)}
              </div>
            )}
          </div>
        </div>
      ))}

      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
        Detectado automaticamente das faturas importadas e dos lançamentos recorrentes. O valor por mês soma a cobrança mais recente de cada serviço.
      </div>

      {onMinMeses && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>
            Considerar recorrente com mais de <strong style={{ color: C.subtle }}>{minMeses}</strong> {minMeses === 1 ? "mês" : "meses"} de mesmo valor
            <span style={{ display: "block", fontSize: 10, color: C.muted, marginTop: 2 }}>(serviços conhecidos como Netflix, Spotify… entram sempre)</span>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <button onClick={() => onMinMeses(minMeses - 1)} disabled={minMeses <= 1} aria-label="Diminuir meses" style={{ ...stepBtn, opacity: minMeses <= 1 ? 0.4 : 1 }}>−</button>
            <span style={{ fontSize: 13, fontWeight: 800, minWidth: 18, textAlign: "center", color: C.text }}>{minMeses}</span>
            <button onClick={() => onMinMeses(minMeses + 1)} disabled={minMeses >= 12} aria-label="Aumentar meses" style={{ ...stepBtn, opacity: minMeses >= 12 ? 0.4 : 1 }}>+</button>
          </div>
        </div>
      )}
    </Card>
  );
}
