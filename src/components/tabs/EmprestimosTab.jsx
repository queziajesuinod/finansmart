// @ts-nocheck
import { useState, useEffect } from "react";
import { C, fmt, fmtPct, genId } from "../../lib/constants";
import { calcPMT, calcSaldoDevedor, calcParcelasPagas, calcDataQuitacao } from "../../lib/finance";
import { Card, Label, Field, Inp, Btn, Bar, Empty, STitle, Divider, IcoTxt } from "../ui";
import { Pencil, Trash2, Scale, TrendingDown, ReceiptText, BanknoteArrowDown, Check, Save, CircleCheck, Siren, RefreshCw } from "../../lib/icons.jsx";

export default function EmprestimosTab({ emprestimos, setEmprestimos }) {
  const EMPTY = { instituicao: "", contrato: "", valorContratado: "", taxa: "", dataContratacao: "", dataPrimeira: "", dataQuitacao: "", parcelas: "", pago: "0", pagoAuto: true };
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState(null);
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const pv = parseFloat((form.valorContratado || "").replace(",", ".")) || 0;
  const taxa = parseFloat((form.taxa || "").replace(",", ".")) || 0;
  const n = parseInt(form.parcelas) || 0;
  const pagoAuto = form.pagoAuto !== false;
  const pagoCalc = pagoAuto ? calcParcelasPagas(form.dataPrimeira, n) : (parseInt(form.pago) || 0);
  const pago = Math.min(n, Math.max(0, pagoCalc));
  const pmt = calcPMT(pv, taxa, n);
  const saldo = calcSaldoDevedor(pv, taxa, n, pago);
  const restantes = Math.max(0, n - pago);

  useEffect(() => {
    if (form.dataPrimeira && form.parcelas) {
      setForm((p) => ({ ...p, dataQuitacao: calcDataQuitacao(form.dataPrimeira, parseInt(form.parcelas)) }));
    }
  }, [form.dataPrimeira, form.parcelas]);

  function submit() {
    if (!form.instituicao || !pv || !n) return;
    const entry = { ...form, valorContratado: pv, taxa, parcelas: n, pago, pagoAuto, dataPrimeira: form.dataPrimeira, id: editId || genId() };
    if (editId) setEmprestimos(emprestimos.map((e) => (e.id === editId ? entry : e)));
    else setEmprestimos([...emprestimos, entry]);
    setForm(EMPTY); setEditId(null); setShowForm(false);
  }
  function startEdit(e) { setForm({ ...EMPTY, ...e, valorContratado: String(e.valorContratado), taxa: String(e.taxa), parcelas: String(e.parcelas), pago: String(e.pago), pagoAuto: e.pagoAuto !== false }); setEditId(e.id); setShowForm(true); }
  function remove(id) { setEmprestimos(emprestimos.filter((e) => e.id !== id)); if (detail?.id === id) setDetail(null); }
  function updatePago(emp, val) { const v = Math.min(emp.parcelas, Math.max(0, parseInt(val) || 0)); setEmprestimos(emprestimos.map((e) => (e.id === emp.id ? { ...e, pago: v, pagoAuto: false } : e))); }

  const empView = emprestimos.map((e) => {
    const p = e.pagoAuto !== false && e.dataPrimeira ? calcParcelasPagas(e.dataPrimeira, e.parcelas) : e.pago;
    return { ...e, pagoEfetivo: Math.min(e.parcelas, Math.max(0, p)) };
  });

  const totalSD = empView.reduce((s, e) => s + calcSaldoDevedor(e.valorContratado, e.taxa, e.parcelas, e.pagoEfetivo), 0);
  const totalPMT = empView.reduce((s, e) => s + calcPMT(e.valorContratado, e.taxa, e.parcelas), 0);

  function getSchedule(emp, pagoEf) {
    const rows = []; const i = emp.taxa / 100; const pmt2 = calcPMT(emp.valorContratado, emp.taxa, emp.parcelas);
    let saldo2 = emp.valorContratado;
    for (let k = 1; k <= emp.parcelas; k++) {
      const juros = i === 0 ? 0 : saldo2 * i;
      const amort = pmt2 - juros;
      saldo2 = Math.max(0, saldo2 - amort);
      rows.push({ k, pmt: pmt2, juros, amort, saldo: saldo2, pago: k <= pagoEf });
    }
    return rows;
  }

  return (
    <div>
      {emprestimos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[{ label: "Saldo Devedor Total", value: fmt(totalSD), color: C.rose, Icon: Scale }, { label: "Parcela Mensal Total", value: fmt(totalPMT), color: C.amber, Icon: TrendingDown }, { label: "Contratos ativos", value: emprestimos.length, color: C.cyan, Icon: ReceiptText }].map((c) => (
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

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <STitle>{editId ? "Editar empréstimo" : "Novo empréstimo"}</STitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Instituição Financeira" span={1}><Inp placeholder="Ex: Caixa, Nubank..." value={form.instituicao} onChange={f("instituicao")} /></Field>
            <Field label="Número do Contrato"><Inp placeholder="Opcional" value={form.contrato} onChange={f("contrato")} /></Field>
            <Field label="Valor Contratado (R$)"><Inp type="number" placeholder="0,00" value={form.valorContratado} onChange={f("valorContratado")} /></Field>
            <Field label="Taxa de Juros Mensal (%)"><Inp type="number" placeholder="Ex: 1.5" value={form.taxa} onChange={f("taxa")} /></Field>
            <Field label="Número de Parcelas"><Inp type="number" placeholder="Ex: 48" value={form.parcelas} onChange={f("parcelas")} /></Field>
            <Field label="Data de Contratação"><Inp type="date" value={form.dataContratacao} onChange={f("dataContratacao")} /></Field>
            <Field label="Data da 1ª Parcela"><Inp type="date" value={form.dataPrimeira} onChange={f("dataPrimeira")} /></Field>
            <Field label="Data de Quitação (auto)"><Inp type="date" value={form.dataQuitacao} onChange={f("dataQuitacao")} style={{ background: "var(--fill-2)" }} /></Field>
          </div>
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
              <STitle>Cálculo pela Tabela Price</STitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                {[{ label: "Valor da Parcela", value: fmt(pmt), color: C.indigo }, { label: "Total a Pagar", value: fmt(pmt * n), color: C.amber }, { label: "Juros Totais", value: fmt(pmt * n - pv), color: C.rose }, { label: "Saldo Devedor Atual", value: fmt(saldo), color: C.cyan }, { label: "Parcelas Restantes", value: restantes, color: C.subtle }, { label: "Parcelas Pagas", value: pago, color: C.emerald }].map((c) => (
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
        const pmt2 = calcPMT(emp.valorContratado, emp.taxa, emp.parcelas);
        const pagoEf = emp.pagoEfetivo;
        const sd = calcSaldoDevedor(emp.valorContratado, emp.taxa, emp.parcelas, pagoEf);
        const pct = emp.parcelas > 0 ? (pagoEf / emp.parcelas) * 100 : 0;
        const rest = Math.max(0, emp.parcelas - pagoEf);
        const isDetail = detail?.id === emp.id;
        const isAuto = emp.pagoAuto !== false && emp.dataPrimeira;
        return (
          <Card key={emp.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{emp.instituicao}</div>
                {emp.contrato && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Contrato: {emp.contrato}</div>}
                {emp.dataPrimeira && <div style={{ fontSize: 11, color: C.muted }}>1ª parcela: {new Date(emp.dataPrimeira + "T12:00:00").toLocaleDateString("pt-BR")}</div>}
                {emp.dataQuitacao && <div style={{ fontSize: 11, color: C.muted }}>Quitação: {new Date(emp.dataQuitacao + "T12:00:00").toLocaleDateString("pt-BR")}</div>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setDetail(isDetail ? null : emp)} style={{ padding: "4px 9px", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 7, color: C.cyan, fontSize: 10, cursor: "pointer" }}>{isDetail ? "Fechar" : "Tabela"}</button>
                <button aria-label="Editar" onClick={() => startEdit(emp)} style={{ padding: "6px 9px", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 7, color: C.indigo, cursor: "pointer", display: "inline-flex" }}><Pencil size={13} /></button>
                <button aria-label="Excluir" onClick={() => remove(emp.id)} style={{ padding: "6px 9px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, color: C.red, cursor: "pointer", display: "inline-flex" }}><Trash2 size={13} /></button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
              {[{ l: "Valor Contratado", v: fmt(emp.valorContratado), c: C.text }, { l: "Parcela (Price)", v: fmt(pmt2), c: C.indigo }, { l: "Saldo Devedor", v: fmt(sd), c: C.rose }, { l: "Taxa Mensal", v: `${emp.taxa}%`, c: C.amber }, { l: "Pagas / Total", v: `${pagoEf} / ${emp.parcelas}`, c: C.subtle }, { l: "Restantes", v: rest, c: rest === 0 ? C.emerald : C.cyan }].map((x) => (
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
                <STitle>Tabela Price completa</STitle>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                        {["Parc.", "Prestação", "Juros", "Amortização", "Saldo"].map((h) => <th key={h} style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700 }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {getSchedule(emp, pagoEf).map((row) => (
                        <tr key={row.k} style={{ background: row.pago ? "rgba(16,185,129,0.06)" : "transparent", borderBottom: `1px solid var(--fill-2)` }}>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: row.pago ? C.emerald : C.muted }}>{row.k}{row.pago && <Check size={11} style={{ marginLeft: 4, verticalAlign: "-1px" }} />}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: C.text }}>{fmt(row.pmt)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: C.rose }}>{fmt(row.juros)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: C.emerald }}>{fmt(row.amort)}</td>
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
