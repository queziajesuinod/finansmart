// @ts-nocheck
// Tela exibida quando o usuário está autenticado mas SEM assinatura ativa.
// No modo teste (BILLING_ENABLED=false) o backend libera todos, então esta
// tela não aparece — ela existe para quando a cobrança for ligada (Fase 2).
import { useEffect, useState } from "react";
import { C, fmt } from "../lib/constants";
import { Lightbulb, Lock } from "../lib/icons.jsx";
import { Card, Btn, STitle, Badge } from "./ui";
import { getPlans } from "../lib/api";

export default function LockedScreen({ user, onLogout }) {
  const [plans, setPlans] = useState([]);

  useEffect(() => { getPlans().then(setPlans).catch(() => setPlans([])); }, []);

  return (
    <div style={{ minHeight: "100vh", background: `var(--bg)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',sans-serif", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ marginBottom: 12, color: C.accent, display: "flex", justifyContent: "center" }}><Lock size={40} strokeWidth={1.6} /></div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>Assinatura inativa</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Olá, {user?.nome?.split(" ")[0]}. Ative um plano para acessar o sistema.</div>
        </div>

        <Card style={{ marginBottom: 14 }}>
          <STitle>Planos disponíveis</STitle>
          {plans.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>Nenhum plano cadastrado.</div>}
          {plans.map((p) => (
            <div key={p.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{p.nome}</span>
                <Badge label={`${fmt(p.precoCentavos / 100)}/${p.intervalo === "month" ? "mês" : "ano"}`} color={C.indigo} />
              </div>
              <div style={{ fontSize: 12, color: C.subtle, marginBottom: 8 }}>{p.descricao}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{(p.modulos || []).map((m) => m.nome).join(" · ")}</div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
            <Lightbulb size={13} style={{ verticalAlign: "-2px" }} /> O pagamento online (Stripe) entra na próxima fase. Em ambiente de testes, um admin pode liberar seu acesso com <code>npm run grant</code>.
          </div>
        </Card>

        <Btn variant="ghost" onClick={onLogout} style={{ width: "100%" }}>Sair</Btn>
      </div>
    </div>
  );
}
