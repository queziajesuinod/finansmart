// @ts-nocheck
import { useState, useEffect } from "react";
import { C, fmt, fmtPct, genId, todayStr, tint } from "../../lib/constants";
import { SISTEMAS, normSistema, calcParcela, calcSaldoDevedor, calcParcelasPagas, calcDataQuitacao, resumoEmprestimo, taxaMensalParaAnual, taxaAnualParaMensal, emprestimoEstado, emprestimoRows, diaVencimentoEmprestimo, parcelaDeData } from "../../lib/finance";
import { Card, Label, Field, Inp, Btn, Bar, Empty, STitle, Divider, IcoTxt, MoneyInput } from "../ui";
import { Pencil, Trash2, Scale, TrendingDown, ReceiptText, BanknoteArrowDown, Check, Save, CircleCheck, Siren, RefreshCw, X } from "../../lib/icons.jsx";
import { MembroSelect, MembroFilter, pertenceAoMembro, membrosOrdenados, nomeMembro } from "../Membros.jsx";

const fmtNum = (v) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

// Data de vencimento da parcela nº k: 1ª parcela + (k−1) meses, no dia de
// vencimento (o informado ou o da 1ª parcela). null sem data da 1ª parcela.
function dataParcelaDate(emp, k) {
  if (!emp || !emp.dataPrimeira) return null;
  const base = new Date(String(emp.dataPrimeira).slice(0, 10) + "T12:00:00");
  if (Number.isNaN(base.getTime())) return null;
  const diaV = diaVencimentoEmprestimo(emp) || base.getDate();
  const d = new Date(base.getFullYear(), base.getMonth() + (k - 1), 1, 12, 0, 0);
  const ult = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(diaV, ult));
  return d;
}
function dataParcelaStr(emp, k) { const d = dataParcelaDate(emp, k); return d ? d.toLocaleDateString("pt-BR") : "—"; }
function dataParcelaISO(emp, k) { const d = dataParcelaDate(emp, k); return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : ""; }
// Compara a data paga com o vencimento → adiantado / em dia / atraso.
function statusPagamento(vencISO, pagoISO) {
  if (!vencISO || !pagoISO) return null;
  const v = new Date(vencISO + "T12:00:00"), p = new Date(pagoISO + "T12:00:00");
  if (Number.isNaN(v.getTime()) || Number.isNaN(p.getTime())) return null;
  const dias = Math.round((p - v) / 86400000);
  if (dias === 0) return { txt: "em dia", cor: C.muted };
  if (dias < 0) return { txt: `${-dias}d adiant.`, cor: C.emerald };
  return { txt: `${dias}d atraso`, cor: dias > 5 ? C.red : C.amber };
}

export default function EmprestimosTab({ emprestimos, setEmprestimos, membros = [] }) {
  const EMPTY = { instituicao: "", contrato: "", sistema: "PRICE", valorContratado: "", taxa: "", taxaPeriodo: "mensal", dataContratacao: "", dataPrimeira: "", dataQuitacao: "", diaVencimento: "", parcelas: "", pago: "0", pagoAuto: true, membroId: null };
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState(null);
  const [filtroMembro, setFiltroMembro] = useState("todos");
  const [amortOpen, setAmortOpen] = useState(null);   // id do empréstimo com o form de aporte aberto
  const AMORT_VAZIO = { valor: "", tipo: "prazo", parcela: "", data: "", banco: false, novoSaldo: "", novaParcela: "", novoPrazo: "" };
  const [amortForm, setAmortForm] = useState(AMORT_VAZIO);
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const pv = parseFloat((form.valorContratado || "").replace(",", ".")) || 0;
  // A taxa pode ser digitada como MENSAL ou ANUAL; internamente tudo roda em MENSAL.
  const taxaPeriodo = form.taxaPeriodo === "anual" ? "anual" : "mensal";
  const taxaInput = parseFloat((form.taxa || "").replace(",", ".")) || 0;
  const taxa = taxaPeriodo === "anual" ? taxaAnualParaMensal(taxaInput) : taxaInput; // mensal (canônica)
  const taxaAnual = taxaMensalParaAnual(taxa);
  const n = parseInt(form.parcelas) || 0;
  const sistema = normSistema(form.sistema);
  const isSAC = sistema === "SAC";
  const pagoAuto = form.pagoAuto !== false;
  const pagoCalc = pagoAuto ? calcParcelasPagas(form.dataPrimeira, n) : (parseInt(form.pago) || 0);
  const pago = Math.min(n, Math.max(0, pagoCalc));
  const resumo = resumoEmprestimo(sistema, pv, taxa, n);
  const parcelaAtual = calcParcela(sistema, pv, taxa, n, pago + 1); // valor da próxima parcela a vencer
  const saldo = calcSaldoDevedor(pv, taxa, n, pago, sistema);
  const restantes = Math.max(0, n - pago);

  useEffect(() => {
    if (form.dataPrimeira && form.parcelas) {
      setForm((p) => ({ ...p, dataQuitacao: calcDataQuitacao(form.dataPrimeira, parseInt(form.parcelas)) }));
    }
  }, [form.dataPrimeira, form.parcelas]);

  const round4 = (x) => Math.round(x * 10000) / 10000;
  function submit() {
    if (!form.instituicao || !pv || !n) return;
    // `taxa` armazenada é sempre MENSAL; taxaPeriodo guarda a unidade digitada.
    const diaV = parseInt(form.diaVencimento, 10);
    const entry = { ...form, sistema, valorContratado: pv, taxa: round4(taxa), taxaPeriodo, parcelas: n, pago, pagoAuto, dataPrimeira: form.dataPrimeira, diaVencimento: diaV >= 1 && diaV <= 31 ? diaV : null, id: editId || genId() };
    if (editId) setEmprestimos(emprestimos.map((e) => (e.id === editId ? entry : e)));
    else setEmprestimos([...emprestimos, entry]);
    setForm(EMPTY); setEditId(null); setShowForm(false);
  }
  function startEdit(e) {
    const periodo = e.taxaPeriodo === "anual" ? "anual" : "mensal";
    const taxaStr = periodo === "anual" ? String(round4(taxaMensalParaAnual(e.taxa))) : String(e.taxa);
    setForm({ ...EMPTY, ...e, sistema: normSistema(e.sistema), valorContratado: String(e.valorContratado), taxa: taxaStr, taxaPeriodo: periodo, parcelas: String(e.parcelas), pago: String(e.pago), pagoAuto: e.pagoAuto !== false, diaVencimento: e.diaVencimento ? String(e.diaVencimento) : "" });
    setEditId(e.id); setShowForm(true);
  }
  // ── Amortização extraordinária (aporte) ──
  function abrirAmort(emp, pagoEf) {
    setAmortOpen(amortOpen === emp.id ? null : emp.id);
    setAmortForm({ ...AMORT_VAZIO, parcela: String(Math.max(1, pagoEf || 1)), data: todayStr() });
  }
  function addAmort(emp) {
    const valor = parseFloat((amortForm.valor || "").replace(",", ".")) || 0;
    const dec = (v) => parseFloat(String(v || "").replace(",", ".")) || 0;
    // Valores informados pelo banco (opcionais): substituem o cálculo automático.
    const banco = amortForm.banco
      ? { novoSaldo: dec(amortForm.novoSaldo), novaParcela: dec(amortForm.novaParcela), novoPrazo: Math.max(0, parseInt(amortForm.novoPrazo) || 0) }
      : { novoSaldo: 0, novaParcela: 0, novoPrazo: 0 };
    const temBanco = banco.novoSaldo > 0 || banco.novaParcela > 0 || banco.novoPrazo > 0;
    if (valor <= 0 && !temBanco) return;
    // A parcela é derivada da DATA da amortização (quantas já venceram até lá).
    // Sem data da 1ª parcela, usa o nº informado manualmente.
    const kData = parcelaDeData(emp, amortForm.data);
    const parcelaFinal = kData != null ? Math.max(1, kData) : Math.max(1, parseInt(amortForm.parcela) || 1);
    const item = {
      id: genId(), data: amortForm.data || todayStr(), valor, tipo: amortForm.tipo === "parcela" ? "parcela" : "prazo", parcela: parcelaFinal,
      ...(banco.novoSaldo > 0 ? { novoSaldo: banco.novoSaldo } : {}),
      ...(banco.novaParcela > 0 ? { novaParcela: banco.novaParcela } : {}),
      ...(banco.novoPrazo > 0 ? { novoPrazo: banco.novoPrazo } : {}),
    };
    setEmprestimos(emprestimos.map((e) => (e.id === emp.id ? { ...e, amortizacoes: [...(e.amortizacoes || []), item] } : e)));
    setAmortOpen(null);
  }
  function removeAmort(emp, aid) {
    setEmprestimos(emprestimos.map((e) => (e.id === emp.id ? { ...e, amortizacoes: (e.amortizacoes || []).filter((a) => a.id !== aid) } : e)));
  }
  function remove(id) { setEmprestimos(emprestimos.filter((e) => e.id !== id)); if (detail?.id === id) setDetail(null); }
  function updatePago(emp, val) { const v = Math.min(emp.parcelas, Math.max(0, parseInt(val) || 0)); setEmprestimos(emprestimos.map((e) => (e.id === emp.id ? { ...e, pago: v, pagoAuto: false } : e))); }
  // Registra/limpa a data real em que a parcela nº k foi paga (controle de
  // adiantado/atraso). Guardado em emp.pagamentosParcelas = { [k]: "YYYY-MM-DD" }.
  function setPagParcela(emp, k, data) {
    setEmprestimos(emprestimos.map((e) => {
      if (e.id !== emp.id) return e;
      const pp = { ...(e.pagamentosParcelas || {}) };
      if (data) pp[k] = data; else delete pp[k];
      return { ...e, pagamentosParcelas: pp };
    }));
  }

  const empViewAll = emprestimos.map((e) => {
    const p = e.pagoAuto !== false && e.dataPrimeira ? calcParcelasPagas(e.dataPrimeira, e.parcelas) : e.pago;
    return { ...e, pagoEfetivo: Math.min(e.parcelas, Math.max(0, p)) };
  });
  // Filtro por membro (principal x dependentes).
  const empView = empViewAll.filter((e) => pertenceAoMembro(e, filtroMembro, membros));

  // Totais já consideram os aportes extraordinários (motor de amortização).
  const totalSD = empView.reduce((s, e) => s + emprestimoEstado(e, e.pagoEfetivo).saldo, 0);
  // Parcela mensal total = a próxima parcela a vencer de cada contrato (no SAC ela varia).
  const totalPMT = empView.reduce((s, e) => s + emprestimoEstado(e, e.pagoEfetivo).proxima, 0);

  function getSchedule(emp, pagoEf) {
    return emprestimoRows(emp).map((row) => ({ ...row, pago: row.k <= pagoEf }));
  }

  return (
    <div>
      {emprestimos.length > 0 && (
        <section className="vg-card" style={{ marginBottom: 14 }} aria-label="Dívidas">
          <svg className="vg-wave" viewBox="0 0 360 210" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="divwv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6A6AFF" stopOpacity=".5" /><stop offset="1" stopColor="#1414C8" stopOpacity=".1" /></linearGradient></defs>
            <path d="M360 0 L232 0 C262 54 196 92 250 140 C280 166 300 190 300 210 L360 210 Z" fill="url(#divwv)" />
            <path d="M360 0 L286 0 C300 46 250 78 300 128 C322 150 338 182 338 210 L360 210 Z" fill="#8080FF" fillOpacity=".16" />
          </svg>
          <div className="vg-sheen" />
          <div className="vg-cnt">
            <div className="vg-top">
              <div className="vg-kic">Dívidas · saldo devedor</div>
              <span className="vg-chip" style={{ background: "rgba(251,191,36,.18)", color: "#FFD79A", borderColor: "rgba(251,191,36,.45)" }}>{empView.length} contrato{empView.length === 1 ? "" : "s"}</span>
            </div>
            <div className="vg-bal"><small>R$</small>{fmtNum(totalSD)}</div>
            <div className="vg-desc">Parcela mensal total {fmt(totalPMT)}</div>
            <div className="vg-splits">
              <div className="vg-split"><div className="l"><span className="vg-dot" style={{ background: "#FFD79A" }} />Parcela mensal</div><div className="v">{fmt(totalPMT)}</div></div>
              <div className="vg-split"><div className="l"><span className="vg-dot" style={{ background: "#ADADFF" }} />Contratos</div><div className="v">{empView.length}</div></div>
            </div>
          </div>
        </section>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <STitle style={{ margin: 0 }}><IcoTxt Icon={BanknoteArrowDown} size={15}>Meus Empréstimos</IcoTxt></STitle>
        <Btn variant="sm" onClick={() => { setShowForm((p) => !p); setEditId(null); setForm(EMPTY); }}>+ Novo empréstimo</Btn>
      </div>

      <MembroFilter membros={membros} value={filtroMembro} onChange={setFiltroMembro} />

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <STitle>{editId ? "Editar empréstimo" : "Novo empréstimo"}</STitle>
          <div className="form-grid-2" style={{ marginBottom: 12 }}>
            <Field label="Instituição Financeira" span={1}><Inp placeholder="Ex: Caixa, Nubank..." value={form.instituicao} onChange={f("instituicao")} /></Field>
            <Field label="Número do Contrato"><Inp placeholder="Opcional" value={form.contrato} onChange={f("contrato")} /></Field>
            <Field label="Sistema de Amortização" span={2}>
              <div className="seg" role="tablist" style={{ display: "flex", width: "100%" }}>
                {SISTEMAS.map((s) => (
                  <button key={s.id} type="button" aria-pressed={sistema === s.id} onClick={() => setForm((p) => ({ ...p, sistema: s.id }))} style={{ flex: 1 }}>{s.label}</button>
                ))}
              </div>
            </Field>
            <Field label="Valor Contratado (R$)"><MoneyInput placeholder="0,00" value={form.valorContratado} onChange={f("valorContratado")} /></Field>
            <Field label="Taxa de Juros (%)">
              <div className="seg" style={{ display: "flex", width: "100%", marginBottom: 6 }}>
                {[{ id: "mensal", l: "Mensal" }, { id: "anual", l: "Anual" }].map((o) => (
                  <button key={o.id} type="button" aria-pressed={taxaPeriodo === o.id} onClick={() => setForm((p) => ({ ...p, taxaPeriodo: o.id }))} style={{ flex: 1 }}>{o.l}</button>
                ))}
              </div>
              <Inp type="number" placeholder={taxaPeriodo === "anual" ? "Ex: 19.56" : "Ex: 1.5"} value={form.taxa} onChange={f("taxa")} />
              {taxaInput > 0 && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 5 }}>≈ {taxaPeriodo === "anual" ? `${round4(taxa)}% ao mês` : `${round4(taxaAnual)}% ao ano`}</div>}
            </Field>
            <Field label="Número de Parcelas"><Inp type="number" placeholder="Ex: 48" value={form.parcelas} onChange={f("parcelas")} /></Field>
            <Field label="Data de Contratação"><Inp type="date" value={form.dataContratacao} onChange={f("dataContratacao")} /></Field>
            <Field label="Data da 1ª Parcela"><Inp type="date" value={form.dataPrimeira} onChange={f("dataPrimeira")} /></Field>
            <Field label="Data de Quitação (auto)"><Inp type="date" value={form.dataQuitacao} onChange={f("dataQuitacao")} style={{ background: "var(--fill-2)" }} /></Field>
            <Field label="Dia de Vencimento das Parcelas" span={2}>
              <Inp type="number" min={1} max={31} placeholder={form.dataPrimeira ? `Dia ${new Date(form.dataPrimeira + "T12:00:00").getDate()} (igual à 1ª parcela)` : "Ex: 20"} value={form.diaVencimento} onChange={f("diaVencimento")} style={{ maxWidth: 260 }} />
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 5, lineHeight: 1.4 }}>A parcela de cada mês aparece no Extrato nesta data. Em branco, vale o dia da 1ª parcela.</div>
            </Field>
          </div>
          <MembroSelect membros={membros} value={form.membroId} onChange={(v) => setForm((p) => ({ ...p, membroId: v }))} label="De quem é este empréstimo?" style={{ marginBottom: 12 }} />
          <div style={{ background: "var(--fill-2)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: pagoAuto ? 0 : 10 }}>
              <input type="checkbox" checked={pagoAuto} onChange={(e) => setForm((p) => ({ ...p, pagoAuto: e.target.checked }))} />
              <span style={{ fontSize: 12, color: C.subtle }}>Calcular parcelas pagas automaticamente pela data da 1ª parcela</span>
            </label>
            {pagoAuto
              ? (form.dataPrimeira
                ? <div style={{ fontSize: 12, color: C.emerald, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}><CircleCheck size={13} /> {pago} parcela{pago !== 1 ? "s" : ""} já vencida{pago !== 1 ? "s" : ""} até hoje ({restantes} restante{restantes !== 1 ? "s" : ""})</div>
                : <div style={{ fontSize: 11, color: C.amber, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}><Siren size={13} /> Informe a data da 1ª parcela acima para o cálculo automático.</div>)
              : <Field label="Parcelas Pagas (manual)"><Inp type="number" placeholder="0" value={form.pago} onChange={f("pago")} style={{ maxWidth: 140 }} /></Field>
            }
          </div>
          {pv > 0 && n > 0 && (
            <div style={{ background: "rgba(99,102,241,0.07)", border: `1px solid rgba(99,102,241,0.2)`, borderRadius: 11, padding: "13px 16px", marginBottom: 14 }}>
              <STitle>{isSAC ? "Cálculo pela Tabela SAC" : "Cálculo pela Tabela Price"}</STitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                {(isSAC
                  ? [{ label: "1ª Parcela", value: fmt(resumo.parcelaInicial), color: C.indigo }, { label: "Última Parcela", value: fmt(resumo.parcelaFinal), color: C.indigo }, { label: "Total a Pagar", value: fmt(resumo.totalPago), color: C.amber }, { label: "Juros Totais", value: fmt(resumo.totalJuros), color: C.rose }, { label: "Saldo Devedor Atual", value: fmt(saldo), color: C.cyan }, { label: "Parcelas Pagas", value: `${pago} de ${n}`, color: C.emerald }]
                  : [{ label: "Valor da Parcela", value: fmt(resumo.parcelaInicial), color: C.indigo }, { label: "Total a Pagar", value: fmt(resumo.totalPago), color: C.amber }, { label: "Juros Totais", value: fmt(resumo.totalJuros), color: C.rose }, { label: "Saldo Devedor Atual", value: fmt(saldo), color: C.cyan }, { label: "Parcelas Restantes", value: restantes, color: C.subtle }, { label: "Parcelas Pagas", value: pago, color: C.emerald }]
                ).map((c) => (
                  <div key={c.label} style={{ background: "var(--fill-2)", borderRadius: 9, padding: "10px 12px" }}>
                    <Label>{c.label}</Label>
                    <div style={{ fontSize: 15, fontWeight: 800, color: c.color }}>{c.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginBottom: 5 }}>
                  <span>Progresso: {pago} de {n} parcelas</span>
                  <span>{n > 0 ? fmtPct(pago / n * 100) : "0%"}</span>
                </div>
                <Bar pct={n > 0 ? pago / n * 100 : 0} color={C.emerald} h={7} />
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={submit} style={{ flex: 1 }}>{editId ? <IcoTxt Icon={Save}>Salvar</IcoTxt> : <IcoTxt Icon={Check}>Adicionar</IcoTxt>}</Btn>
            <Btn variant="ghost" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY); }}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {emprestimos.length === 0 && !showForm && <Empty icon="" title="Nenhum empréstimo cadastrado" sub='Clique em "+ Novo empréstimo" para começar.' />}

      {empView.map((emp) => {
        const sist = normSistema(emp.sistema);
        const empSAC = sist === "SAC";
        const pagoEf = emp.pagoEfetivo;
        const est = emprestimoEstado(emp, pagoEf);   // saldo/próxima/prazo já com aportes
        const pmt2 = est.proxima; // próxima parcela
        const sd = est.saldo;
        const nFinal = est.nFinal;                    // prazo final (encurta com aporte "prazo")
        const rest = est.restantes;
        const pct = nFinal > 0 ? (Math.min(pagoEf, nFinal) / nFinal) * 100 : 0;
        const taxaAnualEmp = taxaMensalParaAnual(emp.taxa);
        const aportes = emp.amortizacoes || [];
        const totalAportado = aportes.reduce((s, a) => s + (Number(a.valor) || 0), 0);
        const jurosBase = resumoEmprestimo(sist, emp.valorContratado, emp.taxa, emp.parcelas).totalJuros;
        const economiaJuros = Math.max(0, jurosBase - est.totalJuros);
        const isDetail = detail?.id === emp.id;
        const isAuto = emp.pagoAuto !== false && emp.dataPrimeira;
        const isAmort = amortOpen === emp.id;
        const diaVenc = diaVencimentoEmprestimo(emp);
        return (
          <Card key={emp.id} style={{ marginBottom: 12 }}>
            {/* Banner "cartão de dívida" — saldo devedor + próxima parcela + progresso. */}
            <div className="cc">
              <svg className="cc-wave" viewBox="0 0 360 150" preserveAspectRatio="none" aria-hidden="true">
                <defs><linearGradient id={`divw-${emp.id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6A6AFF" stopOpacity=".5" /><stop offset="1" stopColor="#1414C8" stopOpacity=".1" /></linearGradient></defs>
                <path d="M360 0 L236 0 C266 40 200 66 254 100 C284 118 300 140 300 150 L360 150 Z" fill={`url(#divw-${emp.id})`} />
                <path d="M360 0 L290 0 C304 34 256 56 304 92 C326 108 338 130 338 150 L360 150 Z" fill="#8080FF" fillOpacity=".16" />
              </svg>
              <div className="cc-cnt">
                <div className="cc-top">
                  <div className="cc-bank">{empSAC ? "SAC" : "Price"}{membrosOrdenados(membros).length > 1 ? ` · ${nomeMembro(emp.membroId, membros)}` : ""}</div>
                  <div className="cc-acts">
                    <button className="cc-act" aria-label="Editar" onClick={() => startEdit(emp)}><Pencil size={14} /></button>
                    <button className="cc-act" aria-label="Excluir" onClick={() => remove(emp.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="cc-chip" aria-hidden="true"></div>
                <div className="cc-name">{emp.instituicao}</div>
                <div className="cc-row">
                  <div><div className="l">Saldo devedor</div><div className="fat">{fmt(sd)}</div></div>
                  <div className="venc">Parcela {fmt(pmt2)}{diaVenc ? ` · dia ${diaVenc}` : ""}</div>
                </div>
                <div className="cc-limite">
                  <div className="t"><i style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></div>
                  <div className="x"><span>{fmtPct(pct)} pago</span><span>{rest} parcela{rest !== 1 ? "s" : ""} restante{rest !== 1 ? "s" : ""}</span></div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
              <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => abrirAmort(emp, pagoEf)}>{isAmort ? "Fechar aporte" : "Amortizar"}</button>
              <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => setDetail(isDetail ? null : emp)}>{isDetail ? "Fechar tabela" : "Ver tabela"}</button>
            </div>

            {(emp.contrato || emp.dataPrimeira || emp.dataQuitacao) && (
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
                {[emp.contrato ? `Contrato ${emp.contrato}` : "", emp.dataPrimeira ? `1ª parcela ${new Date(emp.dataPrimeira + "T12:00:00").toLocaleDateString("pt-BR")}` : "", emp.dataQuitacao ? `quitação ${new Date(emp.dataQuitacao + "T12:00:00").toLocaleDateString("pt-BR")}` : ""].filter(Boolean).join(" · ")}
              </div>
            )}

            <div className="stat-grid" style={{ marginBottom: 12 }}>
              {[{ l: "Valor Contratado", v: fmt(emp.valorContratado), c: C.text }, { l: "Taxa mensal", v: `${round4(emp.taxa)}% a.m.`, c: C.amber }, { l: "Taxa anual", v: `${round4(taxaAnualEmp)}% a.a.`, c: C.amber }, { l: "Pagas / Total", v: `${pagoEf} / ${nFinal}`, c: C.subtle }].map((x) => (
                <div key={x.l} style={{ background: "var(--fill-2)", borderRadius: "var(--r-sm)", padding: "9px 11px" }}>
                  <Label>{x.l}</Label>
                  <div style={{ fontSize: 13, fontWeight: 700, color: x.c }}>{x.v}</div>
                </div>
              ))}
            </div>

            {aportes.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald, background: tint(C.emerald, 12), padding: "3px 9px", borderRadius: 999 }}>{aportes.length} aporte{aportes.length > 1 ? "s" : ""} · {fmt(totalAportado)}</span>
                {economiaJuros > 0.5 && <span style={{ fontSize: 11, color: C.muted }}>Economia de juros: <b style={{ color: C.emerald }}>{fmt(economiaJuros)}</b></span>}
              </div>
            )}

            {isAmort && (
              <div style={{ background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 11, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Label>Amortização extraordinária (aporte extra)</Label>
                  <button aria-label="Fechar" onClick={() => setAmortOpen(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "inline-flex" }}><X size={15} /></button>
                </div>
                <div className="seg" style={{ display: "flex", width: "100%", marginBottom: 10 }}>
                  {[{ id: "prazo", l: "Reduzir prazo" }, { id: "parcela", l: "Reduzir parcela" }].map((o) => (
                    <button key={o.id} type="button" aria-pressed={amortForm.tipo === o.id} onClick={() => setAmortForm((p) => ({ ...p, tipo: o.id }))} style={{ flex: 1 }}>{o.l}</button>
                  ))}
                </div>
                <div className="form-grid-2">
                  <Field label="Valor amortizado (R$)"><MoneyInput placeholder="0,00" value={amortForm.valor} onChange={(e) => setAmortForm((p) => ({ ...p, valor: e.target.value }))} /></Field>
                  <Field label="Data da amortização"><Inp type="date" value={amortForm.data} onChange={(e) => setAmortForm((p) => ({ ...p, data: e.target.value }))} /></Field>
                </div>
                {(() => {
                  const k = parcelaDeData(emp, amortForm.data);
                  if (k == null) return <Field label="Após a parcela nº" style={{ marginTop: 10 }}><Inp type="number" min={1} max={emp.parcelas} value={amortForm.parcela} onChange={(e) => setAmortForm((p) => ({ ...p, parcela: e.target.value }))} /></Field>;
                  return <div style={{ fontSize: 11, color: C.muted, margin: "8px 0 2px", display: "flex", alignItems: "center", gap: 6, lineHeight: 1.4 }}><CircleCheck size={13} style={{ color: C.emerald, flexShrink: 0 }} /> Aplicada após a <b style={{ color: C.subtle }}>&nbsp;parcela {k}</b>&nbsp;de {emp.parcelas} — calculado pela data da amortização.</div>;
                })()}
                <div style={{ fontSize: 10.5, color: C.muted, margin: "8px 0 10px", lineHeight: 1.4 }}>Informe o valor e a data que aparecem no extrato do banco. {amortForm.tipo === "parcela" ? "Mantém o número de parcelas e reduz o valor de cada uma." : "Mantém o valor da parcela e antecipa a quitação (menos parcelas)."}</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: amortForm.banco ? 10 : 12 }}>
                  <input type="checkbox" checked={!!amortForm.banco} onChange={(e) => setAmortForm((p) => ({ ...p, banco: e.target.checked }))} />
                  <span style={{ fontSize: 12, color: C.subtle }}>O cálculo não bateu com o banco — informar os valores do banco</span>
                </label>
                {amortForm.banco && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="form-grid-2">
                      <Field label="Novo saldo devedor (R$)"><MoneyInput placeholder="0,00" value={amortForm.novoSaldo} onChange={(e) => setAmortForm((p) => ({ ...p, novoSaldo: e.target.value }))} /></Field>
                      <Field label={empSAC ? "Nova parcela (R$) — não se aplica ao SAC" : "Nova parcela (R$)"}><MoneyInput placeholder="0,00" disabled={empSAC} value={amortForm.novaParcela} onChange={(e) => setAmortForm((p) => ({ ...p, novaParcela: e.target.value }))} /></Field>
                      <Field label="Novo prazo (parcelas restantes)"><Inp type="number" min={1} placeholder="Ex: 300" value={amortForm.novoPrazo} onChange={(e) => setAmortForm((p) => ({ ...p, novoPrazo: e.target.value }))} /></Field>
                    </div>
                    <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>Preencha só o que o banco informou. Esses valores substituem o cálculo automático a partir deste aporte.</div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="success" onClick={() => addAmort(emp)} style={{ flex: 1 }}><IcoTxt Icon={Check}>Lançar aporte</IcoTxt></Btn>
                  <Btn variant="ghost" onClick={() => setAmortOpen(null)}>Cancelar</Btn>
                </div>
              </div>
            )}

            {aportes.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {[...aportes].sort((a, b) => (a.parcela || 0) - (b.parcela || 0)).map((a) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 11px", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.emerald }}>{fmt(a.valor)}</span>
                    <span style={{ fontSize: 10.5, color: C.muted }}>{a.tipo === "parcela" ? "reduz parcela" : "reduz prazo"} · após parc. {a.parcela}{a.data ? ` · ${new Date(a.data + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}{(a.novoSaldo || a.novaParcela || a.novoPrazo) ? ` · banco: ${[a.novoSaldo ? `saldo ${fmt(a.novoSaldo)}` : "", a.novaParcela ? `parcela ${fmt(a.novaParcela)}` : "", a.novoPrazo ? `${a.novoPrazo} parcelas` : ""].filter(Boolean).join(", ")}` : ""}</span>
                    <button className="mini-act" aria-label="Remover aporte" onClick={() => removeAmort(emp, a.id)} style={{ marginLeft: "auto", padding: "4px 7px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 7, color: C.red, cursor: "pointer" }}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}

            {isAuto
              ? <div style={{ fontSize: 11, color: C.emerald, display: "flex", alignItems: "center", gap: 6 }}><RefreshCw size={12} /> Parcelas pagas calculadas automaticamente pela data da 1ª parcela. Edite o empréstimo para ajustar manualmente.</div>
              : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Atualizar parcelas pagas:</span>
                  <input type="number" value={emp.pago} min={0} max={emp.parcelas} onChange={(e) => updatePago(emp, e.target.value)} style={{ width: 70, padding: "5px 8px", background: "var(--fill)", border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, outline: "none" }} />
                  <span style={{ fontSize: 11, color: C.muted }}>de {emp.parcelas}</span>
                </div>
              )
            }
            {isDetail && (
              <div style={{ marginTop: 14 }}>
                <Divider />
                <STitle>{empSAC ? "Tabela SAC completa" : "Tabela Price completa"}</STitle>
                <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 10, lineHeight: 1.45 }}>Preencha <b style={{ color: C.subtle }}>Pago em</b> para registrar quando você realmente pagou cada parcela — o selo mostra se foi <b style={{ color: C.emerald }}>adiantado</b>, em dia ou em <b style={{ color: C.amber }}>atraso</b> (comparado ao vencimento). Em branco, assume pago no vencimento. Para antecipar parcelas futuras, use <b style={{ color: C.subtle }}>Amortizar</b>.</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                        {["Parc.", "Venc.", "Pago em", "Prestação", "Juros", "Amortização", ...(aportes.length ? ["Aporte"] : []), "Saldo"].map((h) => <th key={h} style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700 }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {getSchedule(emp, pagoEf).map((row) => (
                        <tr key={row.k} style={{ background: row.extra > 0 ? tint(C.emerald, 12) : (row.pago ? "rgba(16,185,129,0.06)" : "transparent"), borderBottom: `1px solid var(--fill-2)` }}>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: row.pago ? C.emerald : C.muted }}>{row.k}{row.pago && <Check size={11} style={{ marginLeft: 4, verticalAlign: "-1px" }} />}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: C.muted, whiteSpace: "nowrap" }}>{dataParcelaStr(emp, row.k)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
                            {row.pago ? (() => {
                              const vISO = dataParcelaISO(emp, row.k);
                              const pagoISO = (emp.pagamentosParcelas || {})[row.k] || "";
                              const st = statusPagamento(vISO, pagoISO);
                              return (
                                <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                  <input type="date" value={pagoISO} onChange={(e) => setPagParcela(emp, row.k, e.target.value)} title="Data real do pagamento" style={{ fontSize: 10.5, padding: "3px 5px", background: "var(--fill)", border: `1px solid ${pagoISO ? C.border : "var(--border)"}`, borderRadius: "var(--r-xs)", color: pagoISO ? C.text : C.muted, outline: "none" }} />
                                  {st && <span style={{ fontSize: 9, fontWeight: 800, color: st.cor }}>{st.txt}</span>}
                                </span>
                              );
                            })() : <span style={{ color: C.muted }}>—</span>}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: C.text }}>{fmt(row.pmt)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: C.rose }}>{fmt(row.juros)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: C.emerald }}>{fmt(row.amort)}</td>
                          {aportes.length > 0 && <td style={{ padding: "6px 8px", textAlign: "right", color: C.accent, fontWeight: row.extra > 0 ? 800 : 400 }}>{row.extra > 0 ? fmt(row.extra) : "—"}</td>}
                          <td style={{ padding: "6px 8px", textAlign: "right", color: C.cyan }}>{fmt(row.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
