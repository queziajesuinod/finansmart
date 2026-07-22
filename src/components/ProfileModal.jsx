// @ts-nocheck
import { useState } from "react";
import { C } from "../lib/constants";
import { Card, Label, Field, Inp, Btn, Divider, STitle, IcoTxt } from "./ui";
import { X, Save, KeyRound, CircleUser } from "../lib/icons.jsx";
import { maskCPF, maskPhone } from "../lib/masks";
import { updateProfile, changePassword } from "../lib/api";

export default function ProfileModal({ user, onClose, onUpdated }) {
  const [form, setForm] = useState({ nome: user.nome || "", cpf: user.cpf || "", telefone: user.telefone || "" });
  const [pwd, setPwd] = useState({ senhaAtual: "", novaSenha: "", confirmar: "" });
  const [pMsg, setPMsg] = useState(""); const [pErr, setPErr] = useState("");
  const [sMsg, setSMsg] = useState(""); const [sErr, setSErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function salvarPerfil() {
    setPMsg(""); setPErr(""); setBusy(true);
    try {
      const data = await updateProfile({ nome: form.nome, cpf: form.cpf, telefone: form.telefone });
      if (onUpdated && data.user) onUpdated(data.user);
      setPMsg("Perfil atualizado.");
    } catch (e) { setPErr(e.message || "Erro ao salvar."); } finally { setBusy(false); }
  }

  async function salvarSenha() {
    setSMsg(""); setSErr(""); setBusy(true);
    try {
      if (pwd.novaSenha.length < 6) throw new Error("A nova senha deve ter ao menos 6 caracteres.");
      if (pwd.novaSenha !== pwd.confirmar) throw new Error("A confirmação não confere.");
      await changePassword({ senhaAtual: pwd.senhaAtual, novaSenha: pwd.novaSenha });
      setPwd({ senhaAtual: "", novaSenha: "", confirmar: "" });
      setSMsg("Senha alterada com sucesso.");
    } catch (e) { setSErr(e.message || "Erro ao trocar a senha."); } finally { setBusy(false); }
  }

  const Msg = ({ ok, err }) => {
    if (ok) return <div style={{ fontSize: 12, color: C.emerald, background: "color-mix(in srgb, var(--success) 10%, transparent)", border: `1px solid color-mix(in srgb, var(--success) 25%, transparent)`, borderRadius: 8, padding: "8px 12px", marginTop: 10 }}>{ok}</div>;
    if (err) return <div style={{ fontSize: 12, color: C.red, background: "color-mix(in srgb, var(--danger) 10%, transparent)", border: `1px solid color-mix(in srgb, var(--danger) 25%, transparent)`, borderRadius: 8, padding: "8px 12px", marginTop: 10 }}>{err}</div>;
    return null;
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--scrim)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto", backdropFilter: "blur(4px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440 }}>
        <Card style={{ padding: "22px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><CircleUser size={22} /></div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{user.nome}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{user.email}</div>
              </div>
            </div>
            <button aria-label="Fechar" onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, width: 30, height: 30, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
          </div>

          {/* Dados do perfil */}
          <STitle><IcoTxt Icon={CircleUser}>Meus dados</IcoTxt></STitle>
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Nome completo"><Inp value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="CPF"><Inp placeholder="000.000.000-00" inputMode="numeric" value={form.cpf} onChange={(e) => setForm((p) => ({ ...p, cpf: maskCPF(e.target.value) }))} /></Field>
              <Field label="Telefone"><Inp placeholder="(00) 00000-0000" inputMode="tel" value={form.telefone} onChange={(e) => setForm((p) => ({ ...p, telefone: maskPhone(e.target.value) }))} /></Field>
            </div>
          </div>
          <Msg ok={pMsg} err={pErr} />
          <Btn onClick={salvarPerfil} disabled={busy} style={{ marginTop: 12 }}><IcoTxt Icon={Save}>Salvar dados</IcoTxt></Btn>

          <Divider />

          {/* Alterar senha */}
          <STitle><IcoTxt Icon={KeyRound}>Alterar senha</IcoTxt></STitle>
          <div style={{ display: "grid", gap: 12 }}>
            {user.temGoogle && !user.temSenha ? null : (
              <Field label="Senha atual"><Inp type="password" placeholder="••••••••" value={pwd.senhaAtual} onChange={(e) => setPwd((p) => ({ ...p, senhaAtual: e.target.value }))} /></Field>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Nova senha"><Inp type="password" placeholder="••••••••" value={pwd.novaSenha} onChange={(e) => setPwd((p) => ({ ...p, novaSenha: e.target.value }))} /></Field>
              <Field label="Confirmar"><Inp type="password" placeholder="••••••••" value={pwd.confirmar} onChange={(e) => setPwd((p) => ({ ...p, confirmar: e.target.value }))} /></Field>
            </div>
          </div>
          <Msg ok={sMsg} err={sErr} />
          <Btn onClick={salvarSenha} disabled={busy} style={{ marginTop: 12 }}><IcoTxt Icon={KeyRound}>Alterar senha</IcoTxt></Btn>
        </Card>
      </div>
    </div>
  );
}
