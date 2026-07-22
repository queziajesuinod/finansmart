// @ts-nocheck
import { useState, useRef } from "react";
import { C, MONTH_NAMES, fmt, tint } from "../../lib/constants";
import { calcPMT, calcSaldoDevedor } from "../../lib/finance";
import { LogoMark } from "../Logo.jsx";

export default function AssistenteTab({ chat, setChat, totalRenda, totalDespesas, saldoAtual, projecao, statusInfo, porCategoria, goals, emprestimos, parcelados, monthIdx, year }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput("");
    const newChat = [...chat, { role: "user", content: msg }];
    setChat(newChat); setLoading(true);
    try {
      const totalSD = emprestimos.reduce((s, e) => s + calcSaldoDevedor(e.valorContratado, e.taxa, e.parcelas, e.pago), 0);
      const totalPMT = emprestimos.reduce((s, e) => s + calcPMT(e.valorContratado, e.taxa, e.parcelas), 0);
      const context = `Você é FinançaBot, assistente financeiro pessoal. Responda em português, de forma direta e prática.
Dados de ${MONTH_NAMES[monthIdx]}/${year}:
- Renda: ${fmt(totalRenda)} | Gasto: ${fmt(totalDespesas)} | Saldo: ${fmt(saldoAtual)} | Projeção: ${fmt(projecao)} | Status: ${statusInfo?.label || "sem dados"}
- Categorias: ${porCategoria.map((c) => `${c.label}: ${fmt(c.total)}`).join(", ") || "nenhum"}
- Empréstimos: ${emprestimos.length} contrato(s) | Saldo devedor total: ${fmt(totalSD)} | Parcelas/mês: ${fmt(totalPMT)}
- Metas: ${goals.map((g) => `${g.nome}: ${fmt(g.atual)}/${fmt(g.alvo)}`).join(", ") || "nenhuma"}
- Parcelados ativos: ${parcelados.length}
Seja conciso (máx 4 parágrafos). Use emojis com moderação.`;
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: context + "\n\nPergunta: " + msg }] }) });
      const data = await r.json();
      const reply = data.content?.map((b) => b.text || "").join("") || "Não consegui responder.";
      setChat((p) => [...p, { role: "assistant", content: reply }]);
    } catch {
      setChat((p) => [...p, { role: "assistant", content: "Erro ao conectar. Tente novamente." }]);
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
