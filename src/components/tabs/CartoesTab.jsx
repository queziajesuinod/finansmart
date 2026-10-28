// @ts-nocheck
import { useState, useEffect } from "react";
import { C, CATEGORIES, MONTH_NAMES, fmt, fmtPct, catById, genId, tint, todayStr } from "../../lib/constants";
import { Card, Label, Field, Inp, Sel, Btn, Badge, Bar, Empty, STitle, IcoTxt, MoneyInput } from "../ui";
import { CatIcon, CreditCard, Trash2, ReceiptText, Wallet, ArrowLeftRight, WalletCards, ShoppingCart, ShoppingBag, ChartColumn, Users, Save, Pencil, X, FilePlus, Undo2 } from "../../lib/icons.jsx";
import { MerchantIcon, CardBrandTile } from "../../lib/brandIcons.jsx";
import { nomeMembro, membroEfetivo } from "../Membros.jsx";
import ImportarTab from "./ImportarTab.jsx";
import ParceladosTab from "./ParceladosTab.jsx";

export default function CartoesTab({ cartoes, setCartoes, cardProfiles, setCardProfiles, cardProfilesImport, parcelados, setParcelados, categoryRules, setCategoryRules, globalCategoryRules = {}, membros = [], setMembros, temImportar = false, temAssistente = false, access = null, year, monthIdx }) {
  const [importOpen, setImportOpen] = useState(false);
  // Parcelados agora mora DENTRO do cartão (segmented control no topo).
  const [secao, setSecao] = useState("faturas");
  const [aberto, setAberto] = useState(null);
  const [aba, setAba] = useState({});
  const [filtroPort, setFiltroPort] = useState({});
  const [ordemCompras, setOrdemCompras] = useState({});
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
  function getOrdem(id) { return ordemCompras[id] || "data-desc"; }
  // Ordena as compras do cartão (por data ou por valor). Usa o valor absoluto para
  // não jogar estornos (negativos) sempre pro fim.
  function ordenarCompras(arr, ordem) {
    const a = [...arr];
    if (ordem === "data-asc") return a.sort((x, y) => new Date(x.data) - new Date(y.data));
    if (ordem === "valor-desc") return a.sort((x, y) => Math.abs(y.valor) - Math.abs(x.valor));
    if (ordem === "valor-asc") return a.sort((x, y) => Math.abs(x.valor) - Math.abs(y.valor));
    return a.sort((x, y) => new Date(y.data) - new Date(x.data)); // data-desc
  }

  // Filtra as faturas pelo mês visível na tela (mesRef "ano-monthIdx"). Vendo
  // junho, só aparecem faturas de junho — mesmo que haja de outros meses.
  const mk = (year != null && monthIdx != null) ? `${year}-${monthIdx}` : null;
  const faturasMes = mk == null ? (cartoes || []) : (cartoes || []).filter((c) => c.mesRef === mk);
  const outrosMeses = (cartoes || []).length - faturasMes.length;
  const mesNome = monthIdx != null ? MONTH_NAMES[monthIdx] : "";

  // Saldo devedor por CARTÃO FÍSICO (agrupado por banco+nome), somando o que
  // não foi pago em TODAS as faturas dele.
  const keyCartao = (c) => `${(c.banco || "").toLowerCase().trim()}|${(c.nome || "").toLowerCase().trim()}`;
  // Mês comparável a partir de "ano-monthIdx" (mesRef) ou "YYYY-MM-DD" (dataCompra).
  const mesRefNum = (s) => { const [y, m] = String(s).split("-").map(Number); return y * 12 + m; };
  const dataNum = (d) => { const y = +String(d).slice(0, 4); const m = +String(d).slice(5, 7) - 1; return y * 12 + m; };
  const curMesNum = (year != null && monthIdx != null) ? year * 12 + monthIdx : dataNum(todayStr());

  const saldoInfo = {};
  const idParaKey = {};       // cartaoId (fatura) → chave do cartão físico
  const nomeParaKey = {};     // nome (origem do parcelado) → chave do cartão físico
  const refMesDaKey = {};     // mês da ÚLTIMA fatura importada do cartão (fronteira faturado/futuro)
  (cartoes || []).forEach((c) => {
    const k = keyCartao(c);
    const devedor = Math.max(0, (c.total || 0) - (c.valorPago == null ? 0 : Number(c.valorPago) || 0));
    if (!saldoInfo[k]) saldoInfo[k] = { saldoDevedor: 0, limite: 0, parceladoFuturo: 0 };
    saldoInfo[k].saldoDevedor += devedor;
    saldoInfo[k].limite = Math.max(saldoInfo[k].limite, c.limite || 0);
    idParaKey[c.id] = k;
    const nm = (c.nome || "").toLowerCase().trim();
    if (nm && !(nm in nomeParaKey)) nomeParaKey[nm] = k;
    if (c.mesRef) refMesDaKey[k] = Math.max(refMesDaKey[k] ?? -Infinity, mesRefNum(c.mesRef));
  });
  (cardProfiles || []).forEach((p) => {
    const k = `${(p.banco || "").toLowerCase().trim()}|${(p.nome || "").toLowerCase().trim()}`;
    if (saldoInfo[k]) saldoInfo[k].limite = Math.max(saldoInfo[k].limite, p.limite || 0);
  });

  // Uma compra parcelada usa o limite INTEIRO na hora, mas só é quitada mês a mês.
  // Então as parcelas que ainda vão vencer (depois da última fatura importada)
  // continuam comprometendo o limite — mesmo com a fatura atual paga. As parcelas
  // até a última fatura já estão no saldoDevedor, então só contamos as futuras
  // (evita contagem em dobro).
  const keyDoParcelado = (p) => {
    if (p.cartaoId && idParaKey[p.cartaoId]) return idParaKey[p.cartaoId];
    const nm = (p.origem || "").toLowerCase().trim();
    return (nm && nomeParaKey[nm]) ? nomeParaKey[nm] : null;
  };
  (parcelados || []).forEach((p) => {
    const k = keyDoParcelado(p);
    if (!k || !saldoInfo[k]) return; // só cartões físicos conhecidos (com fatura)
    const n = p.totalParcelas || 1;
    const ultimaParcela = dataNum(p.dataCompra) + n - 1;
    // Fronteira: última fatura do cartão; sem faturas, o mês anterior ao atual
    // (aí todas as parcelas de hoje em diante contam como comprometidas).
    const ref = refMesDaKey[k] != null ? refMesDaKey[k] : curMesNum - 1;
    const futuras = Math.min(n, Math.max(0, ultimaParcela - ref));
    saldoInfo[k].parceladoFuturo += futuras * (Number(p.valorParcela) || 0);
  });

  // Limite disponível = limite − saldo devedor das faturas − parcelas futuras comprometidas.
  const comprometidoDe = (k) => saldoInfo[k] ? (saldoInfo[k].saldoDevedor + (saldoInfo[k].parceladoFuturo || 0)) : 0;
  const dispDe = (k) => Math.max(0, (saldoInfo[k] ? saldoInfo[k].limite - comprometidoDe(k) : 0));

  const semFaturasMes = !faturasMes.length;
  const totalFaturas = faturasMes.reduce((s, c) => s + c.total, 0);
  const cartoesMesKeys = [...new Set(faturasMes.map(keyCartao))];
  const totalSaldoDevedor = cartoesMesKeys.reduce((s, k) => s + (saldoInfo[k] ? saldoInfo[k].saldoDevedor : 0), 0);
  const totalDisponivel = cartoesMesKeys.reduce((s, k) => s + dispDe(k), 0);

  // Importador de fatura (PDF) embutido: fica dentro desta aba porque toda
  // fatura importada vira um cartão de crédito aqui mesmo.
  if (importOpen) {
    return (
      <div>
        <button onClick={() => setImportOpen(false)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--fill-2)", border: `1px solid ${C.border}`, color: C.subtle, borderRadius: 10, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}><Undo2 size={14} /> Voltar aos cartões</button>
        <ImportarTab
          year={year}
          monthIdx={monthIdx}
          cartoes={cartoes}
          setCartoes={setCartoes}
          parcelados={parcelados}
          setParcelados={setParcelados}
          categoryRules={categoryRules}
          setCategoryRules={setCategoryRules}
          globalCategoryRules={globalCategoryRules}
          cardProfiles={cardProfilesImport}
          setTab={() => setImportOpen(false)}
          membros={membros}
          setMembros={setMembros}
          temAssistente={temAssistente}
          access={access}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Segmented control: Faturas | Parcelados — Parcelados deixou de ser aba
          de topo e passou a viver aqui dentro (pertence ao módulo de cartão). */}
      <div style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", gap: 5, background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 13, padding: 5, marginBottom: 16, backdropFilter: "blur(8px)" }}>
        {[{ id: "faturas", label: "Faturas", Icon: CreditCard }, { id: "parcelados", label: "Parcelados", Icon: ShoppingBag }].map((s) => {
          const on = secao === s.id;
          const n = s.id === "parcelados" ? (parcelados || []).length : 0;
          return (
            <button key={s.id} onClick={() => setSecao(s.id)} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, border: "none", borderRadius: 9, padding: "11px 8px", fontSize: 13, fontWeight: 700, cursor: "pointer", background: on ? "var(--accent)" : "transparent", color: on ? "#fff" : C.muted, boxShadow: on ? `0 2px 8px ${tint(C.accent, 40)}` : "none" }}>
              <s.Icon size={16} /> {s.label}
              {n > 0 && <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 999, background: on ? "rgba(255,255,255,0.25)" : tint(C.muted, 18), color: on ? "#fff" : C.muted }}>{n}</span>}
            </button>
          );
        })}
      </div>

      {secao === "parcelados" ? (
        <ParceladosTab parcelados={parcelados} setParcelados={setParcelados} year={year} monthIdx={monthIdx} membros={membros} cartoesDisponiveis={cardProfilesImport} />
      ) : (
      <>
      {temImportar && (
        <button className="btn primary" onClick={() => setImportOpen(true)} style={{ width: "100%", marginBottom: 16 }}><FilePlus size={16} /> Importar fatura (PDF)</button>
      )}
      {semFaturasMes && (
        <Empty icon="" title={mk == null ? "Nenhuma fatura importada" : `Nenhuma fatura de ${mesNome}`}
          sub={outrosMeses > 0
            ? `Você tem ${outrosMeses} fatura${outrosMeses > 1 ? "s" : ""} em outros meses — navegue pelos meses no topo para vê-las.`
            : 'Use o botão "Importar fatura (PDF)" acima para adicionar a fatura de um cartão.'} />
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
        // Baixa/saldo por cartão físico.
        const kFis = keyCartao(cartao);
        const dispCartao = dispDe(kFis);
        const limiteCartao = saldoInfo[kFis] ? saldoInfo[kFis].limite : 0;
        const parceladoFuturoCartao = saldoInfo[kFis] ? (saldoInfo[kFis].parceladoFuturo || 0) : 0;
        // Barra do cartão FÍSICO: quanto do limite está comprometido (faturas em
        // aberto + parcelas futuras), não só a fatura do mês.
        const comprometido = limiteCartao > 0 ? comprometidoDe(kFis) : usado;
        const limiteBar = limiteCartao > 0 ? limiteCartao : (cartao.limite || 0);
        const pctUso = limiteBar > 0 ? (comprometido / limiteBar) * 100 : 0;
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
            {/* Cartão-wallet premium: a fatura do mês como um cartão de crédito. */}
            <div className="cc">
              <svg className="cc-wave" viewBox="0 0 360 150" preserveAspectRatio="none" aria-hidden="true">
                <defs><linearGradient id={`ccw-${cartao.id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6A6AFF" stopOpacity=".5" /><stop offset="1" stopColor="#1414C8" stopOpacity=".1" /></linearGradient></defs>
                <path d="M360 0 L236 0 C266 40 200 66 254 100 C284 118 300 140 300 150 L360 150 Z" fill={`url(#ccw-${cartao.id})`} />
                <path d="M360 0 L290 0 C304 34 256 56 304 92 C326 108 338 130 338 150 L360 150 Z" fill="#8080FF" fillOpacity=".16" />
              </svg>
              <div className="cc-cnt">
                <div className="cc-top">
                  <div className="cc-bank">{cartao.banco || "Cartão"}{multiPortador ? ` · ${grupos.length} ${usaMembros ? "membros" : "portadores"}` : ""}</div>
                  <div className="cc-acts">
                    <button className="cc-act" aria-label="Editar cartão" onClick={() => (editId === cartao.id ? setEditId(null) : abrirEdicao(cartao))}><Pencil size={14} /></button>
                    <button className="cc-act" aria-label="Remover cartão" onClick={() => remover(cartao.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="cc-chip" aria-hidden="true"></div>
                <div className="cc-name">{cartao.nome}</div>
                <div className="cc-row">
                  <div><div className="l">Fatura de {MONTH_NAMES[monthIdx].slice(0, 3)}</div><div className="fat">{fmt(usado)}</div></div>
                  <div className="venc">{cartao.vencimentoDia ? `Vence dia ${cartao.vencimentoDia}` : (cartao.vencimento ? `Vence ${new Date(cartao.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}` : `${cartao.compras.length} compras`)}</div>
                </div>
                {limiteCartao > 0 && (
                  <div className="cc-limite">
                    <div className="t"><i style={{ width: `${Math.min(100, Math.max(0, (usado / limiteCartao) * 100))}%` }} /></div>
                    <div className="x"><span>Limite {fmt(limiteCartao)}</span><span>{fmt(dispCartao)} livre</span></div>
                  </div>
                )}
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
            {limiteBar > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginBottom: 4 }}>
                  <span>Limite comprometido</span><span>{fmtPct(pctUso)}</span>
                </div>
                <Bar pct={pctUso} color={pctUso > 80 ? C.red : pctUso > 50 ? C.amber : C.emerald} h={7} />
                {parceladoFuturoCartao > 0.01 && (
                  <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                    <ShoppingBag size={11} /> Inclui {fmt(parceladoFuturoCartao)} em parcelas futuras ocupando o limite.
                  </div>
                )}
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
                    {comprasFiltradas.length > 1 && (
                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>Ordenar por</span>
                        <Sel value={getOrdem(cartao.id)} onChange={(e) => setOrdemCompras((p) => ({ ...p, [cartao.id]: e.target.value }))} style={{ width: "auto", fontSize: 12, padding: "6px 10px" }}>
                          <option value="data-desc">Data (mais recentes)</option>
                          <option value="data-asc">Data (mais antigas)</option>
                          <option value="valor-desc">Maior valor</option>
                          <option value="valor-asc">Menor valor</option>
                        </Sel>
                      </div>
                    )}
                    {ordenarCompras(comprasFiltradas, getOrdem(cartao.id)).map((compra) => {
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

      <MeusCartoes cardProfiles={cardProfiles} setCardProfiles={setCardProfiles} />
      </>
      )}
    </div>
  );
}

// ─── Meus Cartões (perfis cadastrados) ───────────────────────
function MeusCartoes({ cardProfiles, setCardProfiles }) {
  const [list, setList] = useState(cardProfiles || []);
  const [novo, setNovo] = useState({ nome: "", banco: "", limite: "", vencimentoDia: "", fechamentoDia: "", finais: "" });
  useEffect(() => { setList(cardProfiles || []); }, [cardProfiles]);

  const upd = (id, k, v) => setList((l) => l.map((p) => (p.id === id ? { ...p, [k]: v } : p)));
  const rm = (id) => setList((l) => l.filter((p) => p.id !== id));
  function add() {
    if (!novo.nome.trim()) return;
    setList((l) => [...l, {
      id: genId(), nome: novo.nome.trim(), banco: novo.banco.trim(),
      limite: parseFloat((novo.limite || "").replace(",", ".")) || 0,
      vencimentoDia: parseInt(novo.vencimentoDia) || null,
      fechamentoDia: parseInt(novo.fechamentoDia) || null,
      finais: (novo.finais || "").replace(/\D/g, "").slice(-4),
    }]);
    setNovo({ nome: "", banco: "", limite: "", vencimentoDia: "", fechamentoDia: "", finais: "" });
  }
  const dirty = JSON.stringify(list) !== JSON.stringify(cardProfiles || []);
  const nf = (k) => (e) => setNovo((p) => ({ ...p, [k]: e.target.value }));

  if (!setCardProfiles) return null;

  return (
    <Card style={{ marginBottom: 16 }}>
      <STitle><IcoTxt Icon={WalletCards} size={15}>Meus cartões</IcoTxt></STitle>
      <p style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>Cadastre seus cartões uma vez. Na importação de fatura eles são reconhecidos automaticamente (pelo banco ou pelos 4 finais) e pré-preenchem os dados. <strong style={{ color: C.subtle }}>Fecha</strong> é o dia em que a fatura vira: compra até esse dia entra na fatura do mês; depois dele, na seguinte — é o que define em que mês cai a 1ª parcela de uma compra parcelada.</p>

      {list.map((p) => (
        <div key={p.id} style={{ background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
          <div className="card-profile-grid">
            <Field label="Apelido"><Inp value={p.nome} onChange={(e) => upd(p.id, "nome", e.target.value)} /></Field>
            <Field label="Banco"><Inp value={p.banco || ""} onChange={(e) => upd(p.id, "banco", e.target.value)} /></Field>
            <Field label="Limite"><MoneyInput value={p.limite ?? ""} onChange={(e) => upd(p.id, "limite", e.target.value)} /></Field>
            <Field label="Venc."><Inp type="number" placeholder="dia" value={p.vencimentoDia ?? ""} onChange={(e) => upd(p.id, "vencimentoDia", e.target.value)} /></Field>
            <Field label="Fecha"><Inp type="number" min={1} max={31} placeholder="dia" value={p.fechamentoDia ?? ""} onChange={(e) => upd(p.id, "fechamentoDia", e.target.value)} /></Field>
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
          <Field label="Fecha"><Inp type="number" min={1} max={31} placeholder="dia" value={novo.fechamentoDia} onChange={nf("fechamentoDia")} /></Field>
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
