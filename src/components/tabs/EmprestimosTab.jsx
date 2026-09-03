// @ts-nocheck
import { useState, useEffect } from "react";
import { C, fmt, fmtPct, genId, todayStr, tint } from "../../lib/constants";
import { SISTEMAS, normSistema, calcParcela, calcSaldoDevedor, calcParcelasPagas, calcDataQuitacao, resumoEmprestimo, taxaMensalParaAnual, taxaAnualParaMensal, emprestimoEstado, emprestimoRows } from "../../lib/finance";
import { Card, Label, Field, Inp, Btn, Bar, Empty, STitle, Divider, IcoTxt, MoneyInput } from "../ui";
import { Pencil, Trash2, Scale, TrendingDown, ReceiptText, BanknoteArrowDown, Check, Save, CircleCheck, Siren, RefreshCw, X } from "../../lib/icons.jsx";
import { MembroSelect, MembroFilter, pertenceAoMembro, membrosOrdenados, nomeMembro } from "../Membros.jsx";

export default function EmprestimosTab({ emprestimos, setEmprestimos, membros = [] }) {
  const EMPTY = { instituicao: "", contrato: "", sistema: "PRICE", valorContratado: "", taxa: "", taxaPeriodo: "mensal", dataContratacao: "", dataPrimeira: "", dataQuitacao: "", parcelas: "", pago: "0", pagoAuto: true, membroId: null };
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState(null);
  const [filtroMembro, setFiltroMembro] = useState("todos");
  const [amortOpen, setAmortOpen] = useState(null);   // id do empréstimo com o form de aporte aberto
  const [amortForm, setAmortForm] = useState({ valor: "", tipo: "prazo", parcela: "", data: "" });
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
    const entry = { ...form, sistema, valorContratado: pv, taxa: round4(taxa), taxaPeriodo, parcelas: n, pago, pagoAuto, dataPrimeira: form.dataPrimeira, id: editId || genId() };
    if (editId) setEmprestimos(emprestimos.map((e) => (e.id === editId ? entry : e)));
    else setEmprestimos([...emprestimos, entry]);
    setForm(EMPTY); setEditId(null); setShowForm(false);
  }
  function startEdit(e) {
    const periodo = e.taxaPeriodo === "anual" ? "anual" : "mensal";
    const taxaStr = periodo === "anual" ? String(round4(taxaMensalParaAnual(e.taxa))) : String(e.taxa);
    setForm({ ...EMPTY, ...e, sistema: normSistema(e.sistema), valorContratado: String(e.valorContratado), taxa: taxaStr, taxaPeriodo: periodo, parcelas: String(e.parcelas), pago: String(e.pago), pagoAuto: e.pagoAuto !== false });
    setEditId(e.id); setShowForm(true);
  }
  // ── Amortização extraordinária (aporte) ──
  function abrirAmort(emp, pagoEf) {
    setAmortOpen(amortOpen === emp.id ? null : emp.id);
    setAmortForm({ valor: "", tipo: "prazo", parcela: String(Math.max(1, pagoEf || 1)), data: todayStr() });
  }
  function addAmort(emp) {
    const valor = parseFloat((amortForm.valor || "").replace(",", ".")) || 0;
    if (valor <= 0) return;
    const item = { id: genId(), data: amortForm.data || todayStr(), valor, tipo: amortForm.tipo === "parcela" ? "parcela" : "prazo", parcela: Math.max(1, parseInt(amortForm.parcela) || 1) };
    setEmprestimos(emprestimos.map((e) => (e.id === emp.id ? { ...e, amortizacoes: [...(e.amortizacoes || []), item] } : e)));
    setAmortOpen(null);
  }
  function removeAmort(emp, aid) {
    setEmprestimos(emprestimos.map((e) => (e.id === emp.id ? { ...e, amortizacoes: (e.amortizacoes || []).filter((a) => a.id !== aid) } : e)));
  }
  function remove(id) { setEmprestimos(emprestimos.filter((e) => e.id !== id)); if (detail?.id === id) setDetail(null); }
  function updatePago(emp, val) { const v = Math.min(emp.parcelas, Math.max(0, parseInt(val) || 0)); setEmprestimos(emprestimos.map((e) => (e.id === emp.id ? { ...e, pago: v, pagoAuto: false } : e))); }

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
        <div className="stat-grid" style={{ marginBottom: 14 }}>
          {[{ label: "Saldo Devedor Total", value: fmt(totalSD), color: C.rose, Icon: Scale }, { label: "Parcela Mensal Total", value: fmt(totalPMT), color: C.amber, Icon: TrendingDown }, { label: "Contratos ativos", value: empView.length, color: C.cyan, Icon: ReceiptText }].map((c) => (
            <Card key={c.label} style={{ padding: "12px 13px" }}>
              <div style={{ marginBottom: 6, color: c.color }}><c.Icon size={16} strokeWidth={2} /></div>
              <Label>{c.label}</Label>
              <div style={{ fontSize: 14, fontWeight: 800, color: c.color }}>{c.value}</div>
            </Card>
          ))}
        </div>
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
              <div className="tab-strip" role="tablist" style={{ display: "flex", gap: 8 }}>
                {SISTEMAS.map((s) => {
                  const on = sistema === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setForm((p) => ({ ...p, sistema: s.id }))}
                      style={{
                        flex: 1, padding: "9px 12px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 700,
                        border: `1px solid ${on ? C.accent : C.border}`,
                        background: on ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--fill)",
                        color: on ? C.accent : C.subtle,
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Valor Contratado (R$)"><MoneyInput placeholder="0,00" value={form.valorContratado} onChange={f("valorContratado")} /></Field>
            <Field label="Taxa de Juros (%)">
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                {[{ id: "mensal", l: "Mensal" }, { id: "anual", l: "Anual" }].map((o) => {
                  const on = taxaPeriodo === o.id;
                  return <button key={o.id} type="button" onClick={() => setForm((p) => ({ ...p, taxaPeriodo: o.id }))} style={{ flex: 1, padding: "6px 8px", borderRadius: 8, cursor: "pointer", fontSize: 11.5, fontWeight: 700, border: `1px solid ${on ? C.accent : C.border}`, background: on ? tint(C.accent, 12) : "var(--fill)", color: on ? C.accent : C.subtle }}>{o.l}</button>;
                })}
              </div>
              <Inp type="number" placeholder={taxaPeriodo === "anual" ? "Ex: 19.56" : "Ex: 1.5"} value={form.taxa} onChange={f("taxa")} />
              {taxaInput > 0 && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 5 }}>≈ {taxaPeriodo === "anual" ? `${round4(taxa)}% ao mês` : `${round4(taxaAnual)}% ao ano`}</div>}
            </Field>
            <Field label="Número de Parcelas"><Inp type="number" placeholder="Ex: 48" value={form.parcelas} onChange={f("parcelas")} /></Field>
            <Field label="Data de Contratação"><Inp type="date" value={form.dataContratacao} onChange={f("dataContratacao")} /></Field>
            <Field label="Data da 1ª Parcela"><Inp type="date" value={form.dataPrimeira} onChange={f("dataPrimeira")} /></Field>
            <Field label="Data de Quitação (auto)"><Inp type="date" value={form.dataQuitacao} onChange={f("dataQuitacao")} style={{ background: "var(--fill-2)" }} /></Field>
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
        return (
          <Card key={emp.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {emp.instituicao}
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.cyan, background: "color-mix(in srgb, var(--info) 14%, transparent)", padding: "2px 8px", borderRadius: 20 }}>{empSAC ? "SAC" : "Price"}</span>
                  {membrosOrdenados(membros).length > 1 && <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, background: "color-mix(in srgb, var(--accent) 12%, transparent)", padding: "2px 8px", borderRadius: 20 }}>{nomeMembro(emp.membroId, membros)}</span>}
                </div>
                {emp.contrato && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Contrato: {emp.contrato}</div>}
                {emp.dataPrimeira && <div style={{ fontSize: 11, color: C.muted }}>1ª parcela: {new Date(emp.dataPrimeira + "T12:00:00").toLocaleDateString("pt-BR")}</div>}
                {emp.dataQuitacao && <div style={{ fontSize: 11, color: C.muted }}>Quitação: {new Date(emp.dataQuitacao + "T12:00:00").toLocaleDateString("pt-BR")}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button onClick={() => abrirAmort(emp, pagoEf)} style={{ padding: "4px 9px", background: tint(C.emerald, 12), border: `1px solid ${tint(C.emerald, 26)}`, borderRadius: 7, color: C.emerald, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{isAmort ? "Fechar" : "Amortizar"}</button>
                <button onClick={() => setDetail(isDetail ? null : emp)} style={{ padding: "4px 9px", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 7, color: C.cyan, fontSize: 10, cursor: "pointer" }}>{isDetail ? "Fechar" : "Tabela"}</button>
                <button className="mini-act" aria-label="Editar" onClick={() => startEdit(emp)} style={{ padding: "6px 9px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, color: C.indigo, cursor: "pointer" }}><Pencil size={14} /></button>
                <button className="mini-act" aria-label="Excluir" onClick={() => remove(emp.id)} style={{ padding: "6px 9px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: C.red, cursor: "pointer" }}><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="stat-grid" style={{ marginBottom: 12 }}>
              {[{ l: "Valor Contratado", v: fmt(emp.valorContratado), c: C.text }, { l: empSAC ? "Próxima Parcela" : "Parcela (Price)", v: fmt(pmt2), c: C.indigo }, { l: "Saldo Devedor", v: fmt(sd), c: C.rose }, { l: "Taxa mensal", v: `${round4(emp.taxa)}% a.m.`, c: C.amber }, { l: "Taxa anual", v: `${round4(taxaAnualEmp)}% a.a.`, c: C.amber }, { l: "Pagas / Total", v: `${pagoEf} / ${nFinal}`, c: C.subtle }, { l: "Restantes", v: rest, c: rest === 0 ? C.emerald : C.cyan }].map((x) => (
                <div key={x.l} style={{ background: "var(--fill-2)", borderRadius: 8, padding: "9px 11px" }}>
                  <Label>{x.l}</Label>
                  <div style={{ fontSize: 13, fontWeight: 700, color: x.c }}>{x.v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginBottom: 4 }}>
                <span>Progresso de pagamento</span><span>{fmtPct(pct)}</span>
              </div>
              <Bar pct={pct} color={pct >= 100 ? C.emerald : C.indigo} h={7} />
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
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {[{ id: "prazo", l: "Reduzir prazo" }, { id: "parcela", l: "Reduzir parcela" }].map((o) => {
                    const on = amortForm.tipo === o.id;
                    return <button key={o.id} type="button" onClick={() => setAmortForm((p) => ({ ...p, tipo: o.id }))} style={{ flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, border: `1px solid ${on ? C.accent : C.border}`, background: on ? tint(C.accent, 12) : "transparent", color: on ? C.accent : C.muted }}>{o.l}</button>;
                  })}
                </div>
                <div className="form-grid-2">
                  <Field label="Valor do aporte (R$)"><MoneyInput placeholder="0,00" value={amortForm.valor} onChange={(e) => setAmortForm((p) => ({ ...p, valor: e.target.value }))} /></Field>
                  <Field label="Após a parcela nº"><Inp type="number" min={1} max={emp.parcelas} value={amortForm.parcela} onChange={(e) => setAmortForm((p) => ({ ...p, parcela: e.target.value }))} /></Field>
                </div>
                <div style={{ fontSize: 10.5, color: C.muted, margin: "6px 0 10px", lineHeight: 1.4 }}>{amortForm.tipo === "parcela" ? "Mantém o número de parcelas e reduz o valor de cada uma." : "Mantém o valor da parcela e antecipa a quitação (menos parcelas)."}</div>
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
                    <span style={{ fontSize: 10.5, color: C.muted }}>{a.tipo === "parcela" ? "reduz parcela" : "reduz prazo"} · após parc. {a.parcela}{a.data ? ` · ${new Date(a.data + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}</span>
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
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                        {["Parc.", "Prestação", "Juros", "Amortização", ...(aportes.length ? ["Aporte"] : []), "Saldo"].map((h) => <th key={h} style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700 }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {getSchedule(emp, pagoEf).map((row) => (
                        <tr key={row.k} style={{ background: row.extra > 0 ? tint(C.emerald, 12) : (row.pago ? "rgba(16,185,129,0.06)" : "transparent"), borderBottom: `1px solid var(--fill-2)` }}>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: row.pago ? C.emerald : C.muted }}>{row.k}{row.pago && <Check size={11} style={{ marginLeft: 4, verticalAlign: "-1px" }} />}</td>
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
