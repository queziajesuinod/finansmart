// @ts-nocheck
import { useState, useEffect } from "react";
import { C, CATEGORIES, fmt, fmtPct, catById, genId, tint } from "../../lib/constants";
import { Card, Label, Field, Inp, Btn, Badge, Bar, Empty, STitle, IcoTxt } from "../ui";
import { CatIcon, CreditCard, Trash2, ReceiptText, Wallet, ArrowLeftRight, WalletCards, ShoppingCart, ChartColumn, Users, Save } from "../../lib/icons.jsx";

export default function CartoesTab({ cartoes, setCartoes, cardProfiles, setCardProfiles }) {
  const [aberto, setAberto] = useState(null);
  const [aba, setAba] = useState({});
  const [filtroPort, setFiltroPort] = useState({});

  function remover(id) { setCartoes(cartoes.filter((c) => c.id !== id)); }
  function getAba(id) { return aba[id] || "compras"; }
  function getFiltro(id) { return filtroPort[id] || "todos"; }

  const semFaturas = !cartoes || !cartoes.length;
  const totalFaturas = cartoes.reduce((s, c) => s + c.total, 0);
  const totalLimite = cartoes.reduce((s, c) => s + (c.limite || 0), 0);
  const totalDisponivel = cartoes.reduce((s, c) => s + Math.max(0, (c.limite || 0) - c.total), 0);

  return (
    <div>
      <MeusCartoes cardProfiles={cardProfiles} setCardProfiles={setCardProfiles} />

      {semFaturas && <Empty icon="" title="Nenhuma fatura importada" sub='Use a aba "Importar PDF" para adicionar a fatura de um cartão.' />}

      {!semFaturas && (
      <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { l: "Total em faturas", v: fmt(totalFaturas), c: C.amber, Icon: ReceiptText },
          { l: "Limite total", v: fmt(totalLimite), c: C.indigo, Icon: CreditCard },
          { l: "Disponível", v: fmt(totalDisponivel), c: C.emerald, Icon: Wallet },
        ].map((x) => (
          <Card key={x.l} style={{ padding: "12px 13px" }}>
            <div style={{ marginBottom: 6, color: x.c }}><x.Icon size={16} strokeWidth={2} /></div>
            <Label>{x.l}</Label>
            <div style={{ fontSize: 14, fontWeight: 800, color: x.c }}>{x.v}</div>
          </Card>
        ))}
      </div>

      {cartoes.map((cartao) => {
        const usado = cartao.total;
        const limite = cartao.limite || 0;
        const disp = Math.max(0, limite - usado);
        const pctUso = limite > 0 ? (usado / limite) * 100 : 0;
        const isOpen = aberto === cartao.id;
        const tabAtual = getAba(cartao.id);
        const filtro = getFiltro(cartao.id);
        const portadores = cartao.portadores || [...new Set((cartao.compras || []).map((c) => c.portador || "Titular"))];
        const multiPortador = portadores.length > 1;
        const comprasFiltradas = filtro === "todos" ? cartao.compras : cartao.compras.filter((c) => (c.portador || "Titular") === filtro);
        const totalFiltrado = comprasFiltradas.reduce((s, c) => s + c.valor, 0);
        const porCat = CATEGORIES.map((c) => ({ ...c, total: comprasFiltradas.filter((x) => x.categoria === c.id).reduce((s, x) => s + x.valor, 0), qtd: comprasFiltradas.filter((x) => x.categoria === c.id).length })).filter((c) => Math.abs(c.total) > 0.001).sort((a, b) => b.total - a.total);
        const porPortador = portadores.map((p) => ({ portador: p, total: cartao.compras.filter((c) => (c.portador || "Titular") === p).reduce((s, c) => s + c.valor, 0), qtd: cartao.compras.filter((c) => (c.portador || "Titular") === p).length })).sort((a, b) => b.total - a.total);
        return (
          <Card key={cartao.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 46, height: 32, borderRadius: 7, background: `var(--accent)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={17} /></div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{cartao.nome}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{cartao.banco}{cartao.vencimentoDia ? ` · vence dia ${cartao.vencimentoDia} de cada mês` : (cartao.vencimento ? ` · vence ${new Date(cartao.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}` : "")} · {cartao.compras.length} compras{multiPortador ? ` · ${portadores.length} portadores` : ""}</div>
                </div>
              </div>
              <button aria-label="Remover cartão" onClick={() => remover(cartao.id)} style={{ padding: "6px 9px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, color: C.red, cursor: "pointer", display: "inline-flex" }}><Trash2 size={13} /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
              {[{ l: "Valor da fatura", v: fmt(usado), c: C.amber }, { l: "Limite total", v: limite > 0 ? fmt(limite) : "—", c: C.subtle }, { l: "Disponível", v: limite > 0 ? fmt(disp) : "—", c: C.emerald }].map((x) => (
                <div key={x.l} style={{ background: "var(--fill-2)", borderRadius: 8, padding: "9px 11px" }}>
                  <Label>{x.l}</Label>
                  <div style={{ fontSize: 13, fontWeight: 700, color: x.c }}>{x.v}</div>
                </div>
              ))}
            </div>
            {limite > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginBottom: 4 }}>
                  <span>Limite utilizado</span><span>{fmtPct(pctUso)}</span>
                </div>
                <Bar pct={pctUso} color={pctUso > 80 ? C.red : pctUso > 50 ? C.amber : C.emerald} h={7} />
              </div>
            )}

            <button onClick={() => setAberto(isOpen ? null : cartao.id)} style={{ width: "100%", padding: "11px 18px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, border: isOpen ? `1px solid ${C.border}` : "none", background: isOpen ? "var(--fill)" : `var(--accent)`, color: isOpen ? C.subtle : "#fff" }}>
              {isOpen ? "Ocultar detalhes" : <IcoTxt Icon={ChartColumn}>Ver compras e relatório</IcoTxt>}
            </button>

            {isOpen && (
              <div style={{ marginTop: 14 }}>
                {multiPortador && (
                  <div style={{ background: "rgba(139,92,246,0.06)", border: `1px solid rgba(139,92,246,0.2)`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                    <Label>Gastos por portador</Label>
                    {porPortador.map((p) => (
                      <div key={p.portador} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7 }}>
                        <span style={{ fontSize: 12, color: C.subtle, display: "inline-flex", alignItems: "center", gap: 6 }}><Users size={13} /> {p.portador} <span style={{ fontSize: 10, color: C.muted }}>({p.qtd})</span></span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.violet }}>{fmt(p.total)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {multiPortador && (
                  <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
                    {["todos", ...portadores].map((p) => (
                      <button key={p} onClick={() => setFiltroPort((prev) => ({ ...prev, [cartao.id]: p }))} style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${filtro === p ? C.violet : C.border}`, background: filtro === p ? "rgba(139,92,246,0.2)" : "transparent", color: filtro === p ? C.violet : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{p === "todos" ? "Todos" : p.split(" ")[0]}</button>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, background: "var(--fill-2)", borderRadius: 9, padding: 4, marginBottom: 12 }}>
                  {[{ id: "compras", label: "Compras", Icon: ShoppingCart }, { id: "categorias", label: "Por categoria", Icon: ChartColumn }].map((t) => (
                    <button key={t.id} onClick={() => setAba((p) => ({ ...p, [cartao.id]: t.id }))} style={{ flex: 1, padding: "8px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: tabAtual === t.id ? tint(C.accent, 90) : "transparent", color: tabAtual === t.id ? "#fff" : C.muted }}><t.Icon size={14} /> {t.label}</button>
                  ))}
                </div>

                {tabAtual === "compras" && (
                  <div>
                    {[...comprasFiltradas].sort((a, b) => new Date(b.data) - new Date(a.data)).map((compra) => {
                      const cat = catById(compra.categoria);
                      const estorno = compra.valor < 0;
                      return (
                        <div key={compra.id} style={{ background: "var(--fill-2)", borderRadius: 10, padding: "10px 13px", marginBottom: 7, display: "flex", alignItems: "center", gap: 11, border: `1px solid ${C.border}` }}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: `color-mix(in srgb, ${(estorno ? C.emerald : cat.color)} 10%, transparent)`, color: estorno ? C.emerald : cat.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{estorno ? <ArrowLeftRight size={16} /> : <CatIcon id={cat.id} size={16} />}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{compra.descricao}</div>
                            <div style={{ fontSize: 10, color: C.muted }}>{cat.label} · {new Date(compra.data + "T12:00:00").toLocaleDateString("pt-BR")}{compra.parcelas > 1 ? ` · ${compra.parcelaAtual}/${compra.parcelas}` : ""}{multiPortador && compra.portador ? ` · ${compra.portador.split(" ")[0]}` : ""}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: estorno ? C.emerald : "var(--danger)", flexShrink: 0 }}>{estorno ? "+ " : ""}{fmt(Math.abs(compra.valor))}</div>
                        </div>
                      );
                    })}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{filtro === "todos" ? "Total" : filtro.split(" ")[0]} · {comprasFiltradas.length} compras</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: C.amber }}>{fmt(totalFiltrado)}</span>
                    </div>
                  </div>
                )}

                {tabAtual === "categorias" && (
                  <div>
                    {porCat.map((cat) => (
                      <div key={cat.id} style={{ marginBottom: 13 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><CatIcon id={cat.id} size={15} color={cat.color} /> {cat.label} <span style={{ fontSize: 10, color: C.muted }}>({cat.qtd})</span></span>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: C.muted }}>{totalFiltrado > 0 ? fmtPct(cat.total / totalFiltrado * 100) : "—"}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: cat.color }}>{fmt(cat.total)}</span>
                          </div>
                        </div>
                        <Bar pct={totalFiltrado > 0 ? Math.max(0, cat.total / totalFiltrado * 100) : 0} color={cat.color} />
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Total{filtro !== "todos" ? ` (${filtro.split(" ")[0]})` : " da fatura"}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: C.amber }}>{fmt(totalFiltrado)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
      </>
      )}
    </div>
  );
}

// ─── Meus Cartões (perfis cadastrados) ───────────────────────
function MeusCartoes({ cardProfiles, setCardProfiles }) {
  const [list, setList] = useState(cardProfiles || []);
  const [novo, setNovo] = useState({ nome: "", banco: "", limite: "", vencimentoDia: "", finais: "" });
  useEffect(() => { setList(cardProfiles || []); }, [cardProfiles]);

  const upd = (id, k, v) => setList((l) => l.map((p) => (p.id === id ? { ...p, [k]: v } : p)));
  const rm = (id) => setList((l) => l.filter((p) => p.id !== id));
  function add() {
    if (!novo.nome.trim()) return;
    setList((l) => [...l, {
      id: genId(), nome: novo.nome.trim(), banco: novo.banco.trim(),
      limite: parseFloat((novo.limite || "").replace(",", ".")) || 0,
      vencimentoDia: parseInt(novo.vencimentoDia) || null,
      finais: (novo.finais || "").replace(/\D/g, "").slice(-4),
    }]);
    setNovo({ nome: "", banco: "", limite: "", vencimentoDia: "", finais: "" });
  }
  const dirty = JSON.stringify(list) !== JSON.stringify(cardProfiles || []);
  const nf = (k) => (e) => setNovo((p) => ({ ...p, [k]: e.target.value }));

  if (!setCardProfiles) return null;

  return (
    <Card style={{ marginBottom: 16 }}>
      <STitle><IcoTxt Icon={WalletCards} size={15}>Meus cartões</IcoTxt></STitle>
      <p style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>Cadastre seus cartões uma vez. Na importação de fatura eles são reconhecidos automaticamente (pelo banco ou pelos 4 finais) e pré-preenchem os dados.</p>

      {list.map((p) => (
        <div key={p.id} style={{ background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 90px 60px 70px auto", gap: 8, alignItems: "end" }}>
            <Field label="Apelido"><Inp value={p.nome} onChange={(e) => upd(p.id, "nome", e.target.value)} /></Field>
            <Field label="Banco"><Inp value={p.banco || ""} onChange={(e) => upd(p.id, "banco", e.target.value)} /></Field>
            <Field label="Limite"><Inp type="number" value={p.limite ?? ""} onChange={(e) => upd(p.id, "limite", e.target.value)} /></Field>
            <Field label="Venc."><Inp type="number" placeholder="dia" value={p.vencimentoDia ?? ""} onChange={(e) => upd(p.id, "vencimentoDia", e.target.value)} /></Field>
            <Field label="4 finais"><Inp value={p.finais || ""} maxLength={4} onChange={(e) => upd(p.id, "finais", e.target.value.replace(/\D/g, ""))} /></Field>
            <button aria-label="Remover cartão" onClick={() => rm(p.id)} style={{ padding: "9px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: C.red, cursor: "pointer", display: "inline-flex" }}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}

      <div style={{ borderTop: `1px dashed ${C.border}`, marginTop: 6, paddingTop: 12 }}>
        <Label>Adicionar cartão</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 90px 60px 70px auto", gap: 8, alignItems: "end", marginTop: 6 }}>
          <Field label="Apelido"><Inp placeholder="Ex: Nubank Roxinho" value={novo.nome} onChange={nf("nome")} /></Field>
          <Field label="Banco"><Inp placeholder="Ex: Nubank" value={novo.banco} onChange={nf("banco")} /></Field>
          <Field label="Limite"><Inp type="number" placeholder="0" value={novo.limite} onChange={nf("limite")} /></Field>
          <Field label="Venc."><Inp type="number" placeholder="dia" value={novo.vencimentoDia} onChange={nf("vencimentoDia")} /></Field>
          <Field label="4 finais"><Inp placeholder="0000" maxLength={4} value={novo.finais} onChange={(e) => setNovo((p) => ({ ...p, finais: e.target.value.replace(/\D/g, "") }))} /></Field>
          <Btn variant="sm" onClick={add}>+ Add</Btn>
        </div>
      </div>

      {dirty && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
          <Btn onClick={() => setCardProfiles(list)}><IcoTxt Icon={Save}>Salvar cartões</IcoTxt></Btn>
          <Btn variant="ghost" onClick={() => setList(cardProfiles || [])}>Desfazer</Btn>
          <span style={{ fontSize: 11, color: C.amber }}>alterações não salvas</span>
        </div>
      )}
    </Card>
  );
}
