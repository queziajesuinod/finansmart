// @ts-nocheck
import { C, MONTH_NAMES, fmt, fmtPct, entradasDoMes } from "../../lib/constants";
import { Card, Label, Empty, STitle } from "../ui";
import { Calendar } from "../../lib/icons.jsx";
import RendaMembros from "../RendaMembros.jsx";
import { membrosOrdenados, nomeMembro } from "../Membros.jsx";

const fmtNum = (v) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

export default function ReceitasTab({ totalRenda, rendaNum, extraNum, pctMes, pctGasto, membros = [], holerites = [], setHolerites, rendasExtras = [], setRendasExtras, monthIdx, year }) {
  const entradas = entradasDoMes(holerites, rendasExtras, year, monthIdx);
  const temMembros = membrosOrdenados(membros).length > 1;
  const chip = pctGasto > 85 ? { bg: "rgba(255,107,134,.18)", fg: "#FFB3C1", bd: "rgba(255,107,134,.45)" } : pctGasto > 60 ? { bg: "rgba(251,191,36,.18)", fg: "#FFD79A", bd: "rgba(251,191,36,.45)" } : { bg: "rgba(51,214,159,.18)", fg: "#9DF2CF", bd: "rgba(51,214,159,.45)" };
  return (
    <div>
      {/* Hero de renda — cartão wallet com total + splits fixa/extra. */}
      {totalRenda > 0 && (
        <section className="vg-card" style={{ marginBottom: 14 }} aria-label="Renda do mês">
          <svg className="vg-wave" viewBox="0 0 360 210" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="recwv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6A6AFF" stopOpacity=".5" /><stop offset="1" stopColor="#1414C8" stopOpacity=".1" /></linearGradient></defs>
            <path d="M360 0 L232 0 C262 54 196 92 250 140 C280 166 300 190 300 210 L360 210 Z" fill="url(#recwv)" />
            <path d="M360 0 L286 0 C300 46 250 78 300 128 C322 150 338 182 338 210 L360 210 Z" fill="#8080FF" fillOpacity=".16" />
          </svg>
          <div className="vg-sheen" />
          <div className="vg-cnt">
            <div className="vg-top">
              <div className="vg-kic">Renda de {MONTH_NAMES[monthIdx].slice(0, 3)}/{year}</div>
              <span className="vg-chip" style={{ background: chip.bg, color: chip.fg, borderColor: chip.bd }}>{fmtPct(pctGasto)} já usada</span>
            </div>
            <div className="vg-bal"><small>R$</small>{fmtNum(totalRenda)}</div>
            <div className="vg-desc">{entradas.length} entrada{entradas.length === 1 ? "" : "s"} no mês · {fmtPct(pctMes)} do mês concluído</div>
            <div className="vg-splits">
              <div className="vg-split"><div className="l"><span className="vg-dot" style={{ background: "#ADADFF" }} />Fixa (holerites)</div><div className="v">{fmt(rendaNum)}</div></div>
              <div className="vg-split"><div className="l"><span className="vg-dot" style={{ background: "#9DF2CF" }} />Extra</div><div className="v">{fmt(extraNum)}</div></div>
            </div>
          </div>
        </section>
      )}

      {/* Entradas por data */}
      {entradas.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <STitle>Entradas do mês por data</STitle>
          {entradas.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: e.data ? C.accent : C.muted, width: 78, flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5 }}><Calendar size={12} /> {e.data ? new Date(e.data + "T12:00:00").toLocaleDateString("pt-BR").slice(0, 5) : "sem data"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.descricao}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{e.tipo === "holerite" ? "Renda fixa" : "Renda extra"}{temMembros ? ` · ${nomeMembro(e.membroId, membros)}` : ""}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.emerald, flexShrink: 0 }}>+ {fmt(e.valor)}</span>
            </div>
          ))}
        </Card>
      )}

      <RendaMembros membros={membros} holerites={holerites} setHolerites={setHolerites} rendasExtras={rendasExtras} setRendasExtras={setRendasExtras} year={year} monthIdx={monthIdx} />

      {totalRenda === 0 && <Empty icon="" title="Informe sua renda para começar" sub="Cadastre um holerite ou uma renda extra acima." />}
    </div>
  );
}
