// @ts-nocheck
import { useState } from "react";
import { C, todayStr, fmt, catById } from "../../lib/constants";
import { Card, Field, Inp, Btn, Empty, STitle, IcoTxt } from "../ui";
import { CatIcon, CreditCard, Pencil, Trash2, RefreshCw, Save } from "../../lib/icons.jsx";

export default function ExtratoTab({ despesas, setDespesasMk, totalDespesas, cartoes, monthIdx, year, setTab }) {
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ descricao: "", valor: "", categoria: "outros", data: todayStr(), fixo: false });

  function startEdit(d) { setForm({ descricao: d.descricao, valor: String(d.valor), categoria: d.categoria, data: d.data, fixo: d.fixo || false }); setEditId(d.id); }
  function saveEdit() {
    const val = parseFloat(String(form.valor).replace(",", ".")) || 0;
    if (!form.descricao || val <= 0) return;
    setDespesasMk((p) => p.map((d) => (d.id === editId ? { ...form, valor: val, id: editId } : d)));
    setEditId(null);
  }

  const cartoesMes = (cartoes || []).filter((c) => c.mesRef === `${year}-${monthIdx}`);
  const totalGeral = totalDespesas;

  if (!despesas.length && !cartoesMes.length) return <Empty icon="" title="Extrato vazio" sub='Adicione despesas em "Lançamentos" ou importe uma fatura.' />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 2px" }}>
        <span style={{ fontSize: 12, color: C.muted }}>{despesas.length} lançamento{despesas.length !== 1 ? "s" : ""}{cartoesMes.length > 0 ? ` · ${cartoesMes.length} cartão${cartoesMes.length > 1 ? "es" : ""}` : ""}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.amber }}>{fmt(totalGeral)}</span>
      </div>

      {cartoesMes.map((cartao) => (
        <div key={cartao.id} onClick={() => setTab && setTab("cartoes")} style={{ background: "rgba(99,102,241,0.06)", borderRadius: 13, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, border: `1px solid rgba(99,102,241,0.2)`, cursor: "pointer" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `var(--accent)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CreditCard size={18} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{cartao.nome}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Fatura · {cartao.compras.length} compras · toque para ver detalhes</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--danger)", flexShrink: 0 }}>- {fmt(cartao.total)}</div>
        </div>
      ))}

      {editId && (
        <Card style={{ marginBottom: 12 }}>
          <STitle>Editar lançamento</STitle>
          <div style={{ display: "grid", gap: 10 }}>
            <Field label="Descrição"><Inp value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Valor"><Inp type="number" value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} /></Field>
              <Field label="Data"><Inp type="date" value={form.data} onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))} /></Field>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={saveEdit}><IcoTxt Icon={Save}>Salvar</IcoTxt></Btn>
              <Btn variant="ghost" onClick={() => setEditId(null)}>Cancelar</Btn>
            </div>
          </div>
        </Card>
      )}

      {[...despesas].sort((a, b) => new Date(b.data) - new Date(a.data)).map((d) => {
        const cat = catById(d.categoria);
        return (
          <div key={d.id} style={{ background: C.surface, borderRadius: 13, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, border: `1px solid ${C.border}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `color-mix(in srgb, ${cat.color} 10%, transparent)`, color: cat.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CatIcon id={cat.id} size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.descricao}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>{cat.label} · {new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR")}{d.fixo ? <><span>·</span><RefreshCw size={10} /></> : ""}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--danger)", marginBottom: 4 }}>- {fmt(d.valor)}</div>
              <div style={{ display: "flex", gap: 4 }}>
                <button aria-label="Editar" onClick={() => startEdit(d)} style={{ padding: "5px 8px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, color: "var(--accent)", cursor: "pointer", display: "inline-flex" }}><Pencil size={13} /></button>
                <button aria-label="Excluir" onClick={() => setDespesasMk((p) => p.filter((x) => x.id !== d.id))} style={{ padding: "5px 8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: C.red, cursor: "pointer", display: "inline-flex" }}><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
