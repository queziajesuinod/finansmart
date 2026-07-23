// @ts-nocheck
import { useState, useRef } from "react";
import { C, MONTH_NAMES, fmt, tint } from "../../lib/constants";
import { calcPMT, calcSaldoDevedor } from "../../lib/finance";
import { askAssistant } from "../../lib/api";
import { LogoMark } from "../Logo.jsx";

export default function AssistenteTab({ chat, setChat, totalRenda, totalDespesas, saldoAtual, projecao, statusInfo, porCategoria, goals, emprestimos, parcelados, monthIdx, year }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  // Monta o resumo financeiro do mês para a IA (ela responde só com base nisso).
  function montarContexto() {
    const totalSD = emprestimos.reduce((s, e) => s + calcSaldoDevedor(e.valorContratado, e.taxa, e.parcelas, e.pago), 0);
    const totalPMT = emprestimos.reduce((s, e) => s + calcPMT(e.valorContratado, e.taxa, e.parcelas), 0);
    return [
      `Mês de referência: ${MONTH_NAMES[monthIdx]}/${year}`,
      `Renda total: ${fmt(totalRenda)}`,
      `Gasto total: ${fmt(totalDespesas)}`,
      `Saldo atual: ${fmt(saldoAtual)}`,
      `Projeção de saldo no fim do mês: ${fmt(projecao)}`,
      `Situação: ${statusInfo?.label || "sem dados"}`,
      `Gastos por categoria: ${porCategoria.map((c) => `${c.label} ${fmt(c.total)}`).join(", ") || "nenhum"}`,
      `Empréstimos: ${emprestimos.length} contrato(s), saldo devedor ${fmt(totalSD)}, parcelas ${fmt(totalPMT)}/mês`,
      `Metas: ${goals.map((g) => `${g.nome} ${fmt(g.atual)}/${fmt(g.alvo)}`).join(", ") || "nenhuma"}`,
      `Compras parceladas ativas: ${parcelados.length}`,
    ].join("\n");
  }

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput("");
    setChat((p) => [...p, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const r = await askAssistant({ pergunta: msg, contexto: montarContexto(), historico: chat });
      setChat((p) => [...p, { role: "assistant", content: r.resposta || "Não consegui responder." }]);
    } catch (e) {
      const txt = e.code === "ai_disabled"
        ? "O assistente com IA ainda não está configurado no servidor (falta a chave da Groq)."
        : e.status === 429
        ? "O serviço de IA está no limite de uso agora. Tente de novo em um minuto."
        : "Não consegui conectar ao assistente agora. Tente novamente.";
      setChat((p) => [...p, { role: "assistant", content: txt }]);
    }
    setLoading(false);
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  return (
    <div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, minHeight: 320, maxHeight: 420, overflowY: "auto", marginBottom: 12 }}>
        {chat.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "assistant" ? "flex-start" : "flex-end", marginBottom: 10 }}>
            {m.role === "assistant" && <div style={{ width: 26, height: 26, borderRadius: 7, background: `var(--accent)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 7, flexShrink: 0, marginTop: 2 }}><LogoMark size={15} /></div>}
            <div style={{ maxWidth: "80%", padding: "9px 13px", borderRadius: m.role === "assistant" ? "4px 12px 12px 12px" : "12px 4px 12px 12px", background: m.role === "assistant" ? tint(C.accent, 10) : "var(--fill)", border: `1px solid ${m.role === "assistant" ? tint(C.accent, 20) : C.border}`, fontSize: 13, lineHeight: 1.65, color: C.text, whiteSpace: "pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ display: "flex", gap: 7, padding: "9px 13px", background: "rgba(99,102,241,0.08)", borderRadius: "4px 12px 12px 12px", width: "fit-content" }}>{[0, 1, 2].map((i) => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.indigo, animation: `pulse ${0.6 + i * 0.2}s infinite` }} />)}</div>}
        <div ref={ref} />
      </div>
      <div style={{ display: "flex", gap: 9 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Pergunte sobre suas finanças..." disabled={loading} style={{ flex: 1, padding: "11px 15px", background: "var(--fill)", border: `1px solid ${C.border}`, borderRadius: 11, color: C.text, fontSize: 13, outline: "none" }} />
        <button onClick={send} disabled={loading} style={{ padding: "11px 18px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, background: `var(--accent)`, color: "#fff", border: "none" }}>Enviar</button>
      </div>
      <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
        {["Como estão meus gastos?", "Analise minhas dívidas", "Onde economizar?", "Estou no caminho certo?", "Quanto guardar por mês?"].map((s) => (
          <button key={s} onClick={() => setInput(s)} style={{ padding: "5px 11px", background: "rgba(99,102,241,0.08)", border: `1px solid rgba(99,102,241,0.18)`, borderRadius: 20, color: "var(--accent)", fontSize: 11, cursor: "pointer" }}>{s}</button>
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>
  );
}
