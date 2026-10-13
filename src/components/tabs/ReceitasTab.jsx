// @ts-nocheck
import { C, MONTH_NAMES, fmt, fmtPct, entradasDoMes } from "../../lib/constants";
import { Card, Label, Empty, STitle } from "../ui";
import { Wallet, Calendar } from "../../lib/icons.jsx";
import RendaMembros from "../RendaMembros.jsx";
import { membrosOrdenados, nomeMembro } from "../Membros.jsx";

export default function ReceitasTab({ totalRenda, rendaNum, extraNum, pctMes, pctGasto, membros = [], holerites = [], setHolerites, rendasExtras = [], setRendasExtras, monthIdx, year }) {
  const entradas = entradasDoMes(holerites, rendasExtras, year, monthIdx);
  const temMembros = membrosOrdenados(membros).length > 1;
  return (
    <div>
      {/* Renda */}
      <Card style={{ marginBottom: 14 }}>
        <STitle>Renda de {MONTH_NAMES[monthIdx]} de {year}</STitle>
        {/* Renda é só VISUALIZAÇÃO — entra pelo cadastro abaixo (holerites e rendas extras). */}
        <div className="income-grid">
          <div>
            <Label>Renda fixa (holerites)</Label>
            <div className="money-field">
              <span style={{ color: C.indigo, fontWeight: 700, fontSize: 13 }}>R$</span>
              <span style={{ flex: 1, fontSize: 22, fontWeight: 800, color: rendaNum > 0 ? C.text : C.muted }}>{fmt(rendaNum).replace(/^R\$\s*/, "")}</span>
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}><Wallet size={11} /> Atualize pelos holerites no cadastro abaixo.</div>
          </div>
          <div>
            <Label>Renda extra</Label>
            <div className="money-field">
              <span style={{ color: C.emerald, fontWeight: 700, fontSize: 13 }}>R$</span>
              <span style={{ flex: 1, fontSize: 22, fontWeight: 800, color: extraNum > 0 ? C.text : C.muted }}>{fmt(extraNum).replace(/^R\$\s*/, "")}</span>
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}><Wallet size={11} /> Atualize nas rendas extras abaixo (pode adicionar várias).</div>
          </div>
        </div>
        {totalRenda > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginBottom: 5 }}>
              <span>Mês — {fmtPct(pctMes)} concluído</span>
              <span>Gastos — {fmtPct(pctGasto)} da renda</span>
            </div>
            <div style={{ position: "relative", height: 7, background: "var(--fill)", borderRadius: 999 }}>
              <div style={{ position: "absolute", height: "100%", width: `${Math.min(100, pctMes)}%`, background: "var(--track)", borderRadius: 999 }} />
              <div style={{ position: "absolute", height: "100%", width: `${Math.min(100, pctGasto)}%`, background: pctGasto > 85 ? C.red : C.accent, borderRadius: 999, transition: "width .5s" }} />
            </div>
          </div>
        )}
      </Card>

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
