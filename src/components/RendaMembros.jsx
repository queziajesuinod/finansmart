// @ts-nocheck
// Renda por membro: cadastro de N holerites (renda fixa) e N rendas extras por
// pessoa. A renda fixa do mês é a soma da renda dos holerites vigentes
// (líquido = salário bruto − descontos; + benefícios/"outros rendimentos").
// Os benefícios contam na renda fixa.
import { useState } from "react";
import { Card, MoneyInput, Btn, Label, Inp } from "./ui";
import { C, fmt, genId, mesRefDe, holeritesVigentes, rendaHolerite, totalOutrosRendimentos, rendasExtrasDoMes, MONTH_NAMES } from "../lib/constants";
import { membrosOrdenados, principalId, principalDe } from "./Membros.jsx";
import { ScrollText, Wallet, Plus, Trash2, X, Check, Pencil } from "../lib/icons.jsx";

const n = (v) => Number(String(v == null ? "" : v).replace(",", ".")) || 0;
const mesmo = (a, b) => (a || null) === (b || null);
// "2026-06" → "jun/2026"
function labelMesRef(ref) {
  const [y, m] = String(ref || "").split("-").map(Number);
  if (!y || !m || !MONTH_NAMES[m - 1]) return "";
  return `${MONTH_NAMES[m - 1].slice(0, 3).toLowerCase()}/${y}`;
}

function LinhaValor({ item, onNome, onValor, onRemover, placeholder }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
      <Inp placeholder={placeholder} value={item.nome} onChange={(e) => onNome(e.target.value)} style={{ flex: 1, padding: "8px 10px", fontSize: 12 }} />
      <MoneyInput placeholder="0,00" value={item.valor} onChange={(e) => onValor(e.target.value)} style={{ width: 110, padding: "8px 10px", fontSize: 12 }} />
      <button onClick={onRemover} title="Remover" style={{ width: 34, flexShrink: 0, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}><Trash2 size={14} /></button>
    </div>
  );
}

export default function RendaMembros({ membros = [], holerites = [], setHolerites, rendasExtras = [], setRendasExtras, year, monthIdx }) {
  const [editH, setEditH] = useState(null);       // holerite em edição
  const [extraForm, setExtraForm] = useState(null); // { id?, membroId, descricao, valor }
  const mr = mesRefDe(year, monthIdx);

  const lista = membrosOrdenados(membros);
  const temMembros = lista.length > 1;
  const pid = principalId(membros);
  const keyMembro = (mid) => (mid && mid !== pid ? mid : null); // principal ⇒ null

  const holsVig = holeritesVigentes(holerites, year, monthIdx);
  const extrasMes = rendasExtrasDoMes(rendasExtras, year, monthIdx);

  // Blocos: um por membro; sem dependentes, um bloco único (principal).
  const nomePrincipal = (principalDe(membros) || {}).nome || "Você";
  const blocos = temMembros
    ? lista.map((m) => ({ key: keyMembro(m.id), nome: m.nome }))
    : [{ key: null, nome: nomePrincipal }];

  // ── Holerite ──────────────────────────────────────────────
  function novoHolerite(key) {
    setEditH({ id: genId(), membroId: key, mesRef: mr, titulo: "", salarioBruto: "", descontos: [{ nome: "INSS", valor: "" }, { nome: "IRPF", valor: "" }], outrosRendimentos: [], recorrente: true, _novo: true });
  }
  function editarHolerite(h) {
    // Holerite herdado (de um mês anterior): editar num mês posterior cria uma
    // NOVA versão para o mês atual (aumento), preservando o registro de origem.
    const herdado = h.mesRef !== mr;
    setEditH({
      ...h,
      id: herdado ? genId() : h.id,
      mesRef: herdado ? mr : h.mesRef,
      _novo: herdado,
      _origem: herdado ? h.mesRef : null,
      salarioBruto: h.salarioBruto ? String(h.salarioBruto) : "",
      descontos: (h.descontos || []).map((d) => ({ nome: d.nome || "", valor: d.valor != null ? String(d.valor) : "" })),
      outrosRendimentos: (h.outrosRendimentos || []).map((d) => ({ nome: d.nome || "", valor: d.valor != null ? String(d.valor) : "" })),
    });
  }
  function salvarHolerite() {
    const h = {
      id: editH.id, membroId: editH.membroId || null, mesRef: editH.mesRef || mr,
      titulo: (editH.titulo || "").trim(),
      salarioBruto: n(editH.salarioBruto),
      descontos: (editH.descontos || []).map((d) => ({ nome: (d.nome || "").trim(), valor: n(d.valor) })).filter((d) => d.nome || d.valor),
      outrosRendimentos: (editH.outrosRendimentos || []).map((d) => ({ nome: (d.nome || "").trim(), valor: n(d.valor) })).filter((d) => d.nome || d.valor),
      recorrente: editH.recorrente !== false,
    };
    setHolerites([...(holerites || []).filter((x) => x.id !== h.id), h]);
    setEditH(null);
  }
  function removerHolerite(id) { setHolerites((holerites || []).filter((x) => x.id !== id)); }

  // ── Renda extra ───────────────────────────────────────────
  function salvarExtra() {
    const ex = { id: extraForm.id || genId(), membroId: extraForm.membroId || null, mesRef: extraForm.mesRef || mr, descricao: (extraForm.descricao || "").trim() || "Renda extra", valor: n(extraForm.valor), recorrente: extraForm.recorrente === true };
    setRendasExtras([...(rendasExtras || []).filter((x) => x.id !== ex.id), ex]);
    setExtraForm(null);
  }
  function removerExtra(id) { setRendasExtras((rendasExtras || []).filter((x) => x.id !== id)); }

  const liquidoEdit = editH ? n(editH.salarioBruto) - (editH.descontos || []).reduce((s, d) => s + n(d.valor), 0) : 0;
  const beneficiosEdit = editH ? (editH.outrosRendimentos || []).reduce((s, d) => s + n(d.valor), 0) : 0;
  const rendaEdit = liquidoEdit + beneficiosEdit;

  return (
    <Card style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <ScrollText size={16} style={{ color: C.accent }} />
        <div style={{ fontSize: 14, fontWeight: 800 }}>Renda por pessoa · holerites</div>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>Cadastre o holerite de cada pessoa (pode ter mais de um trabalho). A renda fixa do mês é a soma dos <strong style={{ color: C.subtle }}>líquidos</strong>. Holerite recorrente vale nos meses seguintes até você cadastrar outro.</div>

      {/* Formulário de holerite */}
      {editH && (
        <div style={{ background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{editH._origem ? `Atualizar a partir de ${labelMesRef(mr)}` : (editH._novo ? "Novo holerite" : "Editar holerite")}</div>
            <button onClick={() => setEditH(null)} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer" }}><X size={18} /></button>
          </div>
          {editH._origem && (
            <div style={{ fontSize: 11, color: C.accent, background: `color-mix(in srgb, ${C.accent} 8%, transparent)`, borderRadius: 8, padding: "7px 10px", marginBottom: 10, lineHeight: 1.4 }}>Cria um novo valor a partir de <strong>{labelMesRef(mr)}</strong>. O holerite de {labelMesRef(editH._origem)} não muda.</div>
          )}
          <Label>Título (ex.: empresa/trabalho)</Label>
          <Inp placeholder="Ex.: CLT — Empresa X" value={editH.titulo} onChange={(e) => setEditH({ ...editH, titulo: e.target.value })} style={{ marginBottom: 10 }} />
          <Label>Salário bruto</Label>
          <MoneyInput placeholder="0,00" value={editH.salarioBruto} onChange={(e) => setEditH({ ...editH, salarioBruto: e.target.value })} style={{ marginBottom: 12 }} />

          <Label>Descontos</Label>
          {(editH.descontos || []).map((d, i) => (
            <LinhaValor key={i} item={d} placeholder="Ex.: INSS"
              onNome={(v) => setEditH({ ...editH, descontos: editH.descontos.map((x, j) => (j === i ? { ...x, nome: v } : x)) })}
              onValor={(v) => setEditH({ ...editH, descontos: editH.descontos.map((x, j) => (j === i ? { ...x, valor: v } : x)) })}
              onRemover={() => setEditH({ ...editH, descontos: editH.descontos.filter((_, j) => j !== i) })} />
          ))}
          <button onClick={() => setEditH({ ...editH, descontos: [...(editH.descontos || []), { nome: "", valor: "" }] })} style={{ background: "transparent", border: `1px dashed ${C.border}`, color: C.muted, borderRadius: 8, padding: "7px 10px", fontSize: 12, cursor: "pointer", marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6 }}><Plus size={13} /> desconto</button>

          <Label>Outros rendimentos (VR, VA…) — contam na renda fixa</Label>
          {(editH.outrosRendimentos || []).map((d, i) => (
            <LinhaValor key={i} item={d} placeholder="Ex.: Vale Refeição"
              onNome={(v) => setEditH({ ...editH, outrosRendimentos: editH.outrosRendimentos.map((x, j) => (j === i ? { ...x, nome: v } : x)) })}
              onValor={(v) => setEditH({ ...editH, outrosRendimentos: editH.outrosRendimentos.map((x, j) => (j === i ? { ...x, valor: v } : x)) })}
              onRemover={() => setEditH({ ...editH, outrosRendimentos: editH.outrosRendimentos.filter((_, j) => j !== i) })} />
          ))}
          <button onClick={() => setEditH({ ...editH, outrosRendimentos: [...(editH.outrosRendimentos || []), { nome: "", valor: "" }] })} style={{ background: "transparent", border: `1px dashed ${C.border}`, color: C.muted, borderRadius: 8, padding: "7px 10px", fontSize: 12, cursor: "pointer", marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6 }}><Plus size={13} /> rendimento</button>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.subtle, marginBottom: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={editH.recorrente !== false} onChange={(e) => setEditH({ ...editH, recorrente: e.target.checked })} />
            Repetir nos próximos meses (renda fixa recorrente)
          </label>

          <div style={{ padding: "10px 0", borderTop: `1px solid ${C.border}`, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: C.muted }}>Renda (líquido + benefícios)</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.emerald }}>{fmt(rendaEdit)}</span>
            </div>
            {beneficiosEdit > 0 && (
              <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>líquido {fmt(liquidoEdit)} · benefícios {fmt(beneficiosEdit)}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="success" onClick={salvarHolerite} style={{ flex: 1 }}><Check size={15} style={{ marginRight: 6 }} /> Salvar</Btn>
            <Btn variant="ghost" onClick={() => setEditH(null)}>Cancelar</Btn>
          </div>
        </div>
      )}

      {/* Blocos por membro */}
      {blocos.map((b) => {
        const hs = holsVig.filter((h) => mesmo(h.membroId, b.key));
        const exs = extrasMes.filter((r) => mesmo(r.membroId, b.key));
        const liq = hs.reduce((s, h) => s + rendaHolerite(h), 0);
        const totExtra = exs.reduce((s, r) => s + (Number(r.valor) || 0), 0);
        return (
          <div key={b.key || "principal"} style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{b.nome}</div>
              <div style={{ fontSize: 12, color: C.muted }}>fixa <strong style={{ color: C.emerald }}>{fmt(liq)}</strong>{totExtra > 0 ? <> · extra <strong style={{ color: C.accent }}>{fmt(totExtra)}</strong></> : null}</div>
            </div>

            {hs.map((h) => (
              <div key={h.id} style={{ background: "var(--fill-2)", borderRadius: 9, padding: "9px 11px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.border}` }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `color-mix(in srgb, ${C.emerald} 10%, transparent)`, color: C.emerald, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Wallet size={15} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.titulo || "Holerite"}{h.recorrente === false ? " (só este mês)" : ""}{h.mesRef !== mr ? <span style={{ fontWeight: 600, color: C.accent }}> · desde {labelMesRef(h.mesRef)}</span> : null}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>bruto {fmt(Number(h.salarioBruto) || 0)}{totalOutrosRendimentos(h) > 0 ? ` · benefícios ${fmt(totalOutrosRendimentos(h))}` : ""}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.emerald, flexShrink: 0 }}>{fmt(rendaHolerite(h))}</span>
                <button onClick={() => editarHolerite(h)} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", flexShrink: 0 }}><Pencil size={14} /></button>
                <button onClick={() => removerHolerite(h.id)} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", flexShrink: 0 }}><Trash2 size={14} /></button>
              </div>
            ))}

            {exs.map((r) => (
              <div key={r.id} style={{ background: "var(--fill-2)", borderRadius: 9, padding: "9px 11px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.border}` }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `color-mix(in srgb, ${C.accent} 12%, transparent)`, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Plus size={15} /></div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.descricao || "Renda extra"}{r.recorrente ? (r.mesRef !== mr ? <span style={{ color: C.accent }}> · desde {labelMesRef(r.mesRef)}</span> : <span style={{ color: C.muted }}> · mensal</span>) : null}</div>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.accent, flexShrink: 0 }}>{fmt(Number(r.valor) || 0)}</span>
                <button onClick={() => removerExtra(r.id)} title="Excluir (para todos os meses)" style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", flexShrink: 0 }}><Trash2 size={14} /></button>
              </div>
            ))}

            {extraForm && mesmo(extraForm.membroId, b.key) && (
              <div style={{ background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 9, padding: 10, margin: "6px 0" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <Inp placeholder="Descrição (ex.: freela)" value={extraForm.descricao} onChange={(e) => setExtraForm({ ...extraForm, descricao: e.target.value })} style={{ flex: 1, padding: "8px 10px", fontSize: 12 }} />
                  <MoneyInput placeholder="0,00" value={extraForm.valor} onChange={(e) => setExtraForm({ ...extraForm, valor: e.target.value })} style={{ width: 110, padding: "8px 10px", fontSize: 12 }} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.subtle, marginBottom: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={extraForm.recorrente === true} onChange={(e) => setExtraForm({ ...extraForm, recorrente: e.target.checked })} />
                  Repetir nos próximos meses (renda extra mensal)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="success" onClick={salvarExtra} style={{ flex: 1, padding: "8px" }}><Check size={14} style={{ marginRight: 5 }} /> Salvar</Btn>
                  <Btn variant="ghost" onClick={() => setExtraForm(null)} style={{ padding: "8px 14px" }}>Cancelar</Btn>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => novoHolerite(b.key)} style={{ background: "transparent", border: `1px dashed ${C.border}`, color: C.accent, borderRadius: 8, padding: "7px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Plus size={13} /> Holerite</button>
              <button onClick={() => setExtraForm({ membroId: b.key, descricao: "", valor: "" })} style={{ background: "transparent", border: `1px dashed ${C.border}`, color: C.muted, borderRadius: 8, padding: "7px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><Plus size={13} /> Renda extra</button>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
