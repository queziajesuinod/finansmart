// @ts-nocheck
import { useState, useEffect } from "react";
import { C } from "../lib/constants";
import { Card, Label, Inp, Btn, STitle } from "./ui";
import { LogoTile } from "./Logo.jsx";
import InstallPWA from "./InstallPWA.jsx";
import { register, login, authConfig, googleLoginUrl, getPlans, loginWithPasskey, webauthnSupported, webauthnAutofillSupported, getHouseholdInvite, acceptHouseholdInvite } from "../lib/api";
import { maskCPF, maskPhone } from "../lib/masks";
import { fmt } from "../lib/constants";
import { Trash2, UserPlus, Users, Fingerprint } from "../lib/icons.jsx";

export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ nome: "", email: "", senha: "", cpf: "", telefone: "" });
  const [dependentes, setDependentes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [cadastroPublico, setCadastroPublico] = useState(true);
  const [passkeyOn, setPasskeyOn] = useState(false);
  const [invite, setInvite] = useState(null); // { token, preview } — fluxo de convite familiar

  useEffect(() => {
    authConfig().then((c) => { setGoogleEnabled(Boolean(c.googleEnabled)); setCadastroPublico(c.cadastroPublico !== false); if (c.cadastroPublico === false) setMode("login"); });
    getPlans().then((ps) => setPlans(ps || [])).catch(() => {});
    // Mostra erro se o callback do Google falhou.
    const p = new URLSearchParams(window.location.search);
    if (p.get("erro") === "google") setErr("Não foi possível entrar com o Google. Tente novamente.");

    // Convite de família (?convite=<token>): busca a prévia e abre o formulário de aceite.
    const conviteToken = p.get("convite");
    if (conviteToken) {
      getHouseholdInvite(conviteToken).then((prev) => setInvite({ token: conviteToken, preview: prev })).catch(() => setInvite({ token: conviteToken, preview: { valido: false } }));
    }

    // Passkeys: mostra o botão se o navegador suporta e liga a sugestão
    // (UI condicional) no campo de e-mail quando disponível.
    let cancelled = false;
    if (webauthnSupported()) {
      setPasskeyOn(true);
      webauthnAutofillSupported().then((ok) => {
        if (ok && !cancelled) {
          // Resolve quando o usuário escolhe uma passkey na sugestão do navegador.
          loginWithPasskey({ autofill: true }).then((data) => { if (!cancelled) onLogin(data); }).catch(() => { /* ignorado: cancelou/sem passkey */ });
        }
      });
    }
    return () => { cancelled = true; };
  }, []);

  const onField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // Plano representativo para o preview de preço (o mais completo cadastrado).
  const planoRef = plans.length ? plans.reduce((a, b) => (b.precoCentavos > a.precoCentavos ? b : a), plans[0]) : null;
  const nDeps = dependentes.filter((d) => d.nome.trim()).length;
  const precoPreview = planoRef ? (planoRef.precoCentavos + nDeps * (planoRef.precoDependenteCentavos || 0)) / 100 : null;

  const addDep = () => setDependentes((d) => [...d, { nome: "" }]);
  const updDep = (i, v) => setDependentes((d) => d.map((x, j) => (j === i ? { nome: v } : x)));
  const rmDep = (i) => setDependentes((d) => d.filter((_, j) => j !== i));

  async function handleSubmit() {
    setErr("");
    setLoading(true);
    const email = form.email.trim().toLowerCase();
    try {
      if (!email || !form.senha) throw new Error("Preencha e-mail e senha.");
      if (mode === "register") {
        if (!form.nome.trim()) throw new Error("Informe seu nome.");
        const deps = dependentes.map((d) => ({ nome: d.nome.trim() })).filter((d) => d.nome);
        const data = await register({ nome: form.nome.trim(), email, senha: form.senha, cpf: form.cpf.trim(), telefone: form.telefone.trim(), dependentes: deps });
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

  async function handleAccept() {
    setErr("");
    setLoading(true);
    try {
      if (!form.nome.trim()) throw new Error("Informe seu nome.");
      if (!form.email.trim() || !form.senha) throw new Error("Preencha e-mail e senha.");
      const data = await acceptHouseholdInvite(invite.token, { nome: form.nome.trim(), email: form.email.trim().toLowerCase(), senha: form.senha });
      window.history.replaceState({}, "", window.location.pathname); // limpa ?convite
      onLogin(data);
    } catch (e) {
      setErr(e.message || "Não foi possível aceitar o convite.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskey() {
    setErr("");
    try {
      const data = await loginWithPasskey();
      onLogin(data);
    } catch (e) {
      // Usuário cancelou o prompt de biometria — não é erro a exibir.
      if (e && (e.name === "NotAllowedError" || e.name === "AbortError")) return;
      setErr(e.message || "Não foi possível entrar com a passkey.");
    }
  }

  // ─── Fluxo de convite familiar ───────────────────────────────
  if (invite) {
    const ok = invite.preview && invite.preview.valido;
    return (
      <div style={{ minHeight: "100vh", background: `var(--bg)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',sans-serif", padding: 16 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><LogoTile size={60} /></div>
            <div style={{ fontFamily: "'Plus Jakarta Sans','Inter',sans-serif", fontSize: 24, fontWeight: 800, color: C.text }}>José <span style={{ color: C.accent }}>Planeja</span></div>
          </div>
          <Card style={{ padding: "28px 24px" }}>
            {!ok ? (
              <>
                <STitle>Convite inválido</STitle>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>Este convite não existe, já foi usado ou expirou. Peça um novo link para quem te convidou.</p>
                <Btn onClick={() => { setInvite(null); window.history.replaceState({}, "", window.location.pathname); }} style={{ width: "100%", marginTop: 16 }}>Ir para o login</Btn>
              </>
            ) : (
              <>
                <STitle>Entrar na família de {invite.preview.ownerNome || "seu familiar"}</STitle>
                <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>Você foi convidado{invite.preview.nome ? ` como ${invite.preview.nome}` : ""} para acompanhar as finanças da família. Crie seu acesso abaixo.</p>
                <form onSubmit={(e) => { e.preventDefault(); handleAccept(); }}>
                  <div style={{ marginBottom: 14 }}><Label>Seu nome</Label><Inp name="name" autoComplete="name" placeholder="Seu nome" value={form.nome} onChange={onField("nome")} /></div>
                  <div style={{ marginBottom: 14 }}><Label>E-mail</Label><Inp type="email" name="email" autoComplete="username" placeholder="seu@email.com" value={form.email} onChange={onField("email")} /></div>
                  <div style={{ marginBottom: 20 }}><Label>Senha</Label><Inp type="password" name="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={form.senha} onChange={onField("senha")} /></div>
                  {err && <div style={{ fontSize: 12, color: C.red, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>{err}</div>}
                  <Btn type="submit" disabled={loading} style={{ width: "100%" }}>{loading ? "Aguarde..." : "Entrar na família"}</Btn>
                </form>
              </>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: `var(--bg)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',sans-serif", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><LogoTile size={60} /></div>
          <div style={{ fontFamily: "'Plus Jakarta Sans','Inter',sans-serif", fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.6px" }}>José <span style={{ color: C.accent }}>Planeja</span></div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Controle & organização financeira</div>
        </div>

        <Card style={{ padding: "28px 24px" }}>
          <STitle>{mode === "login" ? "Entrar na sua conta" : "Criar nova conta"}</STitle>

          {googleEnabled && (
            <>
              <button onClick={() => { window.location.href = googleLoginUrl; }} style={{ width: "100%", padding: "11px 18px", borderRadius: "var(--r-sm)", cursor: "pointer", fontSize: 13, fontWeight: 700, background: "#fff", color: "#1f2937", border: "1px solid #dadce0", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ fontWeight: 900, color: "#4285F4" }}>G</span> Entrar com Google
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 11, color: C.muted }}>ou</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
            </>
          )}

          {passkeyOn && mode === "login" && (
            <>
              <button type="button" onClick={handlePasskey} style={{ width: "100%", padding: "11px 18px", borderRadius: "var(--r-sm)", cursor: "pointer", fontSize: 13, fontWeight: 700, background: "var(--fill-2)", color: C.text, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Fingerprint size={16} /> Entrar com Face ID / digital
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 11, color: C.muted }}>ou com e-mail</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
            </>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {mode === "register" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <Label>Nome completo</Label>
                <Inp name="name" autoComplete="name" placeholder="Seu nome" value={form.nome} onChange={onField("nome")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <Label>CPF (cobrança)</Label>
                  <Inp placeholder="000.000.000-00" inputMode="numeric" value={form.cpf} onChange={(e) => setForm((p) => ({ ...p, cpf: maskCPF(e.target.value) }))} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Inp name="tel" autoComplete="tel" placeholder="(00) 00000-0000" inputMode="tel" value={form.telefone} onChange={(e) => setForm((p) => ({ ...p, telefone: maskPhone(e.target.value) }))} />
                </div>
              </div>

              {/* Familiares / dependentes (opcional) */}
              <div style={{ marginBottom: 14, background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                <Label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><Users size={13} /> Familiares (opcional)</Label>
                {dependentes.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <Inp placeholder={`Nome do dependente ${i + 1}`} value={d.nome} onChange={(e) => updDep(i, e.target.value)} style={{ flex: 1 }} />
                    <button className="mini-act" aria-label="Remover" onClick={() => rmDep(i)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: C.red, cursor: "pointer" }}><Trash2 size={14} /></button>
                  </div>
                ))}
                <button onClick={addDep} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: `1px dashed ${C.border}`, color: C.accent, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}><UserPlus size={14} /> Adicionar familiar</button>
                {planoRef && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>
                    Plano {planoRef.nome}: {fmt(planoRef.precoCentavos / 100)}/mês{planoRef.precoDependenteCentavos ? ` + ${fmt(planoRef.precoDependenteCentavos / 100)} por dependente` : ""}.
                    {nDeps > 0 && <span style={{ color: C.accent, fontWeight: 700 }}> Estimado: {fmt(precoPreview)}/mês</span>}
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{ marginBottom: 14 }}>
            <Label>E-mail</Label>
            <Inp type="email" name="email" autoComplete="username webauthn" placeholder="seu@email.com" value={form.email} onChange={onField("email")} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <Label>Senha</Label>
            <Inp type="password" name="password" autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder="••••••••" value={form.senha} onChange={onField("senha")} />
          </div>

          {err && <div style={{ fontSize: 12, color: C.red, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>{err}</div>}

          <Btn type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </Btn>
          </form>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.muted }}>
            {cadastroPublico ? (
              <>
                {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
                <span onClick={() => { setMode((m) => (m === "login" ? "register" : "login")); setErr(""); }} style={{ color: C.indigo, cursor: "pointer", fontWeight: 700 }}>
                  {mode === "login" ? "Cadastre-se" : "Entrar"}
                </span>
              </>
            ) : "Novos cadastros estão fechados no momento (acesso por convite)."}
          </div>
        </Card>

        <InstallPWA />
      </div>
    </div>
  );
}
