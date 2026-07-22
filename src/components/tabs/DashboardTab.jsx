// @ts-nocheck
import { C, MONTH_NAMES, fmt, fmtPct } from "../../lib/constants";
import { Card, Label, Badge, Bar, Empty, STitle, Divider } from "../ui";
import { CatIcon, Wallet, TrendingDown, PiggyBank, Scale, ReceiptText, CreditCard, Landmark, ShoppingBag, RefreshCw, Undo2, CircleCheck, TriangleAlert, Siren } from "../../lib/icons.jsx";

const STATUS_ICON = { superavit: CircleCheck, equilibrado: TriangleAlert, deficit: Siren };

export default function DashboardTab({ income, setIncome, rendaStr, rendaHerdada, salarioVig, totalRenda, rendaNum, extraNum, totalDespesas, despesasLancadas, parcelasMensais, parcelasCartaoMes, faturasCartaoMes, saldoAtual, projecao, pctMes, pctGasto, gastoDiario, statusInfo, porCategoria, totalEmprestimos, parcelVencendoMes, despesas, monthIdx }) {
  const salarioLabel = salarioVig && salarioVig.mes != null ? `${MONTH_NAMES[salarioVig.mes].slice(0, 3)}/${salarioVig.ano}` : "";
  return (
    <div>
      {/* Renda */}
      <Card style={{ marginBottom: 14 }}>
        <STitle>Renda de {MONTH_NAMES[monthIdx]}</STitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Salário / Renda fixa — herda o mês anterior automaticamente */}
          <div>
            <Label>Salário / Renda fixa</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: C.indigo, fontWeight: 700, fontSize: 13 }}>R$</span>
              <input type="number" placeholder="0,00" value={rendaStr} onChange={(e) => setIncome("renda", e.target.value)} style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 22, fontWeight: 800, color: rendaHerdada ? C.subtle : C.text }} />
            </div>
            {rendaHerdada ? (
              <div style={{ fontSize: 10, color: C.muted, marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}><RefreshCw size={11} /> mantido de {salarioLabel} · recebeu aumento? é só digitar o novo valor</div>
            ) : (salarioVig && salarioVig.valor !== "" ? (
              <div onClick={() => setIncome("renda", "")} style={{ fontSize: 10, color: C.accent, cursor: "pointer", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5 }}><Undo2 size={11} /> voltar a herdar de {salarioLabel}</div>
            ) : null)}
          </div>
          {/* Renda extra — variável, por mês */}
          <div>
            <Label>Renda extra</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: C.emerald, fontWeight: 700, fontSize: 13 }}>R$</span>
              <input type="number" placeholder="0,00" value={income.extra} onChange={(e) => setIncome("extra", e.target.value)} style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 22, fontWeight: 800, color: C.text }} />
            </div>
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

      {/* Previsão */}
      {statusInfo && (
        <div style={{ background: statusInfo.bg, border: `1px solid color-mix(in srgb, ${statusInfo.color} 16%, transparent)`, borderRadius: 16, padding: "16px 18px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Previsão fim de {MONTH_NAMES[monthIdx]}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: projecao >= 0 ? C.text : C.red, letterSpacing: "-1px" }}>{fmt(projecao)}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{statusInfo.desc}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Badge label={statusInfo.label} color={statusInfo.color} Icon={STATUS_ICON[statusInfo.statusIcon]} />
            {despesas.length > 0 && <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>≈ {fmt(gastoDiario)}/dia projetado</div>}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Renda Total", value: fmt(totalRenda), color: C.emerald, Icon: Wallet, sub: extraNum > 0 ? `Fixo ${fmt(rendaNum)}` : undefined },
          { label: "Total Gasto", value: fmt(totalDespesas), color: C.amber, Icon: TrendingDown, sub: `${fmtPct(pctGasto)} da renda` },
          { label: "Saldo Atual", value: fmt(saldoAtual), color: saldoAtual >= 0 ? C.indigo : C.red, Icon: PiggyBank },
          { label: "Dívidas (saldo)", value: fmt(totalEmprestimos), color: C.rose, Icon: Scale, sub: parcelasMensais > 0 ? `${fmt(parcelasMensais)}/mês` : undefined },
        ].map((c) => (
          <Card key={c.label} style={{ padding: "13px 14px" }}>
            <div style={{ marginBottom: 7, color: c.color }}><c.Icon size={18} strokeWidth={2} /></div>
            <Label>{c.label}</Label>
            <div style={{ fontSize: 14, fontWeight: 800, color: c.color, letterSpacing: "-0.5px" }}>{c.value}</div>
            {c.sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{c.sub}</div>}
          </Card>
        ))}
      </div>

      {/* Composição */}
      {(parcelasMensais > 0 || parcelasCartaoMes > 0 || faturasCartaoMes > 0) && totalDespesas > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <STitle>Composição das despesas do mês</STitle>
          {[
            { l: "Lançamentos / gastos variáveis", v: despesasLancadas, c: C.amber, Icon: ReceiptText },
            { l: "Faturas de cartão", v: faturasCartaoMes, c: C.indigo, Icon: CreditCard },
            { l: "Parcelas de empréstimos", v: parcelasMensais, c: C.rose, Icon: Landmark },
            { l: "Parcelas avulsas", v: parcelasCartaoMes, c: C.cyan, Icon: ShoppingBag },
          ].filter((x) => x.v > 0).map((x) => (
            <div key={x.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: C.subtle, display: "flex", alignItems: "center", gap: 8 }}><x.Icon size={14} color={x.c} strokeWidth={2} /> {x.l}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: x.c }}>{fmt(x.v)}</span>
            </div>
          ))}
          <Divider />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Total de despesas</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.amber }}>{fmt(totalDespesas)}</span>
          </div>
        </Card>
      )}

      {parcelVencendoMes.length > 0 && (
        <div style={{ background: "rgba(6,182,212,0.07)", border: `1px solid rgba(6,182,212,0.2)`, borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.cyan, marginBottom: 6 }}>Parcelamentos encerrando este mês</div>
          {parcelVencendoMes.map((p) => <div key={p.id} style={{ fontSize: 12, color: C.subtle, marginBottom: 3 }}>• {p.descricao} — parcela de {fmt(p.valorParcela)} ({p.totalParcelas}x)</div>)}
        </div>
      )}

      {/* Categorias */}
      {porCategoria.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <STitle>Gastos por categoria</STitle>
          {porCategoria.map((cat) => (
            <div key={cat.id} style={{ marginBottom: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><CatIcon id={cat.id} size={16} color={cat.color} /> {cat.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, color: C.muted }}>{totalRenda > 0 ? fmtPct(cat.total / totalRenda * 100) : "—"}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: cat.color }}>{fmt(cat.total)}</span>
                </div>
              </div>
              <Bar pct={totalRenda > 0 ? cat.total / totalRenda * 100 : 0} color={cat.color} />
            </div>
          ))}
        </Card>
      )}

      {totalRenda === 0 && <Empty icon="" title="Informe sua renda para começar" sub="Preencha o campo de renda acima." />}
      {totalRenda > 0 && despesas.length === 0 && <Empty icon="" title="Nenhuma despesa ainda" sub='Use "Lançamentos" ou "Importar PDF".' />}
    </div>
  );
}
