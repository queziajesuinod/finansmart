// @ts-nocheck
import { useState, useEffect } from "react";
import { C, CATEGORIES, MONTH_NAMES, fmt, fmtPct, catById, genId, tint } from "../../lib/constants";
import { Card, Label, Field, Inp, Btn, Badge, Bar, Empty, STitle, IcoTxt, MoneyInput } from "../ui";
import { CatIcon, CreditCard, Trash2, ReceiptText, Wallet, ArrowLeftRight, WalletCards, ShoppingCart, ChartColumn, Users, Save, Pencil, X } from "../../lib/icons.jsx";
import { MerchantIcon, CardBrandTile } from "../../lib/brandIcons.jsx";
import { nomeMembro, membroEfetivo } from "../Membros.jsx";

export default function CartoesTab({ cartoes, setCartoes, cardProfiles, setCardProfiles, membros = [], year, monthIdx }) {
  const [aberto, setAberto] = useState(null);
  const [aba, setAba] = useState({});
  const [filtroPort, setFiltroPort] = useState({});
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [baixaId, setBaixaId] = useState(null);
  const [baixaForm, setBaixaForm] = useState({ tipo: "total", valor: "" });

  function remover(id) { setCartoes(cartoes.filter((c) => c.id !== id)); }
  // ── Baixa da fatura (regime de caixa): registra quanto foi pago ──
  function abrirBaixa(c) {
    const pago = c.valorPago;
    const parcial = pago != null && pago < (c.total || 0) - 0.01;
    setBaixaId(c.id);
    setBaixaForm({ tipo: parcial ? "parcial" : "total", valor: pago != null ? String(pago) : "" });
  }
  function confirmarBaixa(c) {
    const v = baixaForm.tipo === "total" ? (c.total || 0) : (parseFloat((baixaForm.valor || "").replace(",", ".")) || 0);
    setCartoes(cartoes.map((x) => (x.id === c.id ? { ...x, valorPago: v } : x)));
    setBaixaId(null);
  }
  function limparBaixa(c) {
    setCartoes(cartoes.map((x) => (x.id === c.id ? { ...x, valorPago: null } : x)));
    setBaixaId(null);
  }
  function abrirEdicao(c) {
    setEditId(c.id);
    setEditForm({ nome: c.nome || "", banco: c.banco || "", limite: c.limite ? String(c.limite) : "", vencimentoDia: c.vencimentoDia ? String(c.vencimentoDia) : "" });
  }
  function salvarEdicao(id) {
    const limite = parseFloat((editForm.limite || "").replace(",", ".")) || 0;
    const dia = parseInt(editForm.vencimentoDia, 10);
    setCartoes(cartoes.map((c) => c.id === id ? {
      ...c,
      nome: (editForm.nome || "").trim() || c.nome,
      banco: (editForm.banco || "").trim(),
      limite,
      vencimentoDia: dia >= 1 && dia <= 31 ? dia : null,
      vencimento: dia >= 1 && dia <= 31 ? `2000-01-${String(dia).padStart(2, "0")}` : "",
    } : c));
    setEditId(null);
  }
  function getAba(id) { return aba[id] || "compras"; }
  function getFiltro(id) { return filtroPort[id] || "todos"; }

  // Filtra as faturas pelo mês visível na tela (mesRef "ano-monthIdx"). Vendo
  // junho, só aparecem faturas de junho — mesmo que haja de outros meses.
  const mk = (year != null && monthIdx != null) ? `${year}-${monthIdx}` : null;
  const faturasMes = mk == null ? (cartoes || []) : (cartoes || []).filter((c) => c.mesRef === mk);
  const outrosMeses = (cartoes || []).length - faturasMes.length;
  const mesNome = monthIdx != null ? MONTH_NAMES[monthIdx] : "";

  // Saldo devedor por CARTÃO FÍSICO (agrupado por banco+nome), somando o que
  // não foi pago em TODAS as faturas dele. Limite disponível = limite − saldo devedor.
  const keyCartao = (c) => `${(c.banco || "").toLowerCase().trim()}|${(c.nome || "").toLowerCase().trim()}`;
  const saldoInfo = {};
  (cartoes || []).forEach((c) => {
    const k = keyCartao(c);
    const devedor = Math.max(0, (c.total || 0) - (c.valorPago == null ? 0 : Number(c.valorPago) || 0));
    if (!saldoInfo[k]) saldoInfo[k] = { saldoDevedor: 0, limite: 0 };
    saldoInfo[k].saldoDevedor += devedor;
    saldoInfo[k].limite = Math.max(saldoInfo[k].limite, c.limite || 0);
  });
  (cardProfiles || []).forEach((p) => {
    const k = `${(p.banco || "").toLowerCase().trim()}|${(p.nome || "").toLowerCase().trim()}`;
    if (saldoInfo[k]) saldoInfo[k].limite = Math.max(saldoInfo[k].limite, p.limite || 0);
  });
  const dispDe = (k) => Math.max(0, (saldoInfo[k] ? saldoInfo[k].limite - saldoInfo[k].saldoDevedor : 0));

  const semFaturasMes = !faturasMes.length;
  const totalFaturas = faturasMes.reduce((s, c) => s + c.total, 0);
  const cartoesMesKeys = [...new Set(faturasMes.map(keyCartao))];
  const totalSaldoDevedor = cartoesMesKeys.reduce((s, k) => s + (saldoInfo[k] ? saldoInfo[k].saldoDevedor : 0), 0);
  const totalDisponivel = cartoesMesKeys.reduce((s, k) => s + dispDe(k), 0);

  return (
    <div>
      <MeusCartoes cardProfiles={cardProfiles} setCardProfiles={setCardProfiles} />

      {semFaturasMes && (
        <Empty icon="" title={mk == null ? "Nenhuma fatura importada" : `Nenhuma fatura de ${mesNome}`}
          sub={outrosMeses > 0
            ? `Você tem ${outrosMeses} fatura${outrosMeses > 1 ? "s" : ""} em outros meses — navegue pelos meses no topo para vê-las.`
            : 'Use a aba "Importar PDF" para adicionar a fatura de um cartão.'} />
      )}

      {!semFaturasMes && (
      <>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        {[
          { l: `Faturas de ${mesNome}`, v: fmt(totalFaturas), c: C.amber, Icon: ReceiptText },
          { l: "Saldo devedor", v: fmt(totalSaldoDevedor), c: C.red, Icon: CreditCard },
          { l: "Disponível", v: fmt(totalDisponivel), c: C.emerald, Icon: Wallet },
        ].map((x) => (
          <Card key={x.l} style={{ padding: "12px 13px" }}>
            <div style={{ marginBottom: 6, color: x.c }}><x.Icon size={16} strokeWidth={2} /></div>
            <Label>{x.l}</Label>
            <div style={{ fontSize: 14, fontWeight: 800, color: x.c }}>{x.v}</div>
          </Card>
        ))}
      </div>
      {outrosMeses > 0 && (
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, marginTop: -4 }}>Mostrando só as faturas de {mesNome}. Há +{outrosMeses} em outros meses (navegue pelos meses no topo).</div>
      )}

      {faturasMes.map((cartao) => {
        const usado = cartao.total;
        const limite = cartao.limite || 0;
        const disp = Math.max(0, limite - usado);
        const pctUso = limite > 0 ? (usado / limite) * 100 : 0;
        // Baixa/saldo por cartão físico.
        const kFis = keyCartao(cartao);
        const dispCartao = dispDe(kFis);
        const limiteCartao = saldoInfo[kFis] ? saldoInfo[kFis].limite : 0;
        const pago = cartao.valorPago;
        const conciliada = pago != null;
        const faltaPagar = Math.max(0, usado - (conciliada ? Number(pago) || 0 : 0));
        const statusPag = !conciliada ? "aberto" : ((Number(pago) || 0) >= usado - 0.01 ? "total" : ((Number(pago) || 0) <= 0.01 ? "aberto" : "parcial"));
        const isOpen = aberto === cartao.id;
        const tabAtual = getAba(cartao.id);
        const filtro = getFiltro(cartao.id);
        // Agrupa pelo MEMBRO vinculado (resolvendo membroId). Sem membros cadastrados,
        // cai no portador cru da fatura. Assim "Thiago → Quézia (principal)" aparece como Quézia.
        const usaMembros = Array.isArray(membros) && membros.length > 0;
        const grupoIdDe = (c) => usaMembros ? (membroEfetivo(c.membroId, membros) || "principal") : (c.portador || "Titular");
        const grupoNomeDe = (c) => usaMembros ? nomeMembro(c.membroId, membros) : (c.portador || "Titular");
        const gruposMap = new Map();
        (cartao.compras || []).forEach((c) => { const id = grupoIdDe(c); if (!gruposMap.has(id)) gruposMap.set(id, grupoNomeDe(c)); });
        const grupos = [...gruposMap.entries()].map(([id, nome]) => ({ id, nome }));
        const multiPortador = grupos.length > 1;
        const comprasFiltradas = filtro === "todos" ? cartao.compras : cartao.compras.filter((c) => grupoIdDe(c) === filtro);
        const totalFiltrado = comprasFiltradas.reduce((s, c) => s + c.valor, 0);
        const filtroNome = filtro === "todos" ? "Total" : ((grupos.find((g) => g.id === filtro) || {}).nome || filtro);
        const porCat = CATEGORIES.map((c) => ({ ...c, total: comprasFiltradas.filter((x) => x.categoria === c.id).reduce((s, x) => s + x.valor, 0), qtd: comprasFiltradas.filter((x) => x.categoria === c.id).length })).filter((c) => Math.abs(c.total) > 0.001).sort((a, b) => b.total - a.total);
        const porPortador = grupos.map((g) => ({ id: g.id, nome: g.nome, total: cartao.compras.filter((c) => grupoIdDe(c) === g.id).reduce((s, c) => s + c.valor, 0), qtd: cartao.compras.filter((c) => grupoIdDe(c) === g.id).length })).sort((a, b) => b.total - a.total);
        // Pagamentos (quitações) — histórico à parte, não contam como gasto.
        const pagamentos = cartao.pagamentos || [];
        const totalPago = pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
        return (
          <Card key={cartao.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <CardBrandTile banco={cartao.banco} nome={cartao.nome} w={46} h={32} radius={7} iconSize={17} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{cartao.nome}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{cartao.banco}{cartao.vencimentoDia ? ` · vence dia ${cartao.vencimentoDia} de cada mês` : (cartao.vencimento ? ` · vence ${new Date(cartao.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}` : "")} · {cartao.compras.length} compras{multiPortador ? ` · ${grupos.length} ${usaMembros ? "membros" : "portadores"}` : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="mini-act" aria-label="Editar cartão" onClick={() => (editId === cartao.id ? setEditId(null) : abrirEdicao(cartao))} style={{ padding: "6px 9px", background: tint(C.accent, 12), border: `1px solid ${tint(C.accent, 24)}`, borderRadius: 8, color: C.accent, cursor: "pointer" }}><Pencil size={14} /></button>
                <button className="mini-act" aria-label="Remover cartão" onClick={() => remover(cartao.id)} style={{ padding: "6px 9px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: C.red, cursor: "pointer" }}><Trash2 size={14} /></button>
              </div>
            </div>

            {editId === cartao.id && (
              <div style={{ background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 11, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Label>Editar informações do cartão</Label>
                  <button aria-label="Fechar edição" onClick={() => setEditId(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "inline-flex" }}><X size={15} /></button>
                </div>
                <div className="form-grid-2">
                  <Field label="Nome / apelido"><Inp value={editForm.nome} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))} /></Field>
                  <Field label="Banco / bandeira"><Inp value={editForm.banco} onChange={(e) => setEditForm((f) => ({ ...f, banco: e.target.value }))} /></Field>
                  <Field label="Limite total (R$)"><MoneyInput placeholder="0,00" value={editForm.limite} onChange={(e) => setEditForm((f) => ({ ...f, limite: e.target.value }))} /></Field>
                  <Field label="Dia de vencimento"><Inp type="number" min={1} max={31} placeholder="dia" value={editForm.vencimentoDia} onChange={(e) => setEditForm((f) => ({ ...f, vencimentoDia: e.target.value }))} /></Field>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Btn onClick={() => salvarEdicao(cartao.id)}><IcoTxt Icon={Save}>Salvar</IcoTxt></Btn>
                  <Btn variant="ghost" onClick={() => setEditId(null)}>Cancelar</Btn>
                </div>
              </div>
            )}

            <div className="stat-grid" style={{ marginBottom: 12 }}>
              {[{ l: "Valor da fatura", v: fmt(usado), c: C.amber }, { l: "Pago", v: conciliada ? fmt(Number(pago) || 0) : "—", c: C.emerald }, { l: "Disponível no cartão", v: limiteCartao > 0 ? fmt(dispCartao) : "—", c: C.emerald }].map((x) => (
                <div key={x.l} style={{ background: "var(--fill-2)", borderRadius: 8, padding: "9px 11px" }}>
                  <Label>{x.l}</Label>
                  <div style={{ fontSize: 13, fontWeight: 700, color: x.c }}>{x.v}</div>
                </div>
              ))}
            </div>

            {/* Baixa da fatura — regime de caixa: registra quanto foi pago */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {statusPag === "total" && <Badge label="Fatura paga" color={C.emerald} Icon={WalletCards} />}
              {statusPag === "parcial" && <Badge label={`Parcial · falta ${fmt(faltaPagar)}`} color={C.indigo} Icon={WalletCards} />}
              {statusPag === "aberto" && <Badge label="Em aberto" color={C.amber} Icon={WalletCards} />}
              {baixaId !== cartao.id && (
                <button onClick={() => abrirBaixa(cartao)} style={{ marginLeft: "auto", background: tint(C.accent, 12), border: `1px solid ${tint(C.accent, 24)}`, color: C.accent, borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{conciliada ? "Editar pagamento" : "Registrar pagamento"}</button>
              )}
            </div>

            {baixaId === cartao.id && (
              <div style={{ background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 11, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Label>Quanto você pagou desta fatura ({fmt(usado)})?</Label>
                  <button aria-label="Fechar" onClick={() => setBaixaId(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}><X size={15} /></button>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {[{ id: "total", l: "Paguei tudo" }, { id: "parcial", l: "Paguei parte" }].map((o) => (
                    <button key={o.id} onClick={() => setBaixaForm((f) => ({ ...f, tipo: o.id }))} style={{ flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, border: `1px solid ${baixaForm.tipo === o.id ? tint(C.accent, 40) : C.border}`, background: baixaForm.tipo === o.id ? tint(C.accent, 12) : "transparent", color: baixaForm.tipo === o.id ? C.accent : C.muted }}>{o.l}</button>
                  ))}
                </div>
                {baixaForm.tipo === "parcial" && (
                  <div style={{ marginBottom: 10 }}>
                    <Label>Valor pago</Label>
                    <MoneyInput placeholder="0,00" value={baixaForm.valor} onChange={(e) => setBaixaForm((f) => ({ ...f, valor: e.target.value }))} />
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>O que faltar ({fmt(Math.max(0, usado - (parseFloat((baixaForm.valor || "").replace(",", ".")) || 0)))}) vira saldo devedor e volta na próxima fatura.</div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="success" onClick={() => confirmarBaixa(cartao)} style={{ flex: 1 }}><IcoTxt Icon={WalletCards}>Confirmar</IcoTxt></Btn>
                  {conciliada && <Btn variant="ghost" onClick={() => limparBaixa(cartao)}>Desfazer baixa</Btn>}
                </div>
              </div>
            )}
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
                    <Label>Gastos por {usaMembros ? "membro" : "portador"}</Label>
                    {porPortador.map((p) => (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7 }}>
                        <span style={{ fontSize: 12, color: C.subtle, display: "inline-flex", alignItems: "center", gap: 6 }}><Users size={13} /> {p.nome} <span style={{ fontSize: 10, color: C.muted }}>({p.qtd})</span></span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.violet }}>{fmt(p.total)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {multiPortador && (
                  <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
                    {[{ id: "todos", nome: "Todos" }, ...grupos].map((g) => (
                      <button key={g.id} onClick={() => setFiltroPort((prev) => ({ ...prev, [cartao.id]: g.id }))} style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${filtro === g.id ? C.violet : C.border}`, background: filtro === g.id ? "rgba(139,92,246,0.2)" : "transparent", color: filtro === g.id ? C.violet : C.muted, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{g.id === "todos" ? "Todos" : g.nome.split(" ")[0]}</button>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, background: "var(--fill-2)", borderRadius: 9, padding: 4, marginBottom: 12 }}>
                  {[{ id: "compras", label: "Compras", Icon: ShoppingCart }, { id: "categorias", label: "Por categoria", Icon: ChartColumn }, ...(pagamentos.length ? [{ id: "pagamentos", label: "Pagamentos", Icon: Wallet }] : [])].map((t) => (
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
                          {estorno
                            ? <div style={{ width: 34, height: 34, borderRadius: 9, background: `color-mix(in srgb, ${C.emerald} 10%, transparent)`, color: C.emerald, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ArrowLeftRight size={16} /></div>
                            : <MerchantIcon desc={compra.descricao} cat={cat.id} size={17} box={34} style={{ borderRadius: 9 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{compra.descricao}</div>
                            <div style={{ fontSize: 10, color: C.muted }}>{cat.label} · {new Date(compra.data + "T12:00:00").toLocaleDateString("pt-BR")}{compra.parcelas > 1 ? ` · ${compra.parcelaAtual}/${compra.parcelas}` : ""}{multiPortador ? ` · ${grupoNomeDe(compra).split(" ")[0]}` : ""}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: estorno ? C.emerald : "var(--danger)", flexShrink: 0 }}>{estorno ? "+ " : ""}{fmt(Math.abs(compra.valor))}</div>
                        </div>
                      );
                    })}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{filtroNome.split(" ")[0]} · {comprasFiltradas.length} compras</span>
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
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Total{filtro !== "todos" ? ` (${filtroNome.split(" ")[0]})` : " da fatura"}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: C.amber }}>{fmt(totalFiltrado)}</span>
                    </div>
                  </div>
                )}

                {tabAtual === "pagamentos" && (
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>Quitações desta fatura. Não são gastos — mostram quanto você já pagou do cartão.</div>
                    {[...pagamentos].sort((a, b) => new Date(b.data) - new Date(a.data)).map((pg) => (
                      <div key={pg.id || `${pg.data}-${pg.valor}`} style={{ background: "var(--fill-2)", borderRadius: 10, padding: "10px 13px", marginBottom: 7, display: "flex", alignItems: "center", gap: 11, border: `1px solid ${C.border}` }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: `color-mix(in srgb, ${C.emerald} 10%, transparent)`, color: C.emerald, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Wallet size={16} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{pg.descricao || "Pagamento"}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>{pg.data ? new Date(pg.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.emerald, flexShrink: 0 }}>− {fmt(Number(pg.valor) || 0)}</div>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{pagamentos.length} pagamento{pagamentos.length > 1 ? "s" : ""}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: C.emerald }}>{fmt(totalPago)}</span>
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
          <div className="card-profile-grid">
            <Field label="Apelido"><Inp value={p.nome} onChange={(e) => upd(p.id, "nome", e.target.value)} /></Field>
            <Field label="Banco"><Inp value={p.banco || ""} onChange={(e) => upd(p.id, "banco", e.target.value)} /></Field>
            <Field label="Limite"><MoneyInput value={p.limite ?? ""} onChange={(e) => upd(p.id, "limite", e.target.value)} /></Field>
            <Field label="Venc."><Inp type="number" placeholder="dia" value={p.vencimentoDia ?? ""} onChange={(e) => upd(p.id, "vencimentoDia", e.target.value)} /></Field>
            <Field label="4 finais"><Inp value={p.finais || ""} maxLength={4} onChange={(e) => upd(p.id, "finais", e.target.value.replace(/\D/g, ""))} /></Field>
            <button className="cp-btn" aria-label="Remover cartão" onClick={() => rm(p.id)} style={{ padding: "9px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: C.red, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}

      <div style={{ borderTop: `1px dashed ${C.border}`, marginTop: 6, paddingTop: 12 }}>
        <Label>Adicionar cartão</Label>
        <div className="card-profile-grid" style={{ marginTop: 6 }}>
          <Field label="Apelido"><Inp placeholder="Ex: Nubank Roxinho" value={novo.nome} onChange={nf("nome")} /></Field>
          <Field label="Banco"><Inp placeholder="Ex: Nubank" value={novo.banco} onChange={nf("banco")} /></Field>
          <Field label="Limite"><MoneyInput placeholder="0,00" value={novo.limite} onChange={nf("limite")} /></Field>
          <Field label="Venc."><Inp type="number" placeholder="dia" value={novo.vencimentoDia} onChange={nf("vencimentoDia")} /></Field>
          <Field label="4 finais"><Inp placeholder="0000" maxLength={4} value={novo.finais} onChange={(e) => setNovo((p) => ({ ...p, finais: e.target.value.replace(/\D/g, "") }))} /></Field>
          <Btn className="cp-btn" variant="sm" onClick={add}>+ Add</Btn>
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
