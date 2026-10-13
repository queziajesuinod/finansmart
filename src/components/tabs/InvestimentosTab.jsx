// @ts-nocheck
import { useState } from "react";
import { C, MONTH_NAMES, fmt, genId, todayStr, tint, mesRefDe } from "../../lib/constants";
import { Card, Label, Field, Inp, Sel, Btn, Empty, STitle, IcoTxt, MoneyInput } from "../ui";
import { Pencil, Trash2, Check, Save, TrendingUp, Wallet, PiggyBank, RefreshCw } from "../../lib/icons.jsx";
import { MembroSelect, MembroFilter, pertenceAoMembro, membrosOrdenados, nomeMembro } from "../Membros.jsx";

const TIPOS = [
  { id: "RF", label: "Renda Fixa" },
  { id: "RV", label: "Renda Variável" },
];
const INDEXADORES = [
  { id: "CDI", label: "% do CDI" },
  { id: "SELIC", label: "% da Selic" },
  { id: "IPCA", label: "IPCA + % a.a." },
  { id: "PRE", label: "Prefixado (% a.a.)" },
  { id: "OUTRO", label: "Outro" },
];

const num = (v) => parseFloat(String(v == null ? "" : v).replace(",", ".")) || 0;

// Texto da rentabilidade contratada (só renda fixa). Ex.: "100% do CDI".
function rentabilidade(inv) {
  if (inv.tipo === "RV" || inv.percentual == null || inv.percentual === "") return "";
  const p = String(Number(inv.percentual)).replace(".", ",");
  switch (inv.indexador) {
    case "CDI": return `${p}% do CDI`;
    case "SELIC": return `${p}% da Selic`;
    case "IPCA": return `IPCA + ${p}% a.a.`;
    case "PRE": return `${p}% a.a.`;
    default: return `${p}%`;
  }
}

// "2026-06" → "jun/2026"
function labelMesRef(ref) {
  const [y, m] = String(ref || "").split("-").map(Number);
  if (!y || !m || !MONTH_NAMES[m - 1]) return "";
  return `${MONTH_NAMES[m - 1].slice(0, 3).toLowerCase()}/${y}`;
}

// Saldo vigente em `mesRef`: a última atualização até aquele mês; sem nenhuma, o valor aplicado.
function saldoEm(inv, mesRef) {
  const ate = (inv.historico || []).filter((h) => h.mesRef <= mesRef).sort((a, b) => a.mesRef.localeCompare(b.mesRef));
  return ate.length ? { saldo: Number(ate[ate.length - 1].saldo) || 0, mesRef: ate[ate.length - 1].mesRef } : { saldo: Number(inv.valorAplicado) || 0, mesRef: null };
}

export default function InvestimentosTab({ investimentos = [], setInvestimentos, membros = [], year, monthIdx }) {
  const EMPTY = { instituicao: "", nome: "", tipo: "RF", indexador: "CDI", percentual: "100", valorAplicado: "", dataAplicacao: todayStr(), membroId: null };
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filtroMembro, setFiltroMembro] = useState("todos");
  const [saldoForm, setSaldoForm] = useState({}); // { [id]: valor digitado para o mês }
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const mr = mesRefDe(year, monthIdx);
  const mesLabel = `${MONTH_NAMES[monthIdx]} de ${year}`;
  const isRF = form.tipo !== "RV";

  function submit() {
    const valor = num(form.valorAplicado);
    if (!form.instituicao.trim() || valor <= 0) return;
    const atual = editId ? investimentos.find((v) => v.id === editId) : null;
    const entry = {
      id: editId || genId(),
      instituicao: form.instituicao.trim(),
      nome: (form.nome || "").trim(),
      tipo: isRF ? "RF" : "RV",
      indexador: isRF ? form.indexador : null,
      percentual: isRF && String(form.percentual).trim() !== "" ? num(form.percentual) : null,
      valorAplicado: valor,
      dataAplicacao: form.dataAplicacao || null,
      membroId: form.membroId || null,
      historico: atual ? (atual.historico || []) : [],
    };
    setInvestimentos(editId ? investimentos.map((v) => (v.id === editId ? entry : v)) : [...investimentos, entry]);
    setForm(EMPTY); setEditId(null); setShowForm(false);
  }
  function startEdit(v) {
    setForm({ ...EMPTY, ...v, nome: v.nome || "", indexador: v.indexador || "CDI", percentual: v.percentual == null ? "" : String(v.percentual), valorAplicado: String(v.valorAplicado), dataAplicacao: v.dataAplicacao || "" });
    setEditId(v.id); setShowForm(true);
  }
  function remove(id) { setInvestimentos(investimentos.filter((v) => v.id !== id)); }

  // Atualização mensal: grava (ou substitui) o saldo do mês selecionado no topo.
  function salvarSaldo(inv) {
    const bruto = saldoForm[inv.id];
    if (bruto == null || String(bruto).trim() === "") return;
    const saldo = num(bruto);
    const historico = [...(inv.historico || []).filter((h) => h.mesRef !== mr), { mesRef: mr, saldo }].sort((a, b) => a.mesRef.localeCompare(b.mesRef));
    setInvestimentos(investimentos.map((v) => (v.id === inv.id ? { ...v, historico } : v)));
    setSaldoForm((p) => ({ ...p, [inv.id]: "" }));
  }
  function removerSaldo(inv, mesRef) {
    setInvestimentos(investimentos.map((v) => (v.id === inv.id ? { ...v, historico: (v.historico || []).filter((h) => h.mesRef !== mesRef) } : v)));
  }

  const lista = investimentos.filter((v) => pertenceAoMembro(v, filtroMembro, membros));
  const totalAplicado = lista.reduce((s, v) => s + (Number(v.valorAplicado) || 0), 0);
  const totalSaldo = lista.reduce((s, v) => s + saldoEm(v, mr).saldo, 0);
  const totalRend = totalSaldo - totalAplicado;
  const temMembros = membrosOrdenados(membros).length > 1;

  return (
    <div>
      {investimentos.length > 0 && (
        <div className="stat-grid" style={{ marginBottom: 14 }}>
          {[
            { label: "Total aplicado", value: fmt(totalAplicado), color: C.indigo, Icon: Wallet },
            { label: `Saldo em ${MONTH_NAMES[monthIdx].slice(0, 3)}/${year}`, value: fmt(totalSaldo), color: C.emerald, Icon: PiggyBank },
            { label: "Rendimento", value: fmt(totalRend), color: totalRend >= 0 ? C.emerald : C.red, Icon: TrendingUp },
          ].map((c) => (
            <Card key={c.label} style={{ padding: "12px 13px" }}>
              <div style={{ marginBottom: 6, color: c.color }}><c.Icon size={16} strokeWidth={2} /></div>
              <Label>{c.label}</Label>
              <div style={{ fontSize: 14, fontWeight: 800, color: c.color }}>{c.value}</div>
            </Card>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <STitle style={{ margin: 0 }}><IcoTxt Icon={TrendingUp} size={15}>Meus Investimentos</IcoTxt></STitle>
        <Btn variant="sm" onClick={() => { setShowForm((p) => !p); setEditId(null); setForm(EMPTY); }}>+ Nova aplicação</Btn>
      </div>

      <MembroFilter membros={membros} value={filtroMembro} onChange={setFiltroMembro} />

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <STitle>{editId ? "Editar aplicação" : "Nova aplicação"}</STitle>
          <div className="form-grid-2" style={{ marginBottom: 12 }}>
            <Field label="Instituição Financeira"><Inp placeholder="Ex: Nubank, XP, Caixa..." value={form.instituicao} onChange={f("instituicao")} /></Field>
            <Field label="Aplicação"><Inp placeholder="Ex: CDB, Tesouro Selic, ações..." value={form.nome} onChange={f("nome")} /></Field>
            <Field label="Tipo de Aplicação" span={2}>
              <div style={{ display: "flex", gap: 8 }}>
                {TIPOS.map((t) => {
                  const on = (isRF ? "RF" : "RV") === t.id;
                  return <button key={t.id} type="button" onClick={() => setForm((p) => ({ ...p, tipo: t.id }))} style={{ flex: 1, padding: "9px 12px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 700, border: `1px solid ${on ? C.accent : C.border}`, background: on ? tint(C.accent, 12) : "var(--fill)", color: on ? C.accent : C.subtle }}>{t.label}</button>;
                })}
              </div>
            </Field>
            {isRF && (
              <>
                <Field label="Rentabilidade">
                  <Sel value={form.indexador} onChange={f("indexador")}>
                    {INDEXADORES.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
                  </Sel>
                </Field>
                <Field label={form.indexador === "CDI" || form.indexador === "SELIC" ? "Percentual (%)" : "Taxa (%)"}>
                  <Inp type="number" placeholder={form.indexador === "CDI" || form.indexador === "SELIC" ? "Ex: 100" : "Ex: 6.5"} value={form.percentual} onChange={f("percentual")} />
                </Field>
              </>
            )}
            <Field label="Valor Aplicado (R$)"><MoneyInput placeholder="0,00" value={form.valorAplicado} onChange={f("valorAplicado")} /></Field>
            <Field label="Data da Aplicação"><Inp type="date" value={form.dataAplicacao} onChange={f("dataAplicacao")} /></Field>
          </div>
          <MembroSelect membros={membros} value={form.membroId} onChange={(v) => setForm((p) => ({ ...p, membroId: v }))} label="De quem é esta aplicação?" style={{ marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={submit} style={{ flex: 1 }}>{editId ? <IcoTxt Icon={Save}>Salvar</IcoTxt> : <IcoTxt Icon={Check}>Adicionar</IcoTxt>}</Btn>
            <Btn variant="ghost" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY); }}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {investimentos.length === 0 && !showForm && <Empty icon="" title="Nenhuma aplicação cadastrada" sub='Clique em "+ Nova aplicação" para começar.' />}

      {lista.map((inv) => {
        const atual = saldoEm(inv, mr);
        const aplicado = Number(inv.valorAplicado) || 0;
        const rend = atual.saldo - aplicado;
        const rendPct = aplicado > 0 ? (rend / aplicado) * 100 : 0;
        const rent = rentabilidade(inv);
        const atualizadoNoMes = atual.mesRef === mr;
        const historico = [...(inv.historico || [])].sort((a, b) => b.mesRef.localeCompare(a.mesRef));
        return (
          <Card key={inv.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {inv.instituicao}
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.cyan, background: "color-mix(in srgb, var(--info) 14%, transparent)", padding: "2px 8px", borderRadius: 20 }}>{inv.tipo === "RV" ? "Renda Variável" : "Renda Fixa"}</span>
                  {temMembros && <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, background: "color-mix(in srgb, var(--accent) 12%, transparent)", padding: "2px 8px", borderRadius: 20 }}>{nomeMembro(inv.membroId, membros)}</span>}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{[inv.nome, rent, inv.dataAplicacao ? `aplicado em ${new Date(inv.dataAplicacao + "T12:00:00").toLocaleDateString("pt-BR")}` : ""].filter(Boolean).join(" · ")}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="mini-act" aria-label="Editar" onClick={() => startEdit(inv)} style={{ padding: "6px 9px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, color: C.indigo, cursor: "pointer" }}><Pencil size={14} /></button>
                <button className="mini-act" aria-label="Excluir" onClick={() => remove(inv.id)} style={{ padding: "6px 9px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: C.red, cursor: "pointer" }}><Trash2 size={14} /></button>
              </div>
            </div>

            <div className="stat-grid" style={{ marginBottom: 12 }}>
              {[
                { l: "Valor aplicado", v: fmt(aplicado), c: C.text },
                { l: atual.mesRef ? `Saldo (${labelMesRef(atual.mesRef)})` : "Saldo (sem atualização)", v: fmt(atual.saldo), c: C.emerald },
                { l: "Rendimento", v: `${fmt(rend)} (${rendPct.toFixed(2).replace(".", ",")}%)`, c: rend >= 0 ? C.emerald : C.red },
              ].map((x) => (
                <div key={x.l} style={{ background: "var(--fill-2)", borderRadius: 8, padding: "9px 11px" }}>
                  <Label>{x.l}</Label>
                  <div style={{ fontSize: 13, fontWeight: 700, color: x.c }}>{x.v}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 11, padding: "12px 14px" }}>
              <Label>Atualização mensal · {mesLabel}</Label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                <MoneyInput placeholder={atualizadoNoMes ? String(atual.saldo) : "Saldo atual da aplicação"} value={saldoForm[inv.id] || ""} onChange={(e) => setSaldoForm((p) => ({ ...p, [inv.id]: e.target.value }))} style={{ flex: 1 }} />
                <Btn variant="success" onClick={() => salvarSaldo(inv)}><IcoTxt Icon={RefreshCw}>{atualizadoNoMes ? "Corrigir" : "Atualizar"}</IcoTxt></Btn>
              </div>
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>{atualizadoNoMes ? `Saldo de ${labelMesRef(mr)} já informado.` : "Informe o saldo que aparece no extrato da instituição. Troque o mês no topo para atualizar outro mês."}</div>

              {historico.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {historico.map((h) => (
                    <div key={h.mesRef} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 11.5, color: C.muted, width: 70 }}>{labelMesRef(h.mesRef)}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{fmt(h.saldo)}</span>
                      <button className="mini-act" aria-label="Remover atualização" onClick={() => removerSaldo(inv, h.mesRef)} style={{ marginLeft: "auto", padding: "4px 7px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 7, color: C.red, cursor: "pointer" }}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
