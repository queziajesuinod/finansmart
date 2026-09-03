// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { C, CATEGORIES, todayStr, fmt, genId, catById, tint, addMonths, monthDiff } from "../../lib/constants";
import { Card, Label, Field, Inp, Sel, Btn, Badge, Bar, Empty, STitle, Divider, IcoTxt, MoneyInput } from "../ui";
import { CatIcon, Pencil, Trash2, Save, Check, ShoppingBag, Flag, Siren } from "../../lib/icons.jsx";
import { MembroSelect, MembroFilter, pertenceAoMembro, membrosOrdenados, nomeMembro } from "../Membros.jsx";

export default function ParceladosTab({ parcelados, setParcelados, year, monthIdx, membros = [], cartoesDisponiveis = [] }) {
  const EMPTY = { descricao: "", valorTotal: "", totalParcelas: "", parcelaAtual: "1", dataCompra: todayStr(), categoria: "outros", membroId: null, origem: "" };
  // Cartões oferecidos no seletor (dedup por nome). Com cartão → abate o limite
  // daquele cartão; sem cartão → carnê/boleto, entra só na despesa.
  const cartoesOpts = [...new Map((cartoesDisponiveis || []).filter((c) => c && c.nome).map((c) => [c.nome, c])).values()];
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filtroMembro, setFiltroMembro] = useState("todos");
  const formRef = useRef(null);
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // Ao editar (form abre no topo, mas o card pode estar lá embaixo), rola até o formulário.
  useEffect(() => {
    if (showForm && editId && formRef.current) formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showForm, editId]);

  const valorTotal = parseFloat((form.valorTotal || "").replace(",", ".")) || 0;
  const n = parseInt(form.totalParcelas) || 0;
  const pAtual = parseInt(form.parcelaAtual) || 1;
  const valorParcela = n > 0 ? valorTotal / n : 0;

  // Mês final = mês da compra + (totalParcelas − 1), com aritmética de mês segura
  // (addMonths evita o overflow de dia do JS que estourava o mês em compras dia 29-31).
  function getStatus(p) {
    const fimMes = addMonths(p.dataCompra, p.totalParcelas - 1);
    const ref = new Date(year, monthIdx, 1);
    if (fimMes < ref) return { label: "Quitado", color: C.emerald };
    const parcRestante = Math.max(0, p.totalParcelas - getParcelaAtualNum(p) + 1);
    return { label: `${parcRestante} restante${parcRestante !== 1 ? "s" : ""}`, color: C.cyan };
  }
  function getParcelaAtualNum(p) {
    // Diferença exata em meses de calendário (sem aproximação de 30 dias, que drifta).
    const parcela = monthDiff(p.dataCompra, new Date(year, monthIdx, 1)) + 1;
    return Math.min(p.totalParcelas, Math.max(1, parcela));
  }

  function submit() {
    if (!form.descricao || !valorTotal || !n) return;
    const entry = { ...form, valorTotal, totalParcelas: n, parcelaAtual: pAtual, valorParcela, id: editId || genId() };
    if (editId) setParcelados(parcelados.map((p) => (p.id === editId ? entry : p)));
    else setParcelados([...parcelados, entry]);
    setForm(EMPTY); setEditId(null); setShowForm(false);
  }
  function startEdit(p) { setForm({ ...p, valorTotal: String(p.valorTotal), totalParcelas: String(p.totalParcelas), parcelaAtual: String(p.parcelaAtual) }); setEditId(p.id); setShowForm(true); }

  // Baixa manual por parcela: alterna a parcela nº `parcela` entre paga/não paga.
  // É só status/histórico — a parcela conta como despesa pela data, independente disto.
  function toggleParcelaPaga(p, parcela) {
    setParcelados(parcelados.map((x) => {
      if (x.id !== p.id) return x;
      const atuais = Array.isArray(x.pagas) ? x.pagas : [];
      const nova = atuais.includes(parcela) ? atuais.filter((k) => k !== parcela) : [...atuais, parcela].sort((a, b) => a - b);
      return { ...x, pagas: nova };
    }));
  }

  const noMembro = (p) => pertenceAoMembro(p, filtroMembro, membros);
  const ativas = parcelados.filter((p) => addMonths(p.dataCompra, p.totalParcelas - 1) >= new Date(year, monthIdx, 1)).filter(noMembro);
  const quitadas = parcelados.filter((p) => addMonths(p.dataCompra, p.totalParcelas - 1) < new Date(year, monthIdx, 1)).filter(noMembro);
  const totalMes = ativas.reduce((s, p) => s + p.valorParcela, 0);
  const temMembros = membrosOrdenados(membros).length > 1;

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
              {parcelados.filter((p) => { const fim = addMonths(p.dataCompra, p.totalParcelas - 1); return fim.getFullYear() === year && fim.getMonth() === monthIdx; }).length > 0 && (
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
        <div ref={formRef} style={{ scrollMarginTop: 12 }}>
        <Card style={{ marginBottom: 16 }}>
          <STitle>{editId ? "Editar" : "Nova compra parcelada"}</STitle>
          <div className="form-grid-2" style={{ marginBottom: 12 }}>
            <Field label="Descrição" span={2}><Inp placeholder="Ex: TV Samsung, Curso..." value={form.descricao} onChange={f("descricao")} /></Field>
            <Field label="Valor Total (R$)"><MoneyInput placeholder="0,00" value={form.valorTotal} onChange={f("valorTotal")} /></Field>
            <Field label="Total de Parcelas"><Inp type="number" placeholder="Ex: 12" value={form.totalParcelas} onChange={f("totalParcelas")} /></Field>
            <Field label="Parcela Atual"><Inp type="number" placeholder="1" value={form.parcelaAtual} onChange={f("parcelaAtual")} /></Field>
            <Field label="Data da Compra"><Inp type="date" value={form.dataCompra} onChange={f("dataCompra")} /></Field>
            <Field label="Categoria" span={2}>
              <Sel value={form.categoria} onChange={f("categoria")}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </Sel>
            </Field>
            <Field label="Cartão" span={2}>
              <Sel value={form.origem || ""} onChange={f("origem")}>
                <option value="">Sem cartão (carnê / boleto)</option>
                {form.origem && !cartoesOpts.some((c) => c.nome === form.origem) && <option value={form.origem}>{form.origem}</option>}
                {cartoesOpts.map((c) => <option key={c.nome} value={c.nome}>{c.nome}{c.banco ? ` · ${c.banco}` : ""}</option>)}
              </Sel>
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 5, lineHeight: 1.4 }}>Com cartão, a compra abate o limite dele. Sem cartão, entra só nas despesas do mês.</div>
            </Field>
          </div>
          <MembroSelect membros={membros} value={form.membroId} onChange={(v) => setForm((p) => ({ ...p, membroId: v }))} label="De quem é esta compra?" style={{ marginBottom: 12 }} />
          {valorTotal > 0 && n > 0 && (
            <div style={{ background: "rgba(6,182,212,0.07)", border: `1px solid rgba(6,182,212,0.2)`, borderRadius: 10, padding: "12px", marginBottom: 14 }}>
              <div className="stat-grid">
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
        </div>
      )}

      <MembroFilter membros={membros} value={filtroMembro} onChange={setFiltroMembro} />

      {parcelados.length === 0 && !showForm && <Empty icon="" title="Nenhuma compra parcelada" sub='Clique em "+ Nova compra" para registrar.' />}

      {ativas.length > 0 && <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ativas ({ativas.length})</div>}
      {ativas.map((p) => {
        const cat = catById(p.categoria);
        const st = getStatus(p);
        const curParcela = getParcelaAtualNum(p);
        const pagas = Array.isArray(p.pagas) ? p.pagas : [];
        const curPaga = pagas.includes(curParcela);
        const pct = p.totalParcelas > 0 ? (curParcela / p.totalParcelas) * 100 : 0;
        const fim = addMonths(p.dataCompra, p.totalParcelas - 1);
        const encerrando = fim.getFullYear() === year && fim.getMonth() === monthIdx;
        return (
          <Card key={p.id} style={{ marginBottom: 10, border: encerrando ? `1px solid rgba(245,158,11,0.35)` : undefined }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `color-mix(in srgb, ${cat.color} 10%, transparent)`, color: cat.color, display: "flex", alignItems: "center", justifyContent: "center" }}><CatIcon id={cat.id} size={18} /></div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {p.descricao}
                    {temMembros && <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, background: "color-mix(in srgb, var(--accent) 12%, transparent)", padding: "2px 8px", borderRadius: 20 }}>{nomeMembro(p.membroId, membros)}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>{cat.label} · Compra: {new Date(p.dataCompra + "T12:00:00").toLocaleDateString("pt-BR")}{p.origem ? ` · ${p.origem}` : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                <button className="mini-act" aria-label="Editar" onClick={() => startEdit(p)} style={{ padding: "6px 8px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, color: C.indigo, cursor: "pointer" }}><Pencil size={14} /></button>
                <button className="mini-act" aria-label="Excluir" onClick={() => setParcelados(parcelados.filter((x) => x.id !== p.id))} style={{ padding: "6px 8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: C.red, cursor: "pointer" }}><Trash2 size={13} /></button>
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
            {/* Baixa manual da parcela do mês vigente (carnê/boleto ou controle próprio). */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap", borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
              <span style={{ fontSize: 11, color: C.muted }}>Parcelas pagas: <b style={{ color: C.emerald }}>{pagas.length}</b> de {p.totalParcelas}</span>
              <button onClick={() => toggleParcelaPaga(p, curParcela)} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${curPaga ? tint(C.emerald, 45) : C.border}`, background: curPaga ? tint(C.emerald, 12) : "transparent", color: curPaga ? C.emerald : C.subtle }}>
                {curPaga ? <><Check size={13} /> Parcela {curParcela} paga</> : `Marcar parcela ${curParcela} paga`}
              </button>
            </div>
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
                <div style={{ fontSize: 10, color: C.muted }}>{p.totalParcelas}x de {fmt(p.valorParcela)} · {fmt(p.valorTotal)} total{temMembros ? ` · ${nomeMembro(p.membroId, membros)}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Badge label="Quitado" color={C.emerald} />
                <button className="mini-act" aria-label="Excluir" onClick={() => setParcelados(parcelados.filter((x) => x.id !== p.id))} style={{ padding: "5px 7px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: C.red, cursor: "pointer" }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
