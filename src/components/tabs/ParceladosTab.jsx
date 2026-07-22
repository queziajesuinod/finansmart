// @ts-nocheck
import { useState } from "react";
import { C, CATEGORIES, todayStr, fmt, genId, catById } from "../../lib/constants";
import { Card, Label, Field, Inp, Sel, Btn, Badge, Bar, Empty, STitle, Divider, IcoTxt } from "../ui";
import { CatIcon, Pencil, Trash2, Save, Check, ShoppingBag, Flag, Siren } from "../../lib/icons.jsx";

export default function ParceladosTab({ parcelados, setParcelados, year, monthIdx }) {
  const EMPTY = { descricao: "", valorTotal: "", totalParcelas: "", parcelaAtual: "1", dataCompra: todayStr(), categoria: "outros" };
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const valorTotal = parseFloat((form.valorTotal || "").replace(",", ".")) || 0;
  const n = parseInt(form.totalParcelas) || 0;
  const pAtual = parseInt(form.parcelaAtual) || 1;
  const valorParcela = n > 0 ? valorTotal / n : 0;

  function getStatus(p) {
    const inicio = new Date(p.dataCompra + "T12:00:00");
    const fimMes = new Date(inicio); fimMes.setMonth(fimMes.getMonth() + p.totalParcelas - 1);
    const hoje = new Date(year, monthIdx, 1);
    if (fimMes < hoje) return { label: "Quitado", color: C.emerald };
    const mesAtualCompra = Math.floor((new Date(year, monthIdx, 1) - inicio) / (1000 * 60 * 60 * 24 * 30)) + 1;
    const parcRestante = Math.max(0, p.totalParcelas - mesAtualCompra + 1);
    return { label: `${parcRestante} restante${parcRestante !== 1 ? "s" : ""}`, color: C.cyan };
  }
  function getParcelaAtualNum(p) {
    const inicio = new Date(p.dataCompra + "T12:00:00");
    const diff = Math.floor((new Date(year, monthIdx, 1) - inicio) / (1000 * 60 * 60 * 24 * 30)) + 1;
    return Math.min(p.totalParcelas, Math.max(1, diff));
  }

  function submit() {
    if (!form.descricao || !valorTotal || !n) return;
    const entry = { ...form, valorTotal, totalParcelas: n, parcelaAtual: pAtual, valorParcela, id: editId || genId() };
    if (editId) setParcelados(parcelados.map((p) => (p.id === editId ? entry : p)));
    else setParcelados([...parcelados, entry]);
    setForm(EMPTY); setEditId(null); setShowForm(false);
  }
  function startEdit(p) { setForm({ ...p, valorTotal: String(p.valorTotal), totalParcelas: String(p.totalParcelas), parcelaAtual: String(p.parcelaAtual) }); setEditId(p.id); setShowForm(true); }

  const ativas = parcelados.filter((p) => { const ini = new Date(p.dataCompra + "T12:00:00"); const fim = new Date(ini); fim.setMonth(fim.getMonth() + p.totalParcelas - 1); return fim >= new Date(year, monthIdx, 1); });
  const quitadas = parcelados.filter((p) => { const ini = new Date(p.dataCompra + "T12:00:00"); const fim = new Date(ini); fim.setMonth(fim.getMonth() + p.totalParcelas - 1); return fim < new Date(year, monthIdx, 1); });
  const totalMes = ativas.reduce((s, p) => s + p.valorParcela, 0);

  return (
    <div>
      {ativas.length > 0 && (
        <Card style={{ marginBottom: 14, background: "rgba(6,182,212,0.05)", border: `1px solid rgba(6,182,212,0.15)` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <Label>Total em parcelas este mês</Label>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.cyan, letterSpacing: "-0.8px" }}>{fmt(totalMes)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.muted }}>{ativas.length} compra{ativas.length !== 1 ? "s" : ""} ativa{ativas.length !== 1 ? "s" : ""}</div>
              {parcelados.filter((p) => { const ini = new Date(p.dataCompra + "T12:00:00"); const fim = new Date(ini); fim.setMonth(fim.getMonth() + p.totalParcelas - 1); return fim.getFullYear() === year && fim.getMonth() === monthIdx; }).length > 0 && (
                <Badge label="parcelas encerrando este mês" color={C.amber} Icon={Siren} />
              )}
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <STitle style={{ margin: 0 }}><IcoTxt Icon={ShoppingBag} size={15}>Compras Parceladas</IcoTxt></STitle>
        <Btn variant="sm" onClick={() => { setShowForm((p) => !p); setEditId(null); setForm(EMPTY); }}>+ Nova compra</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <STitle>{editId ? "Editar" : "Nova compra parcelada"}</STitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Descrição" span={2}><Inp placeholder="Ex: TV Samsung, Curso..." value={form.descricao} onChange={f("descricao")} /></Field>
            <Field label="Valor Total (R$)"><Inp type="number" placeholder="0,00" value={form.valorTotal} onChange={f("valorTotal")} /></Field>
            <Field label="Total de Parcelas"><Inp type="number" placeholder="Ex: 12" value={form.totalParcelas} onChange={f("totalParcelas")} /></Field>
            <Field label="Parcela Atual"><Inp type="number" placeholder="1" value={form.parcelaAtual} onChange={f("parcelaAtual")} /></Field>
            <Field label="Data da Compra"><Inp type="date" value={form.dataCompra} onChange={f("dataCompra")} /></Field>
            <Field label="Categoria" span={2}>
              <Sel value={form.categoria} onChange={f("categoria")}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </Sel>
            </Field>
          </div>
          {valorTotal > 0 && n > 0 && (
            <div style={{ background: "rgba(6,182,212,0.07)", border: `1px solid rgba(6,182,212,0.2)`, borderRadius: 10, padding: "12px", marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[{ l: "Parcela Mensal", v: fmt(valorParcela), c: C.cyan }, { l: "Total da Compra", v: fmt(valorTotal), c: C.text }, { l: "Parcelas Restantes", v: Math.max(0, n - pAtual + 1), c: C.amber }].map((x) => (
                  <div key={x.l} style={{ background: "var(--fill-2)", borderRadius: 8, padding: "9px" }}>
                    <Label>{x.l}</Label>
                    <div style={{ fontSize: 14, fontWeight: 800, color: x.c }}>{x.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={submit} style={{ flex: 1 }}>{editId ? <IcoTxt Icon={Save}>Salvar</IcoTxt> : <IcoTxt Icon={Check}>Adicionar</IcoTxt>}</Btn>
            <Btn variant="ghost" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY); }}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {parcelados.length === 0 && !showForm && <Empty icon="" title="Nenhuma compra parcelada" sub='Clique em "+ Nova compra" para registrar.' />}

      {ativas.length > 0 && <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ativas ({ativas.length})</div>}
      {ativas.map((p) => {
        const cat = catById(p.categoria);
        const st = getStatus(p);
        const curParcela = getParcelaAtualNum(p);
        const pct = p.totalParcelas > 0 ? (curParcela / p.totalParcelas) * 100 : 0;
        const ini = new Date(p.dataCompra + "T12:00:00");
        const fim = new Date(ini); fim.setMonth(fim.getMonth() + p.totalParcelas - 1);
        const encerrando = fim.getFullYear() === year && fim.getMonth() === monthIdx;
        return (
          <Card key={p.id} style={{ marginBottom: 10, border: encerrando ? `1px solid rgba(245,158,11,0.35)` : undefined }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `color-mix(in srgb, ${cat.color} 10%, transparent)`, color: cat.color, display: "flex", alignItems: "center", justifyContent: "center" }}><CatIcon id={cat.id} size={18} /></div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{p.descricao}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{cat.label} · Compra: {new Date(p.dataCompra + "T12:00:00").toLocaleDateString("pt-BR")}{p.origem ? ` · ${p.origem}` : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                <button aria-label="Editar" onClick={() => startEdit(p)} style={{ padding: "6px 8px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, color: C.indigo, cursor: "pointer", display: "inline-flex" }}><Pencil size={13} /></button>
                <button aria-label="Excluir" onClick={() => setParcelados(parcelados.filter((x) => x.id !== p.id))} style={{ padding: "6px 8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: C.red, cursor: "pointer", display: "inline-flex" }}><Trash2 size={13} /></button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 10 }}>
              {[{ l: "Parcela Mensal", v: fmt(p.valorParcela), c: C.cyan }, { l: "Valor Total", v: fmt(p.valorTotal), c: C.text }, { l: "Parc. atual (est.)", v: `${curParcela}/${p.totalParcelas}`, c: C.indigo }, { l: "Encerra", v: fim.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }), c: encerrando ? C.amber : C.muted }].map((x) => (
                <div key={x.l} style={{ background: "var(--fill-2)", borderRadius: 8, padding: "8px 10px" }}>
                  <Label>{x.l}</Label>
                  <div style={{ fontSize: 12, fontWeight: 700, color: x.c }}>{x.v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginBottom: 4 }}>
                <span>Progresso</span><span><Badge label={st.label} color={st.color} /></span>
              </div>
              <Bar pct={pct} color={encerrando ? C.amber : C.cyan} h={6} />
            </div>
            {encerrando && <div style={{ fontSize: 11, color: C.amber, marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}><Flag size={12} /> Última parcela este mês!</div>}
          </Card>
        );
      })}

      {quitadas.length > 0 && (
        <>
          <Divider />
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Quitadas ({quitadas.length})</div>
          {quitadas.map((p) => (
            <div key={p.id} style={{ background: "rgba(16,185,129,0.04)", border: `1px solid rgba(16,185,129,0.12)`, borderRadius: 11, padding: "10px 14px", marginBottom: 7, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.subtle }}>{p.descricao}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{p.totalParcelas}x de {fmt(p.valorParcela)} · {fmt(p.valorTotal)} total</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Badge label="Quitado" color={C.emerald} />
                <button aria-label="Excluir" onClick={() => setParcelados(parcelados.filter((x) => x.id !== p.id))} style={{ padding: "5px 7px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 6, color: C.red, cursor: "pointer", display: "inline-flex" }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
