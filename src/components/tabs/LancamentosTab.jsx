// @ts-nocheck
import { useState } from "react";
import { C, CATEGORIES, todayStr, genId, fmt, tint } from "../../lib/constants";
import { Card, Label, Field, Inp, Btn, STitle, IcoTxt, MoneyInput } from "../ui";
import { CatIcon, Plus, Pencil, Check, Save, Trash2 } from "../../lib/icons.jsx";
import { MerchantIcon } from "../../lib/brandIcons.jsx";
import { MembroSelect } from "../Membros.jsx";

const catInfo = (id) => CATEGORIES.find((c) => c.id === id) || { label: "Outros", color: "var(--cat-outros)" };
function diaMes(d) {
  const dt = new Date(String(d || "") + "T12:00:00");
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("pt-BR").slice(0, 5);
}

export default function LancamentosTab({ despesas, setDespesasMk, membros = [] }) {
  const EMPTY = { descricao: "", valor: "", categoria: "outros", data: todayStr(), fixo: false, membroId: null };
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  function startEdit(d) { setForm({ descricao: d.descricao, valor: d.valor, categoria: d.categoria, data: d.data, fixo: !!d.fixo, membroId: d.membroId || null }); setEditId(d.id); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); }
  function remove(id) { setDespesasMk((p) => p.filter((d) => d.id !== id)); if (editId === id) { setEditId(null); setForm(EMPTY); } }

  function submit() {
    const val = parseFloat(String(form.valor).replace(",", ".")) || 0;
    if (!form.descricao || val <= 0) return;
    const entry = { ...form, valor: val, id: editId || genId() };
    if (editId) { setDespesasMk((p) => p.map((d) => (d.id === editId ? entry : d))); setEditId(null); }
    else setDespesasMk((p) => [...p, entry]);
    setForm({ descricao: "", valor: "", categoria: "outros", data: todayStr(), fixo: false, membroId: null });
  }

  return (
    <div>
    <Card>
      <STitle>{editId ? <IcoTxt Icon={Pencil}>Editar despesa</IcoTxt> : <IcoTxt Icon={Plus}>Nova despesa</IcoTxt>}</STitle>
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="Descrição">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MerchantIcon desc={form.descricao} cat={form.categoria} size={16} box={30} />
            <Inp placeholder="Ex: Mercado, Netflix, Aluguel..." value={form.descricao} onChange={f("descricao")} style={{ flex: 1 }} />
          </div>
        </Field>
        <div className="form-grid-2">
          <Field label="Valor (R$)"><MoneyInput placeholder="0,00" value={form.valor} onChange={f("valor")} /></Field>
          <Field label="Data"><Inp type="date" value={form.data} onChange={f("data")} /></Field>
        </div>
        <Field label="Categoria">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
            {CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => setForm((p) => ({ ...p, categoria: cat.id }))} style={{ padding: "9px 4px", borderRadius: 9, border: `2px solid ${form.categoria === cat.id ? cat.color : "transparent"}`, background: form.categoria === cat.id ? `color-mix(in srgb, ${cat.color} 9%, transparent)` : "var(--fill-2)", cursor: "pointer", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ color: form.categoria === cat.id ? cat.color : C.subtle, display: "inline-flex" }}><CatIcon id={cat.id} size={18} /></span>
                <div style={{ fontSize: 9, color: form.categoria === cat.id ? cat.color : C.muted, fontWeight: 700 }}>{cat.label}</div>
              </button>
            ))}
          </div>
        </Field>
        <MembroSelect membros={membros} value={form.membroId} onChange={(v) => setForm((p) => ({ ...p, membroId: v }))} label="De quem é este gasto?" />
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={form.fixo} onChange={(e) => setForm((p) => ({ ...p, fixo: e.target.checked }))} />
          <span style={{ fontSize: 12, color: C.subtle }}>Despesa fixa / recorrente</span>
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={submit} style={{ flex: 1 }}>{editId ? <IcoTxt Icon={Save}>Salvar</IcoTxt> : <IcoTxt Icon={Check}>Adicionar</IcoTxt>}</Btn>
          {editId && <Btn variant="ghost" onClick={() => { setEditId(null); setForm(EMPTY); }}>Cancelar</Btn>}
        </div>
      </div>
    </Card>

    {despesas.length > 0 && (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 10px" }}>
          <STitle style={{ margin: 0 }}>Lançamentos deste mês</STitle>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{despesas.length} no total</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...despesas].reverse().slice(0, 10).map((d) => {
            const ci = catInfo(d.categoria);
            return (
              <div key={d.id} className="tx-row">
                <span className="ti" style={{ background: tint(ci.color, 16), color: ci.color, borderColor: tint(ci.color, 24) }}><CatIcon id={d.categoria} size={18} /></span>
                <div className="tm"><b>{d.descricao}</b><span>{diaMes(d.data)} · {ci.label}{d.fixo ? " · fixa" : ""}</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                  <span className="amt" style={{ color: C.text }}>−{fmt(d.valor)}</span>
                  <button className="mini-act" aria-label="Editar" onClick={() => startEdit(d)} style={{ padding: "6px 8px", background: tint(C.accent, 12), border: `1px solid ${tint(C.accent, 24)}`, borderRadius: "var(--r-sm)", color: C.accent, cursor: "pointer" }}><Pencil size={13} /></button>
                  <button className="mini-act" aria-label="Excluir" onClick={() => remove(d.id)} style={{ padding: "6px 8px", background: tint(C.red, 10), border: `1px solid ${tint(C.red, 22)}`, borderRadius: "var(--r-sm)", color: C.red, cursor: "pointer" }}><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </>
    )}
    </div>
  );
}
