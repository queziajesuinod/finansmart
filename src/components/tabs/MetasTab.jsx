// @ts-nocheck
import { useState } from "react";
import { C, today, fmt, fmtPct, genId } from "../../lib/constants";
import { Card, Field, Inp, Btn, Badge, Bar, Empty, STitle, IcoTxt, MoneyInput } from "../ui";
import { X, Trophy, Plus, PartyPopper } from "../../lib/icons.jsx";

export default function MetasTab({ goals, setGoals }) {
  const [form, setForm] = useState({ nome: "", alvo: "", atual: "", prazo: "" });
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  function add() {
    const a = parseFloat(form.alvo) || 0;
    if (!form.nome || !a) return;
    setGoals([...goals, { ...form, alvo: a, atual: parseFloat(form.atual) || 0, id: genId() }]);
    setForm({ nome: "", alvo: "", atual: "", prazo: "" });
  }
  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <STitle><IcoTxt Icon={Trophy}>Nova meta</IcoTxt></STitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Nome" span={2}><Inp placeholder="Ex: Reserva de emergência, Viagem..." value={form.nome} onChange={f("nome")} /></Field>
          <Field label="Valor alvo (R$)"><MoneyInput placeholder="0,00" value={form.alvo} onChange={f("alvo")} /></Field>
          <Field label="Já guardado (R$)"><MoneyInput placeholder="0,00" value={form.atual} onChange={f("atual")} /></Field>
          <Field label="Prazo" span={2}><Inp type="date" value={form.prazo} onChange={f("prazo")} /></Field>
        </div>
        <Btn onClick={add} style={{ width: "100%", marginTop: 12 }}><IcoTxt Icon={Plus}>Adicionar meta</IcoTxt></Btn>
      </Card>
      {goals.length === 0 ? <Empty icon="" title="Nenhuma meta" sub="Defina objetivos para acompanhar seu progresso!" /> : goals.map((g) => {
        const pct = g.alvo > 0 ? (g.atual / g.alvo) * 100 : 0;
        const resto = Math.max(0, g.alvo - g.atual);
        const dias = g.prazo ? Math.max(0, Math.round((new Date(g.prazo + "T12:00:00") - today) / 86400000)) : null;
        const meses = dias !== null ? dias / 30 : null;
        const mens = meses > 0 ? resto / meses : resto;
        const cor = pct >= 100 ? C.emerald : pct > 50 ? C.indigo : C.amber;
        return (
          <Card key={g.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{g.nome}</div>
                {g.prazo && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Prazo: {new Date(g.prazo + "T12:00:00").toLocaleDateString("pt-BR")}{dias !== null ? ` (${dias} dias)` : ""}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Badge label={pct >= 100 ? "Concluída" : fmtPct(pct)} color={cor} />
                <button aria-label="Excluir meta" onClick={() => setGoals(goals.filter((x) => x.id !== g.id))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "inline-flex" }}><X size={15} /></button>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 7 }}>
              <span>Guardado: <strong style={{ color: C.text }}>{fmt(g.atual)}</strong></span>
              <span>Meta: <strong style={{ color: C.text }}>{fmt(g.alvo)}</strong></span>
            </div>
            <Bar pct={pct} color={cor} h={8} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
              <div style={{ fontSize: 12, color: C.muted }}>{pct < 100 ? <>Faltam <strong style={{ color: C.text }}>{fmt(resto)}</strong>{meses > 0 ? <> · <strong style={{ color: cor }}>{fmt(mens)}/mês</strong></> : ""}</> : <strong style={{ color: C.emerald, display: "inline-flex", alignItems: "center", gap: 5 }}><PartyPopper size={13} /> Alcançada!</strong>}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: C.muted }}>Atualizar:</span>
                <MoneyInput value={g.atual} onChange={(e) => setGoals(goals.map((x) => (x.id === g.id ? { ...x, atual: parseFloat(e.target.value) || 0 } : x)))} style={{ width: 85, padding: "5px 8px", borderRadius: 7, fontSize: 12 }} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
