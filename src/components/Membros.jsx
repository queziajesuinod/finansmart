// @ts-nocheck
// Membros = principal + dependentes (familiares geridos na mesma conta).
// Reúne os helpers de resolução e os 3 componentes reutilizáveis:
//  - MembroSelect: escolhe o membro ao criar um lançamento/empréstimo/parcelado.
//  - MembroFilter: faixa de chips "Todos + membros" para filtrar listas.
//  - MembrosManager: CRUD de dependentes (usado no Perfil e no cadastro).
import { useState, useEffect } from "react";
import { C, genId, fmt } from "../lib/constants";
import { Sel, Inp, Btn, Label, Card } from "./ui";
import { Users, Trash2, UserPlus, Star } from "../lib/icons.jsx";
import { getPlans } from "../lib/api";

// ─── Helpers de resolução ────────────────────────────────────
export function principalDe(membros) {
  return (membros || []).find((m) => m.tipo === "principal") || null;
}
export function principalId(membros) {
  const p = principalDe(membros);
  return p ? p.id : null;
}
// Ordena: principal primeiro, depois dependentes por ordem/nome.
export function membrosOrdenados(membros) {
  return [...(membros || [])].sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === "principal" ? -1 : 1;
    return (a.ordem ?? 0) - (b.ordem ?? 0) || String(a.nome).localeCompare(String(b.nome));
  });
}
// membroId "efetivo": null/ausente ⇒ principal.
export function membroEfetivo(membroId, membros) {
  return membroId || principalId(membros);
}
export function nomeMembro(membroId, membros) {
  const id = membroEfetivo(membroId, membros);
  const m = (membros || []).find((x) => x.id === id);
  return m ? m.nome : "Principal";
}
// Um item (com .membroId) pertence ao membro alvo? "todos" ⇒ sempre.
export function pertenceAoMembro(item, alvoId, membros) {
  if (!alvoId || alvoId === "todos") return true;
  return membroEfetivo(item && item.membroId, membros) === alvoId;
}
const primeiroNome = (nome) => String(nome || "").trim().split(/\s+/)[0] || nome;

// ─── Seletor (formulários de criação) ────────────────────────
export function MembroSelect({ membros, value, onChange, label = "Membro", style = {} }) {
  const lista = membrosOrdenados(membros);
  if (lista.length <= 1) return null; // só o principal → não precisa escolher
  const val = membroEfetivo(value, membros) || "";
  return (
    <div style={style}>
      {label && <Label>{label}</Label>}
      <Sel value={val} onChange={(e) => onChange(e.target.value)}>
        {lista.map((m) => (
          <option key={m.id} value={m.id}>{m.nome}{m.tipo === "principal" ? " (principal)" : ""}</option>
        ))}
      </Sel>
    </div>
  );
}

// ─── Filtro por membro (faixa de chips, mobile-first) ────────
// value: "todos" | membroId. counts: { [membroId]: valorFormatado } opcional.
export function MembroFilter({ membros, value = "todos", onChange, counts }) {
  const lista = membrosOrdenados(membros);
  if (lista.length <= 1) return null;
  const chips = [{ id: "todos", nome: "Todos", tipo: null }, ...lista];
  return (
    <div className="tab-strip" style={{ padding: "0 0 12px" }}>
      {chips.map((m) => {
        const on = value === m.id || (value == null && m.id === "todos");
        return (
          <button key={m.id} onClick={() => onChange(m.id)} style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 999,
            cursor: "pointer", fontSize: 12.5, fontWeight: on ? 700 : 600, whiteSpace: "nowrap",
            border: `1px solid ${on ? C.accent : C.border}`,
            background: on ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
            color: on ? C.accent : C.muted,
          }}>
            {m.tipo === "principal" && <Star size={12} />}
            {m.id === "todos" ? "Todos" : primeiroNome(m.nome)}
            {counts && counts[m.id] != null && <span style={{ fontSize: 11, opacity: 0.8 }}>· {counts[m.id]}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Gestão de dependentes (Perfil) ──────────────────────────
// Recebe a lista atual e um onSave(novaLista) que persiste. Mantém o principal
// fixo (não removível); permite adicionar/editar/remover dependentes.
export function MembrosManager({ membros, onSave, saving, access = null }) {
  const [list, setList] = useState(() => membrosOrdenados(membros));
  const [novo, setNovo] = useState({ nome: "", parentesco: "" });
  const [confirmarPreco, setConfirmarPreco] = useState(false);
  const [removerAlvo, setRemoverAlvo] = useState(null);

  const principal = principalDe(list);
  const deps = list.filter((m) => m.tipo === "dependente");

  // Preço da assinatura: base + (nº de dependentes × valor por dependente).
  const [plans, setPlans] = useState([]);
  useEffect(() => { getPlans().then((ps) => setPlans(ps || [])).catch(() => {}); }, []);
  const planoAtual = (plans.find((p) => p.slug === (access && access.plano && access.plano.slug))) || plans.find((p) => p.precoDependenteCentavos > 0) || plans[0] || null;
  const baseCentavos = planoAtual ? planoAtual.precoCentavos || 0 : 0;
  const perDepCentavos = planoAtual ? planoAtual.precoDependenteCentavos || 0 : 0;
  const precoDe = (n) => (baseCentavos + n * perDepCentavos) / 100;
  const depsAtuais = (membros || []).filter((m) => m.tipo === "dependente" && m.ativo !== false).length;
  const depsNovos = list.filter((m) => m.tipo === "dependente" && m.ativo !== false).length;

  const updDep = (id, k, v) => setList((l) => l.map((m) => (m.id === id ? { ...m, [k]: v } : m)));
  const rmDep = (id) => setList((l) => l.filter((m) => m.id !== id));
  function addDep() {
    if (!novo.nome.trim()) return;
    setList((l) => [...l, { id: genId(), nome: novo.nome.trim(), parentesco: novo.parentesco.trim() || null, tipo: "dependente", ordem: l.length, ativo: true }]);
    setNovo({ nome: "", parentesco: "" });
  }
  const dirty = JSON.stringify(membrosOrdenados(membros)) !== JSON.stringify(membrosOrdenados(list));

  // Ao salvar: se aumentou o nº de dependentes (custo maior), pede aprovação do preço.
  function handleSalvar() {
    if (depsNovos > depsAtuais && perDepCentavos > 0) { setConfirmarPreco(true); return; }
    onSave(list);
  }

  return (
    <div>
      {/* Principal (fixo) */}
      {principal && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
          <Star size={14} color={C.accent} />
          <span style={{ fontSize: 13, fontWeight: 700, flex: 1, minWidth: 0 }}>{principal.nome}</span>
          <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Principal</span>
        </div>
      )}

      {/* Dependentes */}
      {deps.map((d) => (
        <div key={d.id} className="card-profile-grid" style={{ gridTemplateColumns: "1.4fr 1fr auto", background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
          <div><Label>Nome</Label><Inp value={d.nome} onChange={(e) => updDep(d.id, "nome", e.target.value)} /></div>
          <div><Label>Parentesco</Label><Inp placeholder="Ex: Filha, Cônjuge" value={d.parentesco || ""} onChange={(e) => updDep(d.id, "parentesco", e.target.value)} /></div>
          <button className="cp-btn mini-act" aria-label="Remover dependente" onClick={() => setRemoverAlvo(d)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: C.red, cursor: "pointer" }}><Trash2 size={14} /></button>
        </div>
      ))}

      {/* Adicionar dependente */}
      <div className="card-profile-grid" style={{ gridTemplateColumns: "1.4fr 1fr auto", borderTop: `1px dashed ${C.border}`, marginTop: 6, paddingTop: 12 }}>
        <div><Label>Novo dependente</Label><Inp placeholder="Nome" value={novo.nome} onChange={(e) => setNovo((p) => ({ ...p, nome: e.target.value }))} /></div>
        <div><Label>Parentesco</Label><Inp placeholder="Opcional" value={novo.parentesco} onChange={(e) => setNovo((p) => ({ ...p, parentesco: e.target.value }))} /></div>
        <Btn className="cp-btn" variant="sm" onClick={addDep}><UserPlus size={14} /></Btn>
      </div>

      {dirty && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Btn onClick={handleSalvar} disabled={saving}><Users size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Salvar familiares</Btn>
          <Btn variant="ghost" onClick={() => setList(membrosOrdenados(membros))}>Desfazer</Btn>
          {depsNovos > depsAtuais && perDepCentavos > 0
            ? <span style={{ fontSize: 11, color: C.amber }}>novo valor: {fmt(precoDe(depsNovos))}/mês</span>
            : <span style={{ fontSize: 11, color: C.amber }}>alterações não salvas</span>}
        </div>
      )}

      {removerAlvo && (
        <div onClick={() => setRemoverAlvo(null)} style={{ position: "fixed", inset: 0, background: "var(--scrim)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400 }}>
            <Card style={{ padding: "22px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: "color-mix(in srgb, var(--danger) 14%, transparent)", color: C.red, display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={19} /></div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Remover {removerAlvo.nome}?</div>
              </div>
              <p style={{ fontSize: 13, color: C.subtle, lineHeight: 1.6, marginBottom: 16 }}>
                Ao salvar, todos os lançamentos, empréstimos e compras vinculados a <strong>{removerAlvo.nome}</strong> voltam para o principal, e o valor da assinatura é reduzido{perDepCentavos > 0 ? ` em ${fmt(perDepCentavos / 100)}/mês` : ""}.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Btn variant="danger" onClick={() => { rmDep(removerAlvo.id); setRemoverAlvo(null); }} style={{ width: "100%" }}>Remover dependente</Btn>
                <Btn variant="ghost" onClick={() => setRemoverAlvo(null)} style={{ width: "100%" }}>Cancelar</Btn>
              </div>
            </Card>
          </div>
        </div>
      )}

      {confirmarPreco && (
        <div onClick={() => setConfirmarPreco(false)} style={{ position: "fixed", inset: 0, background: "var(--scrim)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400 }}>
            <Card style={{ padding: "22px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: "color-mix(in srgb, var(--warning) 16%, transparent)", color: C.amber, display: "flex", alignItems: "center", justifyContent: "center" }}><Users size={20} /></div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Ajuste na assinatura</div>
              </div>
              <p style={{ fontSize: 13, color: C.subtle, lineHeight: 1.6, marginBottom: 14 }}>
                Você está adicionando <strong>{depsNovos - depsAtuais} {depsNovos - depsAtuais > 1 ? "novos dependentes" : "novo dependente"}</strong>. Isso altera o valor da sua assinatura.
              </p>
              <div style={{ background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 6 }}>
                  <span>Valor atual{planoAtual ? ` (${planoAtual.nome})` : ""}</span>
                  <span>{fmt(precoDe(depsAtuais))}/mês</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800 }}>
                  <span style={{ color: C.text }}>Novo valor</span>
                  <span style={{ color: C.amber }}>{fmt(precoDe(depsNovos))}/mês</span>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>+{fmt(((depsNovos - depsAtuais) * perDepCentavos) / 100)}/mês ({fmt(perDepCentavos / 100)} por dependente).</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Btn onClick={() => { setConfirmarPreco(false); onSave(list); }} style={{ width: "100%" }}>Aprovar novo valor e salvar</Btn>
                <Btn variant="ghost" onClick={() => setConfirmarPreco(false)} style={{ width: "100%" }}>Cancelar</Btn>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
