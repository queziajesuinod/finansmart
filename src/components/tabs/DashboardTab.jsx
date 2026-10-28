// @ts-nocheck
import { useState, useMemo } from "react";
import { C, MONTH_NAMES, CATEGORIES, fmt, fmtPct, tint } from "../../lib/constants";
import { Card, Label, Badge, Bar, Empty, STitle, Divider } from "../ui";
import { CatIcon, Wallet, ReceiptText, CreditCard, Landmark, ShoppingBag, CircleCheck, TriangleAlert, Siren } from "../../lib/icons.jsx";
import AssinaturasPanel from "../AssinaturasPanel.jsx";

const STATUS_ICON = { superavit: CircleCheck, equilibrado: TriangleAlert, deficit: Siren };
// Chip de status fica SEMPRE sobre o cartão azul escuro → cores claras fixas.
const CHIP = {
  superavit: { bg: "rgba(51,214,159,.18)", fg: "#9DF2CF", bd: "rgba(51,214,159,.45)" },
  equilibrado: { bg: "rgba(251,191,36,.18)", fg: "#FFD79A", bd: "rgba(251,191,36,.45)" },
  deficit: { bg: "rgba(255,107,134,.18)", fg: "#FFB3C1", bd: "rgba(255,107,134,.45)" },
};

const fmtNum = (v) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
const catInfo = (id) => CATEGORIES.find((c) => c.id === id) || { label: "Outros", color: "var(--cat-outros)" };
function diaMes(d) {
  const dt = new Date(String(d || "") + "T12:00:00");
  if (isNaN(dt.getTime())) return "";
  return `${String(dt.getDate()).padStart(2, "0")} ${MONTH_NAMES[dt.getMonth()].slice(0, 3)}`;
}

// Caminhos do gráfico de área a partir de uma série de valores.
function chartPaths(vals, W = 320, H = 118) {
  const n = vals.length;
  if (!n) return { area: "", line: "", last: null };
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const padX = 8, padTop = 14, padBot = 16, innerW = W - padX * 2, innerH = H - padTop - padBot;
  const pts = vals.map((v, i) => [n === 1 ? W / 2 : padX + (i / (n - 1)) * innerW, padTop + (1 - (v - min) / span) * innerH]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[n - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
  return { area, line, last: pts[n - 1] };
}

export default function DashboardTab({ income, setIncome, rendaStr, rendaHerdada, salarioVig, totalRenda, rendaNum, extraNum, rendaManualNum = 0, rendaHoleritesNum = 0, extraManualNum = 0, rendaExtrasMembrosNum = 0, membros = [], holerites = [], setHolerites, rendasExtras = [], setRendasExtras, totalDespesas, despesasLancadas, parcelasMensais, parcelasCartaoMes, faturasCartaoMes, saldoAtual, projecao, pctMes, pctGasto, gastoDiario, statusInfo, porCategoria, totalEmprestimos, parcelVencendoMes, despesas, monthIdx, year, assinaturas, assinMinMeses, onAssinMinMeses, historicoMeses = [], setTab }) {
  const chip = statusInfo ? (CHIP[statusInfo.statusIcon] || CHIP.equilibrado) : null;

  // Série de saldo (renda − despesas) dos últimos meses, para a evolução.
  const serie6 = useMemo(() => (historicoMeses || []).map((m) => ({ label: m.label, saldo: (m.renda || 0) - (m.despesas || 0) })), [historicoMeses]);
  const [range, setRange] = useState("6M");
  const serie = range === "3M" ? serie6.slice(-3) : serie6;
  const vals = serie.map((s) => s.saldo);
  const { area, line, last } = useMemo(() => chartPaths(vals), [range, serie6]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastSaldo = vals.length ? vals[vals.length - 1] : saldoAtual;
  const firstSaldo = vals.length ? vals[0] : 0;
  const delta = firstSaldo ? Math.round(((lastSaldo - firstSaldo) / Math.abs(firstSaldo)) * 100) : 0;

  const txs = useMemo(() => [...(despesas || [])].sort((a, b) => String(b.data || "").localeCompare(String(a.data || ""))).slice(0, 4), [despesas]);

  return (
    <div>
      {/* HERO — cartão-extrato com onda */}
      <section className="vg-card" aria-label="Previsão do mês">
        <svg className="vg-wave" viewBox="0 0 360 210" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="vgwv" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6A6AFF" stopOpacity=".5" />
              <stop offset="1" stopColor="#1414C8" stopOpacity=".1" />
            </linearGradient>
          </defs>
          <path d="M360 0 L232 0 C262 54 196 92 250 140 C280 166 300 190 300 210 L360 210 Z" fill="url(#vgwv)" />
          <path d="M360 0 L286 0 C300 46 250 78 300 128 C322 150 338 182 338 210 L360 210 Z" fill="#8080FF" fillOpacity=".16" />
        </svg>
        <div className="vg-sheen" />
        <div className="vg-cnt">
          <div className="vg-top">
            <div className="vg-kic">Previsão fim de {MONTH_NAMES[monthIdx]}</div>
            {chip && (
              <span className="vg-chip" style={{ background: chip.bg, color: chip.fg, borderColor: chip.bd }}>
                {(() => { const I = STATUS_ICON[statusInfo.statusIcon]; return <I size={13} strokeWidth={2.6} />; })()}
                {statusInfo.label}
              </span>
            )}
          </div>
          <div className="vg-bal" style={projecao < 0 ? { color: "#FFB3C1" } : null}><small>R$</small>{fmtNum(projecao)}</div>
          <div className="vg-desc">{statusInfo ? statusInfo.desc : "Informe sua renda para ver a projeção do mês."}</div>
          <div className="vg-splits">
            <div className="vg-split"><div className="l"><span className="vg-dot" style={{ background: "#9DF2CF" }} />Renda</div><div className="v">{fmt(totalRenda)}</div></div>
            <div className="vg-split"><div className="l"><span className="vg-dot" style={{ background: "#FFD79A" }} />Gasto</div><div className="v">{fmt(totalDespesas)}</div></div>
          </div>
        </div>
      </section>

      <div className="cols-desk">
      {/* EVOLUÇÃO DO SALDO */}
      {serie6.length > 1 && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 2 }}>
            <STitle style={{ marginBottom: 0 }}>Evolução do saldo</STitle>
            <div className="seg" role="group" aria-label="Período">
              <button aria-pressed={range === "3M"} onClick={() => setRange("3M")}>3M</button>
              <button aria-pressed={range === "6M"} onClick={() => setRange("6M")}>6M</button>
            </div>
          </div>
          <div className="vg-chartcap">
            <b style={lastSaldo < 0 ? { color: C.red } : null}>{fmt(lastSaldo)}</b>
            {delta !== 0 && <span style={{ fontSize: 11, fontWeight: 800, color: delta >= 0 ? C.emerald : C.red }}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs. {serie[0]?.label}</span>}
          </div>
          <svg className="vg-chart" viewBox="0 0 320 118" preserveAspectRatio="none" aria-hidden="true" style={{ color: C.muted }}>
            <defs>
              <linearGradient id="vgArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: "var(--primary)", stopOpacity: .35 }} />
                <stop offset="1" style={{ stopColor: "var(--primary)", stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <line x1="0" y1="34" x2="320" y2="34" style={{ stroke: "var(--border)" }} />
            <line x1="0" y1="74" x2="320" y2="74" style={{ stroke: "var(--border)" }} />
            {area && <path d={area} fill="url(#vgArea)" />}
            {line && <path d={line} fill="none" style={{ stroke: "var(--primary)" }} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
            {last && <circle cx={last[0]} cy={last[1]} r="5" style={{ fill: "var(--primary)", stroke: "var(--surface)" }} strokeWidth="2.5" />}
          </svg>
          <div className="vg-xlabels">{serie.map((s, i) => <span key={i}>{s.label}</span>)}</div>
        </Card>
      )}

      {/* TRANSAÇÕES RECENTES */}
      {txs.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <STitle style={{ marginBottom: 0 }}>Transações recentes</STitle>
            {setTab && <button onClick={() => setTab("extrato")} style={{ background: "none", border: 0, color: C.primary, fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>Ver tudo</button>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {txs.map((t) => {
              const ci = catInfo(t.categoria);
              return (
                <div key={t.id} className="tx-row">
                  <span className="ti" style={{ background: tint(ci.color, 16), color: ci.color, borderColor: tint(ci.color, 24) }}><CatIcon id={t.categoria} size={18} /></span>
                  <div className="tm"><b>{t.descricao || ci.label}</b><span>{diaMes(t.data)} · {ci.label}</span></div>
                  <div className="amt" style={{ color: C.text }}>−{fmt(t.valor)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>

      {/* Composição */}
      {(parcelasMensais > 0 || parcelasCartaoMes > 0 || faturasCartaoMes > 0) && totalDespesas > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <STitle>Composição das despesas do mês</STitle>
          {[
            { l: "Lançamentos / gastos variáveis", v: despesasLancadas, c: C.amber, Icon: ReceiptText },
            { l: "Cartão pago no mês", v: faturasCartaoMes, c: C.indigo, Icon: CreditCard },
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
        <div style={{ background: tint(C.cyan, 7), border: `1px solid ${tint(C.cyan, 20)}`, borderRadius: "var(--r-md)", padding: "12px 16px", marginBottom: 14 }}>
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

      {/* Assinaturas & recorrentes (detectadas automaticamente) */}
      <AssinaturasPanel assinaturas={assinaturas} minMeses={assinMinMeses} onMinMeses={onAssinMinMeses} />

      {totalRenda > 0 && despesas.length === 0 && <Empty icon="" title="Nenhuma despesa ainda" sub='Use "Lançamentos" ou importe uma fatura em "Cartões de Crédito".' />}
    </div>
  );
}
