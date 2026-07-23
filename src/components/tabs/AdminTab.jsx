// @ts-nocheck
import { useState, useEffect } from "react";
import { C, fmt, tint } from "../../lib/constants";
import { Component, Package, Users, Plus, Save, Check, SquareCheck, Square, CircleCheck, Siren } from "../../lib/icons.jsx";
import { Card, Label, Field, Inp, Sel, Btn, Badge, Empty, STitle, IcoTxt, MoneyInput } from "../ui";
import { admin } from "../../lib/api";

export default function AdminTab() {
  const [sub, setSub] = useState("modulos");
  const [modules, setModules] = useState([]);
  const [plans, setPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const flash = (m) => { setMsg(m); setErr(""); setTimeout(() => setMsg(""), 2500); };
  const fail = (e) => setErr(e.message || "Erro");

  const loadModules = () => admin.modules().then(setModules).catch(fail);
  const loadPlans = () => admin.plans().then(setPlans).catch(fail);
  const loadUsers = () => admin.users().then(setUsers).catch(fail);

  useEffect(() => { loadModules(); }, []);
  useEffect(() => {
    setErr("");
    if (sub === "planos") { loadModules(); loadPlans(); }
    if (sub === "usuarios") { loadPlans(); loadUsers(); }
  }, [sub]);

  const SUBS = [
    { id: "modulos", label: "Módulos", Icon: Component },
    { id: "planos", label: "Planos", Icon: Package },
    { id: "usuarios", label: "Usuários", Icon: Users },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, background: "var(--fill-2)", borderRadius: 10, padding: 4, marginBottom: 14 }}>
        {SUBS.map((s) => (
          <button key={s.id} onClick={() => setSub(s.id)} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: sub === s.id ? tint(C.accent, 90) : "transparent", color: sub === s.id ? "#fff" : C.muted }}><s.Icon size={14} /> {s.label}</button>
        ))}
      </div>

      {err && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: C.red, borderRadius: 10, padding: "9px 13px", fontSize: 12, marginBottom: 12 }}>{err}</div>}
      {msg && <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: C.emerald, borderRadius: 10, padding: "9px 13px", fontSize: 12, marginBottom: 12 }}>{msg}</div>}

      {sub === "modulos" && <ModulesPanel modules={modules} reload={loadModules} flash={flash} fail={fail} />}
      {sub === "planos" && <PlansPanel plans={plans} modules={modules} reload={loadPlans} flash={flash} fail={fail} />}
      {sub === "usuarios" && <UsersPanel users={users} plans={plans} reload={loadUsers} flash={flash} fail={fail} />}
    </div>
  );
}

// ─── MÓDULOS ─────────────────────────────────────────────────
function ModulesPanel({ modules, reload, flash, fail }) {
  const [form, setForm] = useState({ chave: "", nome: "", ordem: "" });
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function add() {
    if (!form.chave.trim() || !form.nome.trim()) return;
    try { await admin.moduleCreate({ chave: form.chave.trim(), nome: form.nome.trim(), ordem: Number(form.ordem) || 0 }); setForm({ chave: "", nome: "", ordem: "" }); flash("Módulo criado."); reload(); }
    catch (e) { fail(e); }
  }

  return (
    <div>
      <Card style={{ marginBottom: 14 }}>
        <STitle><IcoTxt Icon={Plus}>Novo módulo (página)</IcoTxt></STitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 10, alignItems: "end" }}>
          <Field label="Chave (id da aba)"><Inp placeholder="ex: relatorios" value={form.chave} onChange={f("chave")} /></Field>
          <Field label="Nome"><Inp placeholder="ex: Relatórios" value={form.nome} onChange={f("nome")} /></Field>
          <Field label="Ordem"><Inp type="number" value={form.ordem} onChange={f("ordem")} /></Field>
        </div>
        <Btn onClick={add} style={{ marginTop: 12 }}>Adicionar</Btn>
      </Card>

      {modules.length === 0 ? <Empty icon="" title="Nenhum módulo" /> : modules.map((m) => (
        <ModuleRow key={m.id} m={m} reload={reload} flash={flash} fail={fail} />
      ))}
    </div>
  );
}

function ModuleRow({ m, reload, flash, fail }) {
  const [nome, setNome] = useState(m.nome);
  const [ordem, setOrdem] = useState(m.ordem);

  async function salvar() { try { await admin.moduleUpdate(m.id, { nome, ordem: Number(ordem) || 0 }); flash("Módulo atualizado."); reload(); } catch (e) { fail(e); } }
  async function excluir() { try { await admin.moduleDelete(m.id); flash("Módulo removido."); reload(); } catch (e) { fail(e); } }

  return (
    <Card style={{ marginBottom: 8, padding: "12px 14px" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Badge label={m.chave} color={C.indigo} />
        <Inp value={nome} onChange={(e) => setNome(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
        <Inp type="number" value={ordem} onChange={(e) => setOrdem(e.target.value)} style={{ width: 70 }} />
        <Btn variant="sm" onClick={salvar}>Salvar</Btn>
        <Btn variant="danger" onClick={excluir} style={{ padding: "7px 12px", fontSize: 12 }}>Excluir</Btn>
      </div>
    </Card>
  );
}

// ─── PLANOS ──────────────────────────────────────────────────
function PlansPanel({ plans, modules, reload, flash, fail }) {
  const [form, setForm] = useState({ nome: "", slug: "", preco: "", intervalo: "month", chaves: [] });
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const toggle = (chave) => setForm((p) => ({ ...p, chaves: p.chaves.includes(chave) ? p.chaves.filter((c) => c !== chave) : [...p.chaves, chave] }));

  async function add() {
    if (!form.nome.trim() || !form.slug.trim()) return;
    try {
      await admin.planCreate({ nome: form.nome.trim(), slug: form.slug.trim(), precoCentavos: Math.round((parseFloat(form.preco) || 0) * 100), intervalo: form.intervalo, moduloChaves: form.chaves });
      setForm({ nome: "", slug: "", preco: "", intervalo: "month", chaves: [] });
      flash("Plano criado."); reload();
    } catch (e) { fail(e); }
  }

  return (
    <div>
      <Card style={{ marginBottom: 14 }}>
        <STitle><IcoTxt Icon={Plus}>Novo plano</IcoTxt></STitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <Field label="Nome"><Inp placeholder="ex: Premium" value={form.nome} onChange={f("nome")} /></Field>
          <Field label="Slug"><Inp placeholder="ex: premium" value={form.slug} onChange={f("slug")} /></Field>
          <Field label="Preço (R$)"><MoneyInput placeholder="0,00" value={form.preco} onChange={f("preco")} /></Field>
          <Field label="Intervalo"><Sel value={form.intervalo} onChange={f("intervalo")}><option value="month">Mensal</option><option value="year">Anual</option></Sel></Field>
        </div>
        <Label>Módulos do plano</Label>
        <ModulePicker modules={modules} selected={form.chaves} onToggle={toggle} />
        <Btn onClick={add} style={{ marginTop: 12 }}>Criar plano</Btn>
      </Card>

      {plans.map((p) => <PlanCard key={p.id} p={p} modules={modules} reload={reload} flash={flash} fail={fail} />)}
    </div>
  );
}

function ModulePicker({ modules, selected, onToggle }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6, marginTop: 6 }}>
      {modules.map((m) => {
        const on = selected.includes(m.chave);
        return (
          <button key={m.id} onClick={() => onToggle(m.chave)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left", border: `1px solid ${on ? C.indigo : C.border}`, background: on ? "rgba(99,102,241,0.15)" : "transparent", color: on ? C.text : C.muted, fontSize: 12, fontWeight: 600 }}>
            {on ? <SquareCheck size={16} /> : <Square size={16} />} {m.nome} <span style={{ color: C.muted, fontSize: 10 }}>({m.chave})</span>
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({ p, modules, reload, flash, fail }) {
  const [nome, setNome] = useState(p.nome);
  const [preco, setPreco] = useState((p.precoCentavos / 100).toString());
  const [intervalo, setIntervalo] = useState(p.intervalo);
  const [ativo, setAtivo] = useState(p.ativo);
  const [chaves, setChaves] = useState(p.modulos || []);
  const toggle = (chave) => setChaves((c) => (c.includes(chave) ? c.filter((x) => x !== chave) : [...c, chave]));

  async function salvar() {
    try { await admin.planUpdate(p.id, { nome, precoCentavos: Math.round((parseFloat(preco) || 0) * 100), intervalo, ativo, moduloChaves: chaves }); flash("Plano atualizado."); reload(); } catch (e) { fail(e); }
  }
  async function excluir() { try { await admin.planDelete(p.id); flash("Plano removido."); reload(); } catch (e) { fail(e); } }

  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge label={p.slug} color={C.violet} />
          {!ativo && <Badge label="inativo" color={C.muted} />}
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.indigo }}>{fmt((parseFloat(preco) || 0))}/{intervalo === "month" ? "mês" : "ano"}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 110px", gap: 10, marginBottom: 10 }}>
        <Field label="Nome"><Inp value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
        <Field label="Preço (R$)"><MoneyInput value={preco} onChange={(e) => setPreco(e.target.value)} /></Field>
        <Field label="Intervalo"><Sel value={intervalo} onChange={(e) => setIntervalo(e.target.value)}><option value="month">Mensal</option><option value="year">Anual</option></Sel></Field>
      </div>
      <Label>Módulos ({chaves.length})</Label>
      <ModulePicker modules={modules} selected={chaves} onToggle={toggle} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 10 }}>
        <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
        <span style={{ fontSize: 12, color: C.subtle }}>Plano ativo (visível na tela de assinatura)</span>
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Btn onClick={salvar}><IcoTxt Icon={Save}>Salvar</IcoTxt></Btn>
        <Btn variant="danger" onClick={excluir}>Excluir</Btn>
      </div>
    </Card>
  );
}

// ─── USUÁRIOS ────────────────────────────────────────────────
function UsersPanel({ users, plans, reload, flash, fail }) {
  if (users.length === 0) return <Empty icon="" title="Nenhum usuário" />;
  return <div>{users.map((u) => <UserRow key={u.id} u={u} plans={plans} reload={reload} flash={flash} fail={fail} />)}</div>;
}

function UserRow({ u, plans, reload, flash, fail }) {
  const [planSlug, setPlanSlug] = useState(plans[0]?.slug || "");
  const [dias, setDias] = useState("30");
  const liberado = u.subscription?.liberado;

  async function grant() { try { await admin.userGrant(u.id, { planSlug, dias: Number(dias) || 30 }); flash(`Acesso liberado para ${u.email}.`); reload(); } catch (e) { fail(e); } }
  async function revoke() { try { await admin.userRevoke(u.id); flash(`Acesso revogado de ${u.email}.`); reload(); } catch (e) { fail(e); } }
  async function toggleRole() { try { await admin.userRole(u.id, { role: u.role === "admin" ? "cliente" : "admin" }); flash("Papel atualizado."); reload(); } catch (e) { fail(e); } }

  return (
    <Card style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{u.nome} {u.role === "admin" && <Badge label="admin" color={C.rose} />}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{u.email}{u.telefone ? ` · ${u.telefone}` : ""}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          {u.subscription
            ? <Badge label={`${liberado ? "liberado" : u.subscription.status} · ${u.subscription.plano || "—"}`} color={liberado ? C.emerald : C.amber} Icon={liberado ? CircleCheck : Siren} />
            : <Badge label="sem assinatura" color={C.muted} />}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Field label="Plano" style={{ minWidth: 130 }}>
          <Sel value={planSlug} onChange={(e) => setPlanSlug(e.target.value)}>
            {plans.map((p) => <option key={p.id} value={p.slug}>{p.nome}</option>)}
          </Sel>
        </Field>
        <Field label="Dias" style={{ width: 80 }}><Inp type="number" value={dias} onChange={(e) => setDias(e.target.value)} /></Field>
        <Btn variant="sm" onClick={grant}>Liberar</Btn>
        {liberado && <Btn variant="danger" onClick={revoke} style={{ padding: "7px 12px", fontSize: 12 }}>Revogar</Btn>}
        <Btn variant="ghost" onClick={toggleRole} style={{ padding: "7px 12px", fontSize: 12 }}>{u.role === "admin" ? "Tornar cliente" : "Tornar admin"}</Btn>
      </div>
    </Card>
  );
}
