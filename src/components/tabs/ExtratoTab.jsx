// @ts-nocheck
import { useState } from "react";
import { C, todayStr, fmt, catById, entradasDoMes } from "../../lib/constants";
import { parcelaEmprestimoNoMes } from "../../lib/finance";
import { Card, Field, Inp, Sel, Btn, Empty, STitle, IcoTxt, MoneyInput } from "../ui";
import { CatIcon, CreditCard, Pencil, Trash2, RefreshCw, Save, Wallet, BanknoteArrowDown } from "../../lib/icons.jsx";
import { MerchantIcon, CardBrandTile } from "../../lib/brandIcons.jsx";
import { MembroFilter, pertenceAoMembro, membrosOrdenados, nomeMembro } from "../Membros.jsx";

export default function ExtratoTab({ despesas, setDespesasMk, totalDespesas, cartoes, emprestimos = [], holerites = [], rendasExtras = [], temReceitas = false, monthIdx, year, setTab, membros = [] }) {
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ descricao: "", valor: "", categoria: "outros", data: todayStr(), fixo: false });
  const [filtroMembro, setFiltroMembro] = useState("todos");
  const [ordem, setOrdem] = useState("data-desc");

  // Ordena os lançamentos conforme a opção escolhida (data recentes/antigas, valor).
  function ordenar(arr) {
    const a = [...arr];
    switch (ordem) {
      case "data-asc": return a.sort((x, y) => new Date(x.data) - new Date(y.data));
      case "valor-desc": return a.sort((x, y) => y.valor - x.valor);
      case "valor-asc": return a.sort((x, y) => x.valor - y.valor);
      default: return a.sort((x, y) => new Date(y.data) - new Date(x.data)); // data-desc
    }
  }

  function startEdit(d) { setForm({ descricao: d.descricao, valor: String(d.valor), categoria: d.categoria, data: d.data, fixo: d.fixo || false }); setEditId(d.id); }
  function saveEdit() {
    const val = parseFloat(String(form.valor).replace(",", ".")) || 0;
    if (!form.descricao || val <= 0) return;
    setDespesasMk((p) => p.map((d) => (d.id === editId ? { ...form, valor: val, id: editId } : d)));
    setEditId(null);
  }

  const cartoesMesAll = (cartoes || []).filter((c) => c.mesRef === `${year}-${monthIdx}`);
  const temMembros = membrosOrdenados(membros).length > 1;

  // Filtro por membro (principal x dependentes) sobre despesas e compras de cartão.
  const despesasFiltradas = despesas.filter((d) => pertenceAoMembro(d, filtroMembro, membros));
  const cartoesMes = cartoesMesAll
    .map((c) => {
      const compras = (c.compras || []).filter((x) => pertenceAoMembro(x, filtroMembro, membros));
      return { ...c, comprasFiltradas: compras, totalFiltrado: compras.reduce((s, x) => s + (x.valor || 0), 0) };
    })
    .filter((c) => c.comprasFiltradas.length > 0);

  // Parcelas de empréstimo que vencem neste mês (com a data de vencimento).
  const parcelasEmp = (emprestimos || [])
    .filter((e) => pertenceAoMembro(e, filtroMembro, membros))
    .map((e) => ({ emp: e, p: parcelaEmprestimoNoMes(e, year, monthIdx) }))
    .filter((x) => x.p)
    .sort((a, b) => String(a.p.data || "").localeCompare(String(b.p.data || "")));

  // Entradas (receitas) do mês com a data em que caem.
  const entradas = entradasDoMes(holerites, rendasExtras, year, monthIdx).filter((e) => pertenceAoMembro(e, filtroMembro, membros));
  const totalEntradas = entradas.reduce((s, e) => s + e.valor, 0);

  const totalGeral = filtroMembro === "todos"
    ? totalDespesas
    : despesasFiltradas.reduce((s, d) => s + d.valor, 0) + cartoesMes.reduce((s, c) => s + c.totalFiltrado, 0) + parcelasEmp.reduce((s, x) => s + x.p.valor, 0);

  const semNada = !despesas.length && !cartoesMesAll.length && !(emprestimos || []).some((e) => parcelaEmprestimoNoMes(e, year, monthIdx)) && !entradasDoMes(holerites, rendasExtras, year, monthIdx).length;
  if (semNada) return <Empty icon="" title="Extrato vazio" sub='Adicione despesas em "Lançamentos" ou importe uma fatura.' />;

  return (
    <div>
      <MembroFilter membros={membros} value={filtroMembro} onChange={setFiltroMembro} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 2px" }}>
        <span style={{ fontSize: 12, color: C.muted }}>{despesasFiltradas.length} lançamento{despesasFiltradas.length !== 1 ? "s" : ""}{cartoesMes.length > 0 ? ` · ${cartoesMes.length} cartão${cartoesMes.length > 1 ? "es" : ""}` : ""}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.amber }}>{fmt(totalGeral)}</span>
      </div>

      {entradas.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, padding: "0 2px" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".4px" }}>Entradas</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.emerald }}>+ {fmt(totalEntradas)}</span>
          </div>
          {entradas.map((e) => (
            <div key={e.id} onClick={() => temReceitas && setTab && setTab("receitas")} style={{ background: C.surface, borderRadius: 13, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, border: `1px solid ${C.border}`, cursor: temReceitas ? "pointer" : "default" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `color-mix(in srgb, ${C.emerald} 10%, transparent)`, color: C.emerald, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Wallet size={18} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.descricao}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{e.tipo === "holerite" ? "Renda fixa" : "Renda extra"} · {e.data ? new Date(e.data + "T12:00:00").toLocaleDateString("pt-BR") : "sem data"}{temMembros ? <span style={{ color: C.accent, fontWeight: 700 }}> · {nomeMembro(e.membroId, membros)}</span> : null}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.emerald, flexShrink: 0 }}>+ {fmt(e.valor)}</div>
            </div>
          ))}
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".4px", margin: "14px 2px 0" }}>Saídas</div>
        </div>
      )}

      {cartoesMes.map((cartao) => (
        <div key={cartao.id} onClick={() => setTab && setTab("cartoes")} style={{ background: "rgba(99,102,241,0.06)", borderRadius: 13, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, border: `1px solid rgba(99,102,241,0.2)`, cursor: "pointer" }}>
          <CardBrandTile banco={cartao.banco} nome={cartao.nome} w={38} h={38} radius={10} iconSize={18} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{cartao.nome}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Fatura · {cartao.comprasFiltradas.length} compras{filtroMembro !== "todos" ? ` de ${nomeMembro(filtroMembro, membros)}` : ""} · toque para ver detalhes</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--danger)", flexShrink: 0 }}>- {fmt(filtroMembro === "todos" ? cartao.total : cartao.totalFiltrado)}</div>
        </div>
      ))}

      {parcelasEmp.map(({ emp, p }) => (
        <div key={emp.id} onClick={() => setTab && setTab("emprestimos")} style={{ background: C.surface, borderRadius: 13, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, border: `1px solid ${C.border}`, cursor: "pointer" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `color-mix(in srgb, ${C.rose} 10%, transparent)`, color: C.rose, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><BanknoteArrowDown size={18} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.instituicao} · parcela {p.k}/{p.total}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Empréstimo · {p.data ? `vence ${new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}` : "sem data de vencimento"}{temMembros ? <span style={{ color: C.accent, fontWeight: 700 }}> · {nomeMembro(emp.membroId, membros)}</span> : null}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--danger)", flexShrink: 0 }}>- {fmt(p.valor)}</div>
        </div>
      ))}

      {editId && (
        <Card style={{ marginBottom: 12 }}>
          <STitle>Editar lançamento</STitle>
          <div style={{ display: "grid", gap: 10 }}>
            <Field label="Descrição"><Inp value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} /></Field>
            <div className="form-grid-2">
              <Field label="Valor"><MoneyInput value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} /></Field>
              <Field label="Data"><Inp type="date" value={form.data} onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))} /></Field>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form.fixo} onChange={(e) => setForm((p) => ({ ...p, fixo: e.target.checked }))} />
              <span style={{ fontSize: 12, color: C.subtle }}>Despesa fixa / recorrente</span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={saveEdit}><IcoTxt Icon={Save}>Salvar</IcoTxt></Btn>
              <Btn variant="ghost" onClick={() => setEditId(null)}>Cancelar</Btn>
            </div>
          </div>
        </Card>
      )}

      {despesasFiltradas.length > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 10, padding: "0 2px" }}>
          <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>Ordenar por</span>
          <Sel value={ordem} onChange={(e) => setOrdem(e.target.value)} style={{ width: "auto", fontSize: 12, padding: "7px 10px" }}>
            <option value="data-desc">Data (mais recentes)</option>
            <option value="data-asc">Data (mais antigas)</option>
            <option value="valor-desc">Maior valor</option>
            <option value="valor-asc">Menor valor</option>
          </Sel>
        </div>
      )}

      {ordenar(despesasFiltradas).map((d) => {
        const cat = catById(d.categoria);
        return (
          <div key={d.id} style={{ background: C.surface, borderRadius: 13, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, border: `1px solid ${C.border}` }}>
            <MerchantIcon desc={d.descricao} cat={cat.id} size={18} box={38} style={{ borderRadius: 10 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.descricao}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>{cat.label} · {new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR")}{d.fixo ? <><span>·</span><RefreshCw size={10} /></> : ""}{temMembros ? <span style={{ color: C.accent, fontWeight: 700 }}>· {nomeMembro(d.membroId, membros)}</span> : null}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--danger)", marginBottom: 4 }}>- {fmt(d.valor)}</div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="mini-act" aria-label="Editar" onClick={() => startEdit(d)} style={{ padding: "5px 8px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, color: "var(--accent)", cursor: "pointer" }}><Pencil size={14} /></button>
                <button className="mini-act" aria-label="Excluir" onClick={() => setDespesasMk((p) => p.filter((x) => x.id !== d.id))} style={{ padding: "5px 8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: C.red, cursor: "pointer" }}><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
