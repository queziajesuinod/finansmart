// @ts-nocheck
import { useState } from "react";
import { C, CATEGORIES, todayStr, genId } from "../../lib/constants";
import { Card, Label, Field, Inp, Btn, STitle, IcoTxt, MoneyInput } from "../ui";
import { CatIcon, Plus, Pencil, Check, Save } from "../../lib/icons.jsx";
import { MerchantIcon } from "../../lib/brandIcons.jsx";

export default function LancamentosTab({ despesas, setDespesasMk }) {
  const [form, setForm] = useState({ descricao: "", valor: "", categoria: "outros", data: todayStr(), fixo: false });
  const [editId, setEditId] = useState(null);
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function submit() {
    const val = parseFloat(String(form.valor).replace(",", ".")) || 0;
    if (!form.descricao || val <= 0) return;
    const entry = { ...form, valor: val, id: editId || genId() };
    if (editId) { setDespesasMk((p) => p.map((d) => (d.id === editId ? entry : d))); setEditId(null); }
    else setDespesasMk((p) => [...p, entry]);
    setForm({ descricao: "", valor: "", categoria: "outros", data: todayStr(), fixo: false });
  }

  return (
    <Card>
      <STitle>{editId ? <IcoTxt Icon={Pencil}>Editar despesa</IcoTxt> : <IcoTxt Icon={Plus}>Nova despesa</IcoTxt>}</STitle>
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="Descrição">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MerchantIcon desc={form.descricao} cat={form.categoria} size={16} box={30} />
            <Inp placeholder="Ex: Mercado, Netflix, Aluguel..." value={form.descricao} onChange={f("descricao")} style={{ flex: 1 }} />
          </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={form.fixo} onChange={(e) => setForm((p) => ({ ...p, fixo: e.target.checked }))} />
          <span style={{ fontSize: 12, color: C.subtle }}>Despesa fixa / recorrente</span>
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={submit} style={{ flex: 1 }}>{editId ? <IcoTxt Icon={Save}>Salvar</IcoTxt> : <IcoTxt Icon={Check}>Adicionar</IcoTxt>}</Btn>
          {editId && <Btn variant="ghost" onClick={() => { setEditId(null); setForm({ descricao: "", valor: "", categoria: "outros", data: todayStr(), fixo: false }); }}>Cancelar</Btn>}
        </div>
      </div>
    </Card>
  );
}
