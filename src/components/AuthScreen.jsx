// @ts-nocheck
import { useState, useEffect } from "react";
import { C } from "../lib/constants";
import { Card, Label, Inp, Btn, STitle } from "./ui";
import { LogoTile } from "./Logo.jsx";
import { register, login, authConfig, googleLoginUrl } from "../lib/api";
import { maskCPF, maskPhone } from "../lib/masks";

export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ nome: "", email: "", senha: "", cpf: "", telefone: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    authConfig().then((c) => setGoogleEnabled(Boolean(c.googleEnabled)));
    // Mostra erro se o callback do Google falhou.
    const p = new URLSearchParams(window.location.search);
    if (p.get("erro") === "google") setErr("Não foi possível entrar com o Google. Tente novamente.");
  }, []);

  const onField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit() {
    setErr("");
    setLoading(true);
    const email = form.email.trim().toLowerCase();
    try {
      if (!email || !form.senha) throw new Error("Preencha e-mail e senha.");
      if (mode === "register") {
        if (!form.nome.trim()) throw new Error("Informe seu nome.");
        const data = await register({ nome: form.nome.trim(), email, senha: form.senha, cpf: form.cpf.trim(), telefone: form.telefone.trim() });
        onLogin(data);
      } else {
        const data = await login({ email, senha: form.senha });
        onLogin(data);
      }
    } catch (e) {
      setErr(e.message || "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: `var(--bg)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',sans-serif", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><LogoTile size={56} radius={16} /></div>
          <div style={{ fontFamily: "'Plus Jakarta Sans','Inter',sans-serif", fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.6px" }}>José <span style={{ color: C.accent }}>Planeja</span></div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Controle & organização financeira</div>
        </div>

        <Card style={{ padding: "28px 24px" }}>
          <STitle>{mode === "login" ? "Entrar na sua conta" : "Criar nova conta"}</STitle>

          {googleEnabled && (
            <>
              <button onClick={() => { window.location.href = googleLoginUrl; }} style={{ width: "100%", padding: "11px 18px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, background: "#fff", color: "#1f2937", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ fontWeight: 900, color: "#4285F4" }}>G</span> Entrar com Google
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 11, color: C.muted }}>ou</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
            </>
          )}

          {mode === "register" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <Label>Nome completo</Label>
                <Inp placeholder="Seu nome" value={form.nome} onChange={onField("nome")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <Label>CPF (cobrança)</Label>
                  <Inp placeholder="000.000.000-00" inputMode="numeric" value={form.cpf} onChange={(e) => setForm((p) => ({ ...p, cpf: maskCPF(e.target.value) }))} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Inp placeholder="(00) 00000-0000" inputMode="tel" value={form.telefone} onChange={(e) => setForm((p) => ({ ...p, telefone: maskPhone(e.target.value) }))} />
                </div>
              </div>
            </>
          )}

          <div style={{ marginBottom: 14 }}>
            <Label>E-mail</Label>
            <Inp type="email" placeholder="seu@email.com" value={form.email} onChange={onField("email")} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <Label>Senha</Label>
            <Inp type="password" placeholder="••••••••" value={form.senha} onChange={onField("senha")} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </div>

          {err && <div style={{ fontSize: 12, color: C.red, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>{err}</div>}

          <Btn onClick={handleSubmit} disabled={loading} style={{ width: "100%" }}>
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </Btn>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.muted }}>
            {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
            <span onClick={() => { setMode((m) => (m === "login" ? "register" : "login")); setErr(""); }} style={{ color: C.indigo, cursor: "pointer", fontWeight: 700 }}>
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
