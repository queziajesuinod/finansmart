// @ts-nocheck
// Console de Administração — página de GESTÃO própria (sidebar escura, tabelas de
// dados, KPIs). Não usa o shell do app público. Estilos ".ad-*"/".admin-root" em
// src/index.css. Toda a lógica de CRUD (módulos, planos, usuários) é preservada.
import { useState, useEffect } from "react";
import { C, fmt, CATEGORIES, catById } from "../../lib/constants";
import { Component, Package, Users, Plus, Save, SquareCheck, Square, Pencil, Trash2, Undo2, LogOut, FileText, ArrowLeftRight, TriangleAlert, LayoutGrid, Settings, Siren, X } from "../../lib/icons.jsx";
import { Label, Field, Inp, Sel, MoneyInput } from "../ui";
import { admin } from "../../lib/api";

const iniciais = (s) => (s || "?").trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
const AV = ["#6366F1,#4338CA", "#0EA5E9,#0369A1", "#F59E0B,#B45309", "#10B981,#047857", "#EC4899,#9D174D", "#8B5CF6,#5B21B6"];
const avBg = (s) => { let h = 0; for (const c of String(s || "")) h = (h * 31 + c.charCodeAt(0)) % AV.length; return `linear-gradient(135deg, ${AV[h]})`; };

export default function AdminTab({ user, onBack, onLogout }) {
  const [sub, setSub] = useState("visaogeral");
  const [modules, setModules] = useState([]);
  const [plans, setPlans] = useState([]);
  const [imports, setImports] = useState({ candidatos: [], globais: [], porBanco: [], logs: [] });
  const [overview, setOverview] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const flash = (m) => { setMsg(m); setErr(""); setTimeout(() => setMsg(""), 2500); };
  const fail = (e) => setErr(e.message || "Erro");
  const loadModules = () => admin.modules().then(setModules).catch(fail);
  const loadPlans = () => admin.plans().then(setPlans).catch(fail);
  const loadImports = (p) => admin.imports(p || 1).then(setImports).catch(fail);
  const loadOverview = () => admin.overview().then(setOverview).catch(fail);

  useEffect(() => { loadOverview(); loadModules(); loadPlans(); }, []);
  useEffect(() => {
    setErr("");
    if (sub === "visaogeral") loadOverview();
    if (sub === "planos") { loadModules(); loadPlans(); }
    if (sub === "importacoes") loadImports(1);
  }, [sub]);

  const NAV = [
    { id: "visaogeral", label: "Visão Geral", Icon: LayoutGrid, titulo: "Visão Geral", desc: "Indicadores de negócio e assinaturas." },
    { id: "usuarios", label: "Usuários", Icon: Users, count: overview?.usuariosTotal, titulo: "Usuários", desc: "Gerencie acessos, planos e permissões da base." },
    { id: "planos", label: "Planos", Icon: Package, count: plans.length, titulo: "Planos", desc: "Assinaturas, preços e módulos liberados por plano." },
    { id: "modulos", label: "Módulos", Icon: Component, count: modules.length, titulo: "Módulos", desc: "Páginas e recursos que compõem os planos." },
    { id: "importacoes", label: "Importações", Icon: FileText, count: (imports.candidatos || []).length, titulo: "Importações", desc: "Análise das importações e regras de categoria." },
    { id: "config", label: "Configurações", Icon: Settings, titulo: "Configurações", desc: "Ajustes globais do sistema." },
  ];
  const atual = NAV.find((n) => n.id === sub) || NAV[0];

  return (
    <div className="admin-root">
      <aside className="ad-rail">
        <div className="ad-brand">
          <div className="ad-logo">J</div>
          <div><b>José Planeja</b><span>Console Admin</span></div>
        </div>
        <div className="ad-navgroup">
          <div className="gl">Gestão</div>
          {NAV.map((n) => (
            <button key={n.id} className="ad-item" aria-current={sub === n.id} onClick={() => setSub(n.id)}>
              <n.Icon className="ic" size={17} /> {n.label} {n.count != null && <span className="ct">{n.count}</span>}
            </button>
          ))}
        </div>
        <div className="ad-foot">
          <button onClick={onBack}><Undo2 size={16} /> Voltar ao app</button>
          <button onClick={onLogout}><LogOut size={16} /> Sair</button>
        </div>
      </aside>

      <div className="ad-main">
        <header className="ad-top">
          <span className="ad-crumb">Gestão / <b>{atual.label}</b></span>
          <span className="sp" />
          <div className="ad-avatar" title={user?.email}>{iniciais(user?.nome || user?.email)}</div>
        </header>

        <nav className="ad-mnav">
          {NAV.map((n) => (
            <button key={n.id} aria-current={sub === n.id} onClick={() => setSub(n.id)}>{n.label}</button>
          ))}
        </nav>

        <main className="ad-content">
          {err && <div className="ad-alert err">{err}</div>}
          {msg && <div className="ad-alert ok">{msg}</div>}

          {sub === "visaogeral" && <VisaoGeralPanel head={atual} data={overview} />}
          {sub === "usuarios" && <UsersPanel head={atual} plans={plans} flash={flash} fail={fail} />}
          {sub === "planos" && <PlansPanel head={atual} plans={plans} modules={modules} reload={loadPlans} flash={flash} fail={fail} />}
          {sub === "modulos" && <ModulesPanel head={atual} modules={modules} reload={loadModules} flash={flash} fail={fail} />}
          {sub === "importacoes" && <ImportacoesPanel head={atual} data={imports} reload={() => loadImports(imports.page || 1)} onPage={loadImports} flash={flash} fail={fail} />}
          {sub === "config" && <ConfigPanel head={atual} flash={flash} fail={fail} />}
        </main>
      </div>
    </div>
  );
}

// ─── VISÃO GERAL ─────────────────────────────────────────────
function VisaoGeralPanel({ head, data }) {
  const d = data || {};
  const mrr = (d.mrrCentavos || 0) / 100;
  const KPIS = [
    { l: "Usuários", v: d.usuariosTotal ?? "—", c: C.accent, sub: `+${d.novosMes || 0} este mês` },
    { l: "Assinaturas ativas", v: d.assinaturasAtivas ?? "—", c: C.emerald, sub: "liberadas agora" },
    { l: "MRR estimado", v: fmt(mrr), c: C.violet, sub: "receita recorrente/mês" },
    { l: "Vencendo (7d)", v: (d.expirando || []).length, c: (d.expirando || []).length ? C.amber : C.muted, sub: "assinaturas a renovar" },
  ];
  const growth = d.growth || [];
  const maxG = Math.max(1, ...growth.map((g) => g.novos));
  return (
    <div>
      <div className="ad-head"><div><h1>{head.titulo}</h1><p>{head.desc}</p></div></div>

      <div className="ad-kpis">
        {KPIS.map((k) => (
          <div key={k.l} className="ad-kpi">
            <div className="v" style={{ color: k.c }}>{k.v}</div>
            <div className="l">{k.l}</div>
            <div className="d">{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="ad-vg-grid">
        {/* Crescimento */}
        <div className="ad-panel pad">
          <h2 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 16px" }}>Novos usuários · 6 meses</h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
            {growth.map((g) => (
              <div key={g.mes} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.subtle }}>{g.novos}</div>
                <div style={{ width: "100%", height: `${Math.max(4, (g.novos / maxG) * 90)}px`, background: "var(--a-accent)", borderRadius: "6px 6px 0 0", opacity: 0.85 }} />
                <div style={{ fontSize: 10, color: C.muted }}>{g.mes.slice(5)}</div>
              </div>
            ))}
            {growth.length === 0 && <span style={{ fontSize: 12, color: C.muted }}>Sem dados.</span>}
          </div>
        </div>

        {/* Expirando */}
        <div className="ad-panel">
          <div className="ad-panel-head"><h2><Siren size={15} /> Assinaturas vencendo (7 dias)</h2></div>
          <div className="ad-tblwrap">
            <table className="ad-tbl">
              <thead><tr><th>Usuário</th><th>Plano</th><th>Vence</th></tr></thead>
              <tbody>
                {(d.expirando || []).length === 0
                  ? <tr><td colSpan={3} style={{ textAlign: "center", color: C.muted, padding: 24 }}>Nada vencendo nos próximos 7 dias. 🎉</td></tr>
                  : d.expirando.map((e, i) => (
                    <tr key={i}>
                      <td><b style={{ fontSize: 13 }}>{e.usuario}</b><div style={{ fontSize: 11, color: C.muted }}>{e.email}</div></td>
                      <td>{e.plano || "—"}</td>
                      <td style={{ color: C.amber, fontWeight: 700 }}>{e.em ? new Date(e.em).toLocaleDateString("pt-BR") : "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── USUÁRIOS ────────────────────────────────────────────────
function UsersPanel({ head, plans, flash, fail }) {
  const [data, setData] = useState({ users: [], page: 1, pageSize: 15, total: 0 });
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [plano, setPlano] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [detalhe, setDetalhe] = useState(null);

  const load = (p) => {
    const params = new URLSearchParams();
    params.set("page", p || page);
    if (busca.trim()) params.set("q", busca.trim());
    if (status) params.set("status", status);
    if (plano) params.set("plano", plano);
    if (role) params.set("role", role);
    admin.users(params.toString()).then(setData).catch(fail);
  };
  // Volta pra página 1 ao mudar filtros.
  useEffect(() => { setPage(1); }, [busca, status, plano, role]);
  // Recarrega (debounce na busca) ao mudar filtro/página.
  useEffect(() => { const t = setTimeout(() => load(page), 300); return () => clearTimeout(t); }, [busca, status, plano, role, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = () => load(data.page || 1);
  const pages = Math.max(1, Math.ceil((data.total || 0) / (data.pageSize || 15)));

  return (
    <div>
      <div className="ad-head"><div><h1>{head.titulo}</h1><p>{head.desc}</p></div></div>

      <div className="ad-panel pad" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Inp placeholder="Buscar nome, e-mail…" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ flex: "1 1 200px" }} />
          <Sel value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "auto" }}>
            <option value="">Todos status</option><option value="liberado">Liberado</option><option value="pendente">Pendente</option><option value="sem">Sem assinatura</option>
          </Sel>
          <Sel value={plano} onChange={(e) => setPlano(e.target.value)} style={{ width: "auto" }}>
            <option value="">Todos planos</option>{plans.map((p) => <option key={p.id} value={p.slug}>{p.nome}</option>)}
          </Sel>
          <Sel value={role} onChange={(e) => setRole(e.target.value)} style={{ width: "auto" }}>
            <option value="">Todos papéis</option><option value="cliente">Cliente</option><option value="admin">Admin</option>
          </Sel>
        </div>
      </div>

      <div className="ad-panel">
        <div className="ad-tblwrap">
          <table className="ad-tbl">
            <thead><tr><th>Usuário</th><th>Plano</th><th>Status</th><th>Papel</th><th style={{ textAlign: "right" }}>Ações</th></tr></thead>
            <tbody>
              {data.users.length === 0
                ? <tr><td colSpan={5} style={{ textAlign: "center", color: C.muted, padding: 28 }}>Nenhum usuário encontrado.</td></tr>
                : data.users.map((u) => <UserRow key={u.id} u={u} plans={plans} reload={reload} onDetail={() => setDetalhe(u.id)} flash={flash} fail={fail} />)}
            </tbody>
          </table>
        </div>
        {data.total > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, color: C.muted }}>Página {page} de {pages} · {data.total} usuário{data.total === 1 ? "" : "s"}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ad-btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ opacity: page <= 1 ? 0.45 : 1, cursor: page <= 1 ? "default" : "pointer" }}>Anterior</button>
              <button className="ad-btn ghost sm" disabled={page >= pages} onClick={() => setPage(page + 1)} style={{ opacity: page >= pages ? 0.45 : 1, cursor: page >= pages ? "default" : "pointer" }}>Próxima</button>
            </div>
          </div>
        )}
      </div>

      {detalhe && <UserDetailModal id={detalhe} onClose={() => setDetalhe(null)} fail={fail} />}
    </div>
  );
}

function UserDetailModal({ id, onClose, fail }) {
  const [d, setD] = useState(null);
  useEffect(() => { admin.userDetail(id).then(setD).catch(fail); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = d ? [["Cartões", d.counts.cartoes], ["Lançamentos", d.counts.despesas], ["Parcelados", d.counts.parcelados], ["Empréstimos", d.counts.emprestimos], ["Membros", d.counts.membros], ["Metas", d.counts.goals]] : [];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(2,6,20,.5)", display: "grid", placeItems: "center", zIndex: 100, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", border: `1px solid ${C.border}`, borderRadius: 16, width: "min(560px,96vw)", maxHeight: "88vh", overflow: "auto", boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{d ? d.nome : "Usuário"}</h2>
          <button className="ad-actx" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <div style={{ padding: 18 }}>
          {!d ? <div style={{ color: C.muted, fontSize: 13 }}>Carregando…</div> : (
            <>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>{d.email}{d.telefone ? ` · ${d.telefone}` : ""}{d.cpf ? ` · ${d.cpf}` : ""} · desde {new Date(d.createdAt).toLocaleDateString("pt-BR")}{d.role === "admin" ? " · admin" : ""}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
                {counts.map(([l, v]) => (
                  <div key={l} style={{ background: "var(--fill-2)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{v}</div>
                    <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 700 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Histórico de assinaturas</div>
              {d.subscriptions.length === 0 ? <div style={{ fontSize: 12, color: C.muted }}>Nenhuma.</div> : d.subscriptions.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid var(--fill-2)`, fontSize: 12.5 }}>
                  <span>{s.plano || "—"} <span className={`ad-pill ${s.status === "active" || s.status === "trialing" ? "ok" : "off"}`} style={{ marginLeft: 6 }}><i /> {s.status}</span></span>
                  <span style={{ color: C.muted, fontSize: 11 }}>{new Date(s.criadaEm).toLocaleDateString("pt-BR")}{s.currentPeriodEnd ? ` → ${new Date(s.currentPeriodEnd).toLocaleDateString("pt-BR")}` : ""}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UserRow({ u, plans, reload, onDetail, flash, fail }) {
  const [open, setOpen] = useState(false);
  const [planSlug, setPlanSlug] = useState(plans[0]?.slug || "");
  const [dias, setDias] = useState("30");
  const liberado = u.subscription?.liberado;
  const status = liberado ? "ok" : (u.subscription ? "warn" : "off");
  const statusLabel = liberado ? "Liberado" : (u.subscription ? (u.subscription.status || "Pendente") : "Sem assinatura");

  useEffect(() => { if (plans.length && !plans.some((p) => p.slug === planSlug)) setPlanSlug(plans[0].slug); }, [plans]); // eslint-disable-line react-hooks/exhaustive-deps

  async function grant() { try { await admin.userGrant(u.id, { planSlug, dias: Number(dias) || 30 }); flash(`Acesso liberado para ${u.email}.`); setOpen(false); reload(); } catch (e) { fail(e); } }
  async function revoke() { try { await admin.userRevoke(u.id); flash(`Acesso revogado de ${u.email}.`); reload(); } catch (e) { fail(e); } }
  async function toggleRole() { try { await admin.userRole(u.id, { role: u.role === "admin" ? "cliente" : "admin" }); flash("Papel atualizado."); reload(); } catch (e) { fail(e); } }

  return (
    <>
      <tr>
        <td>
          <div className="ad-ucell">
            <div className="ad-uav" style={{ background: avBg(u.email || u.nome) }}>{iniciais(u.nome || u.email)}</div>
            <div><b>{u.nome}</b><span>{u.email}{u.telefone ? ` · ${u.telefone}` : ""}</span></div>
          </div>
        </td>
        <td style={{ color: u.subscription?.plano ? C.text : C.muted, fontWeight: u.subscription?.plano ? 600 : 400 }}>{u.subscription?.plano || "—"}</td>
        <td><span className={`ad-pill ${status}`}><i /> {statusLabel}</span></td>
        <td>{u.role === "admin" ? <span className="ad-chip rose">admin</span> : <span style={{ fontSize: 12, color: C.muted }}>cliente</span>}</td>
        <td>
          <div className="ad-rowact">
            {liberado
              ? <button className="ad-btn danger sm" onClick={revoke}>Revogar</button>
              : <button className="ad-btn primary sm" onClick={() => setOpen((o) => !o)}>Liberar</button>}
            <button className="ad-btn ghost sm" onClick={onDetail}>Detalhes</button>
            <button className="ad-actx" aria-label="Gerenciar" onClick={() => setOpen((o) => !o)}><Pencil size={14} /></button>
          </div>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} style={{ background: "var(--fill-2)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <Field label="Plano" style={{ minWidth: 150 }}>
                <Sel value={planSlug} onChange={(e) => setPlanSlug(e.target.value)}>
                  {plans.map((p) => <option key={p.id} value={p.slug}>{p.nome}</option>)}
                </Sel>
              </Field>
              <Field label="Dias" style={{ width: 90 }}><Inp type="number" value={dias} onChange={(e) => setDias(e.target.value)} /></Field>
              <button className="ad-btn primary" onClick={grant}>Liberar acesso</button>
              {liberado && <button className="ad-btn danger" onClick={revoke}>Revogar</button>}
              <button className="ad-btn ghost" onClick={toggleRole}>{u.role === "admin" ? "Tornar cliente" : "Tornar admin"}</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── PLANOS ──────────────────────────────────────────────────
function PlansPanel({ head, plans, modules, reload, flash, fail }) {
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ nome: "", slug: "", preco: "", precoDep: "", intervalo: "month", chaves: [] });
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const toggle = (chave) => setForm((p) => ({ ...p, chaves: p.chaves.includes(chave) ? p.chaves.filter((c) => c !== chave) : [...p.chaves, chave] }));

  async function add() {
    if (!form.nome.trim() || !form.slug.trim()) return;
    try {
      await admin.planCreate({ nome: form.nome.trim(), slug: form.slug.trim(), precoCentavos: Math.round((parseFloat(form.preco) || 0) * 100), precoDependenteCentavos: Math.round((parseFloat(form.precoDep) || 0) * 100), intervalo: form.intervalo, moduloChaves: form.chaves });
      setForm({ nome: "", slug: "", preco: "", precoDep: "", intervalo: "month", chaves: [] }); setNovo(false);
      flash("Plano criado."); reload();
    } catch (e) { fail(e); }
  }

  return (
    <div>
      <div className="ad-head">
        <div><h1>{head.titulo}</h1><p>{head.desc}</p></div>
        <button className="ad-btn primary" onClick={() => setNovo((v) => !v)}><Plus size={15} /> Novo plano</button>
      </div>

      {novo && (
        <div className="ad-panel pad">
          <h2 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 14px" }}>Novo plano</h2>
          <div className="form-grid-2" style={{ marginBottom: 10 }}>
            <Field label="Nome"><Inp placeholder="ex: Premium" value={form.nome} onChange={f("nome")} /></Field>
            <Field label="Slug"><Inp placeholder="ex: premium" value={form.slug} onChange={f("slug")} /></Field>
            <Field label="Preço base (R$)"><MoneyInput placeholder="0,00" value={form.preco} onChange={f("preco")} /></Field>
            <Field label="Preço por dependente (R$)"><MoneyInput placeholder="0,00" value={form.precoDep} onChange={f("precoDep")} /></Field>
            <Field label="Intervalo"><Sel value={form.intervalo} onChange={f("intervalo")}><option value="month">Mensal</option><option value="year">Anual</option></Sel></Field>
          </div>
          <Label>Módulos do plano</Label>
          <ModulePicker modules={modules} selected={form.chaves} onToggle={toggle} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="ad-btn primary" onClick={add}><Plus size={15} /> Criar plano</button>
            <button className="ad-btn ghost" onClick={() => setNovo(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="ad-plans">
        {plans.map((p) => <PlanCard key={p.id} p={p} modules={modules} reload={reload} flash={flash} fail={fail} />)}
      </div>
    </div>
  );
}

function ModulePicker({ modules, selected, onToggle }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 6, marginTop: 6 }}>
      {modules.map((m) => {
        const on = selected.includes(m.chave);
        return (
          <button key={m.id} onClick={() => onToggle(m.chave)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left", border: `1px solid ${on ? "var(--a-accent)" : C.border}`, background: on ? "color-mix(in srgb, var(--a-accent) 12%, transparent)" : "transparent", color: on ? C.text : C.muted, fontSize: 12, fontWeight: 600 }}>
            {on ? <SquareCheck size={16} /> : <Square size={16} />} {m.nome} <span style={{ color: C.muted, fontSize: 10 }}>({m.chave})</span>
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({ p, modules, reload, flash, fail }) {
  const [edit, setEdit] = useState(false);
  const [nome, setNome] = useState(p.nome);
  const [preco, setPreco] = useState((p.precoCentavos / 100).toString());
  const [precoDep, setPrecoDep] = useState(((p.precoDependenteCentavos || 0) / 100).toString());
  const [intervalo, setIntervalo] = useState(p.intervalo);
  const [ativo, setAtivo] = useState(p.ativo);
  const [chaves, setChaves] = useState(p.modulos || []);
  const toggle = (chave) => setChaves((c) => (c.includes(chave) ? c.filter((x) => x !== chave) : [...c, chave]));
  const nomeMod = (ch) => (modules.find((m) => m.chave === ch) || {}).nome || ch;

  async function salvar() {
    try { await admin.planUpdate(p.id, { nome, precoCentavos: Math.round((parseFloat(preco) || 0) * 100), precoDependenteCentavos: Math.round((parseFloat(precoDep) || 0) * 100), intervalo, ativo, moduloChaves: chaves }); flash("Plano atualizado."); setEdit(false); reload(); } catch (e) { fail(e); }
  }
  async function excluir() { try { await admin.planDelete(p.id); flash("Plano removido."); reload(); } catch (e) { fail(e); } }

  return (
    <div className={`ad-plan${ativo ? " feat" : ""}`}>
      <div className="ph">
        <h3>{p.nome}</h3>
        <span className={`ad-chip ${ativo ? "indigo" : "off"}`}>{ativo ? p.slug : "inativo"}</span>
      </div>
      <div className="price">{fmt(parseFloat(preco) || 0)}<small>/{intervalo === "month" ? "mês" : "ano"}</small></div>
      <div className="dep">{parseFloat(precoDep) > 0 ? `+ ${fmt(parseFloat(precoDep) || 0)} por dependente` : "sem custo por dependente"}</div>

      {!edit ? (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {(p.modulos || []).length === 0 ? <span style={{ fontSize: 11, color: C.muted }}>Nenhum módulo</span>
              : (p.modulos || []).map((ch) => <span key={ch} style={{ fontSize: 11, fontWeight: 600, color: C.subtle, background: "var(--fill-2)", border: `1px solid ${C.border}`, padding: "4px 9px", borderRadius: 7 }}>{nomeMod(ch)}</span>)}
          </div>
          <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <button className="ad-btn ghost sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setEdit(true)}><Pencil size={14} /> Editar</button>
            <button className="ad-actx" onClick={excluir} aria-label="Excluir"><Trash2 size={15} /></button>
          </div>
        </>
      ) : (
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          <Field label="Nome" style={{ marginBottom: 10 }}><Inp value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
          <div className="form-grid-2" style={{ marginBottom: 10 }}>
            <Field label="Preço base (R$)"><MoneyInput value={preco} onChange={(e) => setPreco(e.target.value)} /></Field>
            <Field label="Preço/dependente (R$)"><MoneyInput value={precoDep} onChange={(e) => setPrecoDep(e.target.value)} /></Field>
            <Field label="Intervalo"><Sel value={intervalo} onChange={(e) => setIntervalo(e.target.value)}><option value="month">Mensal</option><option value="year">Anual</option></Sel></Field>
          </div>
          <Label>Módulos ({chaves.length})</Label>
          <ModulePicker modules={modules} selected={chaves} onToggle={toggle} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", margin: "10px 0" }}>
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <span style={{ fontSize: 12, color: C.subtle }}>Plano ativo (visível na assinatura)</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ad-btn primary" onClick={salvar}><Save size={15} /> Salvar</button>
            <button className="ad-btn ghost" onClick={() => setEdit(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MÓDULOS ─────────────────────────────────────────────────
function ModulesPanel({ head, modules, reload, flash, fail }) {
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ chave: "", nome: "", ordem: "" });
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function add() {
    if (!form.chave.trim() || !form.nome.trim()) return;
    try { await admin.moduleCreate({ chave: form.chave.trim(), nome: form.nome.trim(), ordem: Number(form.ordem) || 0 }); setForm({ chave: "", nome: "", ordem: "" }); setNovo(false); flash("Módulo criado."); reload(); }
    catch (e) { fail(e); }
  }

  return (
    <div>
      <div className="ad-head">
        <div><h1>{head.titulo}</h1><p>{head.desc}</p></div>
        <button className="ad-btn primary" onClick={() => setNovo((v) => !v)}><Plus size={15} /> Novo módulo</button>
      </div>

      {novo && (
        <div className="ad-panel pad">
          <h2 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 14px" }}>Novo módulo (página)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px auto", gap: 10, alignItems: "end" }}>
            <Field label="Chave (id da aba)"><Inp placeholder="ex: relatorios" value={form.chave} onChange={f("chave")} /></Field>
            <Field label="Nome"><Inp placeholder="ex: Relatórios" value={form.nome} onChange={f("nome")} /></Field>
            <Field label="Ordem"><Inp type="number" value={form.ordem} onChange={f("ordem")} /></Field>
            <button className="ad-btn primary" onClick={add}>Adicionar</button>
          </div>
        </div>
      )}

      <div className="ad-panel">
        <div className="ad-tblwrap">
          <table className="ad-tbl">
            <thead><tr><th>Chave</th><th>Nome</th><th style={{ width: 90 }}>Ordem</th><th style={{ textAlign: "right", width: 150 }}>Ações</th></tr></thead>
            <tbody>
              {modules.length === 0
                ? <tr><td colSpan={4} style={{ textAlign: "center", color: C.muted, padding: "28px" }}>Nenhum módulo cadastrado.</td></tr>
                : modules.map((m) => <ModuleRow key={m.id} m={m} reload={reload} flash={flash} fail={fail} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ModuleRow({ m, reload, flash, fail }) {
  const [nome, setNome] = useState(m.nome);
  const [ordem, setOrdem] = useState(m.ordem);
  const dirty = nome !== m.nome || String(ordem) !== String(m.ordem);

  async function salvar() { try { await admin.moduleUpdate(m.id, { nome, ordem: Number(ordem) || 0 }); flash("Módulo atualizado."); reload(); } catch (e) { fail(e); } }
  async function excluir() { try { await admin.moduleDelete(m.id); flash("Módulo removido."); reload(); } catch (e) { fail(e); } }

  return (
    <tr>
      <td><span className="ad-chip indigo">{m.chave}</span></td>
      <td><Inp value={nome} onChange={(e) => setNome(e.target.value)} style={{ minWidth: 150 }} /></td>
      <td><Inp type="number" value={ordem} onChange={(e) => setOrdem(e.target.value)} style={{ width: 70 }} /></td>
      <td>
        <div className="ad-rowact">
          <button className="ad-btn sm" style={{ background: dirty ? "var(--a-accent)" : "var(--fill-2)", color: dirty ? "#fff" : C.muted }} onClick={salvar}>Salvar</button>
          <button className="ad-actx" onClick={excluir} aria-label="Excluir"><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  );
}

// ─── IMPORTAÇÕES (análise) ───────────────────────────────────
function ImportacoesPanel({ head, data, reload, onPage, flash, fail }) {
  const { candidatos = [], globais = [], porBanco = [], logs = [] } = data || {};
  const page = data.page || 1, pageSize = data.pageSize || 15, total = data.logsTotal || 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  // Paginação (client-side) das correções recorrentes — a lista mais longa (até 100).
  const [candPage, setCandPage] = useState(1);
  const candSize = 10;
  const candPages = Math.max(1, Math.ceil(candidatos.length / candSize));
  const candView = candidatos.slice((candPage - 1) * candSize, candPage * candSize);
  useEffect(() => { setCandPage((p) => Math.min(p, candPages)); }, [candidatos.length, candPages]);
  // Paginação (client-side) das regras globais ativas.
  const [globPage, setGlobPage] = useState(1);
  const globSize = 10;
  const globPages = Math.max(1, Math.ceil(globais.length / globSize));
  const globView = globais.slice((globPage - 1) * globSize, globPage * globSize);
  useEffect(() => { setGlobPage((p) => Math.min(p, globPages)); }, [globais.length, globPages]);
  // Paginação (client-side) do "por banco".
  const [bancoPage, setBancoPage] = useState(1);
  const bancoSize = 10;
  const bancoPages = Math.max(1, Math.ceil(porBanco.length / bancoSize));
  const bancoView = porBanco.slice((bancoPage - 1) * bancoSize, bancoPage * bancoSize);
  useEffect(() => { setBancoPage((p) => Math.min(p, bancoPages)); }, [porBanco.length, bancoPages]);
  return (
    <div>
      <div className="ad-head"><div><h1>{head.titulo}</h1><p>{head.desc}</p></div></div>

      {/* Qualidade por banco */}
      <div className="ad-panel">
        <div className="ad-panel-head"><h2><FileText size={15} /> Importações por banco</h2><span className="hint">onde o parser dá mais trabalho</span></div>
        <div className="ad-tblwrap">
          <table className="ad-tbl">
            <thead><tr><th>Banco</th><th>Importações</th><th>Itens</th><th>Categorias corrigidas</th><th>Com estorno</th></tr></thead>
            <tbody>
              {porBanco.length === 0
                ? <tr><td colSpan={5} style={{ textAlign: "center", color: C.muted, padding: 24 }}>Ainda sem importações registradas.</td></tr>
                : bancoView.map((b) => (
                  <tr key={b.banco}>
                    <td style={{ fontWeight: 700 }}>{b.banco}</td>
                    <td>{b.importacoes}</td>
                    <td>{b.itens}</td>
                    <td>{b.corrigidas}{b.itens ? <span style={{ color: C.muted, fontSize: 11 }}> · {Math.round((b.corrigidas / Math.max(1, b.itens)) * 100)}%</span> : null}</td>
                    <td>{b.estornos > 0 ? <span className="ad-pill warn"><i /> {b.estornos}</span> : <span style={{ color: C.muted }}>—</span>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {porBanco.length > bancoSize && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, color: C.muted }}>Página {bancoPage} de {bancoPages} · {porBanco.length} bancos</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ad-btn ghost sm" disabled={bancoPage <= 1} onClick={() => setBancoPage(bancoPage - 1)} style={{ opacity: bancoPage <= 1 ? 0.45 : 1, cursor: bancoPage <= 1 ? "default" : "pointer" }}>Anterior</button>
              <button className="ad-btn ghost sm" disabled={bancoPage >= bancoPages} onClick={() => setBancoPage(bancoPage + 1)} style={{ opacity: bancoPage >= bancoPages ? 0.45 : 1, cursor: bancoPage >= bancoPages ? "default" : "pointer" }}>Próxima</button>
            </div>
          </div>
        )}
      </div>

      {/* Candidatos a regra global */}
      <div className="ad-panel">
        <div className="ad-panel-head"><h2><ArrowLeftRight size={15} /> Correções recorrentes{candidatos.length ? ` (${candidatos.length})` : ""}</h2><span className="hint">o que os clientes mais reclassificam → vira regra</span></div>
        <div className="ad-tblwrap">
          <table className="ad-tbl">
            <thead><tr><th>Comerciante</th><th>Categoria sugerida</th><th>Usuários</th><th style={{ textAlign: "right" }}>Ação</th></tr></thead>
            <tbody>
              {candidatos.length === 0
                ? <tr><td colSpan={4} style={{ textAlign: "center", color: C.muted, padding: 24 }}>Nenhuma correção pendente para virar regra global. 🎉</td></tr>
                : candView.map((c) => <CandidatoRow key={c.chave} c={c} reload={reload} flash={flash} fail={fail} />)}
            </tbody>
          </table>
        </div>
        {candidatos.length > candSize && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, color: C.muted }}>Página {candPage} de {candPages} · {candidatos.length} comerciantes</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ad-btn ghost sm" disabled={candPage <= 1} onClick={() => setCandPage(candPage - 1)} style={{ opacity: candPage <= 1 ? 0.45 : 1, cursor: candPage <= 1 ? "default" : "pointer" }}>Anterior</button>
              <button className="ad-btn ghost sm" disabled={candPage >= candPages} onClick={() => setCandPage(candPage + 1)} style={{ opacity: candPage >= candPages ? 0.45 : 1, cursor: candPage >= candPages ? "default" : "pointer" }}>Próxima</button>
            </div>
          </div>
        )}
      </div>

      {/* Regras globais ativas */}
      <div className="ad-panel">
        <div className="ad-panel-head"><h2><SquareCheck size={15} /> Regras globais ativas ({globais.length})</h2><span className="hint">aplicadas em todas as próximas importações</span></div>
        <div className="ad-tblwrap">
          <table className="ad-tbl">
            <thead><tr><th>Comerciante</th><th>Categoria</th><th style={{ textAlign: "right" }}>Ação</th></tr></thead>
            <tbody>
              {globais.length === 0
                ? <tr><td colSpan={3} style={{ textAlign: "center", color: C.muted, padding: 24 }}>Nenhuma regra global ainda.</td></tr>
                : globView.map((g) => (
                  <tr key={g.id}>
                    <td><span className="ad-chip indigo">{g.chave}</span></td>
                    <td>{catById(g.categoria).label}</td>
                    <td><div className="ad-rowact"><button className="ad-actx" aria-label="Remover" onClick={async () => { try { await admin.globalRuleDelete(g.id); flash("Regra removida."); reload(); } catch (e) { fail(e); } }}><Trash2 size={14} /></button></div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {globais.length > globSize && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, color: C.muted }}>Página {globPage} de {globPages} · {globais.length} regras</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ad-btn ghost sm" disabled={globPage <= 1} onClick={() => setGlobPage(globPage - 1)} style={{ opacity: globPage <= 1 ? 0.45 : 1, cursor: globPage <= 1 ? "default" : "pointer" }}>Anterior</button>
              <button className="ad-btn ghost sm" disabled={globPage >= globPages} onClick={() => setGlobPage(globPage + 1)} style={{ opacity: globPage >= globPages ? 0.45 : 1, cursor: globPage >= globPages ? "default" : "pointer" }}>Próxima</button>
            </div>
          </div>
        )}
      </div>

      {/* Importações recentes */}
      <div className="ad-panel">
        <div className="ad-panel-head"><h2><FileText size={15} /> Importações{total ? ` (${total})` : ""}</h2></div>
        <div className="ad-tblwrap">
          <table className="ad-tbl">
            <thead><tr><th>Usuário</th><th>Banco</th><th>Mês</th><th>Itens</th><th>Corrigidas</th><th>Flags</th></tr></thead>
            <tbody>
              {logs.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: "center", color: C.muted, padding: 24 }}>Sem importações recentes.</td></tr>
                : logs.map((l) => (
                  <tr key={l.id}>
                    <td><b style={{ fontSize: 13 }}>{l.usuario}</b><div style={{ fontSize: 11, color: C.muted }}>{l.email}</div></td>
                    <td>{l.banco || "—"}{l.fonte === "ia" ? <span className="ad-chip indigo" style={{ marginLeft: 6 }}>IA</span> : null}</td>
                    <td>{l.mesRef || "—"}</td>
                    <td>{l.itensConfirmados}{l.itensRemovidos ? <span style={{ color: C.muted, fontSize: 11 }}> (−{l.itensRemovidos})</span> : null}</td>
                    <td>{l.categoriasCorrigidas || 0}</td>
                    <td>{l.teveEstorno ? <span className="ad-pill warn"><i /> estorno</span> : <span style={{ color: C.muted }}>—</span>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, color: C.muted }}>Página {page} de {pages} · {total} importaç{total === 1 ? "ão" : "ões"}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ad-btn ghost sm" disabled={page <= 1} onClick={() => onPage(page - 1)} style={{ opacity: page <= 1 ? 0.45 : 1, cursor: page <= 1 ? "default" : "pointer" }}>Anterior</button>
              <button className="ad-btn ghost sm" disabled={page >= pages} onClick={() => onPage(page + 1)} style={{ opacity: page >= pages ? 0.45 : 1, cursor: page >= pages ? "default" : "pointer" }}>Próxima</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CandidatoRow({ c, reload, flash, fail }) {
  const [cat, setCat] = useState(c.categoria);
  async function promover() { try { await admin.globalRulePromote({ chave: c.chave, categoria: cat }); flash(`Regra "${c.chave} → ${catById(cat).label}" criada.`); reload(); } catch (e) { fail(e); } }
  return (
    <tr>
      <td>
        <span className="ad-chip indigo">{c.chave}</span>
        {c.divergente ? <span title="Usuários discordam da categoria" style={{ marginLeft: 6, color: C.amber, display: "inline-flex", verticalAlign: "-2px" }}><TriangleAlert size={13} /></span> : null}
      </td>
      <td>
        <Sel value={cat} onChange={(e) => setCat(e.target.value)} style={{ maxWidth: 190 }}>
          {CATEGORIES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </Sel>
      </td>
      <td>{c.usuarios}</td>
      <td><div className="ad-rowact"><button className="ad-btn primary sm" onClick={promover}>Promover a global</button></div></td>
    </tr>
  );
}

// ─── CONFIGURAÇÕES ───────────────────────────────────────────
function ConfigPanel({ head, flash, fail }) {
  const [planos, setPlanos] = useState([]);
  const [form, setForm] = useState(null);
  useEffect(() => {
    admin.settings().then((r) => { setPlanos(r.planos || []); setForm(r.settings); }).catch(fail);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function salvar() { try { await admin.settingsSave(form); flash("Configurações salvas."); } catch (e) { fail(e); } }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="ad-head">
        <div><h1>{head.titulo}</h1><p>{head.desc}</p></div>
        {form && <button className="ad-btn primary" onClick={salvar}><Save size={15} /> Salvar</button>}
      </div>
      {!form ? <div style={{ color: C.muted, fontSize: 13 }}>Carregando…</div> : (
        <div className="ad-panel pad" style={{ maxWidth: 640 }}>
          <Field label="Plano padrão de novos usuários">
            <Sel value={form.planoPadrao} onChange={(e) => set("planoPadrao", e.target.value)}>
              {planos.map((p) => <option key={p.slug} value={p.slug}>{p.nome}</option>)}
            </Sel>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>Atribuído automaticamente no cadastro (hoje era fixo no código).</div>
          </Field>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 16 }}>
            <input type="checkbox" checked={form.cadastroPublico !== false} onChange={(e) => set("cadastroPublico", e.target.checked)} />
            <span style={{ fontSize: 13, color: C.subtle }}>Cadastro público aberto</span>
          </label>
          <div style={{ fontSize: 11, color: C.muted, margin: "4px 0 2px 26px", lineHeight: 1.4 }}>Desligado = entrada só por convite (quem você liberar). Quem já tem conta continua logando normalmente.</div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 14 }}>
            <input type="checkbox" checked={form.cobrancaAtiva === true} onChange={(e) => set("cobrancaAtiva", e.target.checked)} />
            <span style={{ fontSize: 13, color: C.subtle }}>Cobrança ativa (exige assinatura paga)</span>
          </label>
          <div style={{ fontSize: 11, color: C.muted, margin: "4px 0 14px 26px", lineHeight: 1.4 }}>Desligado = todos liberados sem pagar (fase de testes).</div>

          <Field label="Dias de trial para novos usuários">
            <Inp type="number" min={0} max={365} value={form.trialDias ?? 0} onChange={(e) => set("trialDias", e.target.value)} style={{ maxWidth: 120 }} />
            <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>0 = sem prazo. Ex.: 14 → novo usuário entra em trial de 14 dias.</div>
          </Field>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", margin: "16px 0" }}>
            <input type="checkbox" checked={form.iaImportAtiva !== false} onChange={(e) => set("iaImportAtiva", e.target.checked)} />
            <span style={{ fontSize: 13, color: C.subtle }}>Leitura de fatura com IA ativa</span>
          </label>
          <Field label="Aviso global (banner no app)">
            <textarea value={form.avisoGlobal || ""} onChange={(e) => set("avisoGlobal", e.target.value)} rows={2} placeholder="Deixe em branco para não exibir."
              style={{ width: "100%", padding: "10px 13px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>Mostrado no topo do app para todos os usuários.</div>
          </Field>
        </div>
      )}
    </div>
  );
}
