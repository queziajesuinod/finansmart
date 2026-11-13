// @ts-nocheck
import { useState, useEffect } from "react";
import { C, fmt } from "../lib/constants";
import { Card, Label, Field, Inp, Btn, Divider, STitle, IcoTxt, Badge } from "./ui";
import { X, Save, KeyRound, CircleUser, Users, WalletCards, Fingerprint, Trash2, Plus, Smartphone, LogOut, Bell } from "../lib/icons.jsx";
import { maskCPF, maskPhone } from "../lib/masks";
import { updateProfile, changePassword, getPlans, listPasskeys, registerPasskey, deletePasskey, webauthnSupported, listSessions, revokeSession, householdMembers, createHouseholdInvite, revokeHouseholdInvite, setMemberRole, removeMember } from "../lib/api";
import { pushSupported, pushStatus, enablePush, disablePush } from "../lib/push";

const ROLE_LABEL = { owner: "Titular", admin: "Admin", member: "Membro", viewer: "Visualizador" };

// userAgent → nome amigável do aparelho ("iPhone · Safari").
function nomeDispositivo(ua) {
  if (!ua) return "Dispositivo desconhecido";
  const s = ua.toLowerCase();
  const os = s.includes("iphone") ? "iPhone" : s.includes("ipad") ? "iPad" : s.includes("android") ? "Android"
    : s.includes("windows") ? "Windows" : (s.includes("mac os") || s.includes("macintosh")) ? "Mac" : s.includes("linux") ? "Linux" : "";
  const nav = s.includes("edg/") ? "Edge" : (s.includes("chrome/") && !s.includes("edg/")) ? "Chrome"
    : s.includes("firefox/") ? "Firefox" : (s.includes("safari/") && !s.includes("chrome/")) ? "Safari" : "";
  return [os, nav].filter(Boolean).join(" · ") || "Navegador";
}
function haQuanto(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  const dias = Math.floor(diff / 86400);
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}
import { MembrosManager } from "./Membros.jsx";

export default function ProfileModal({ user, onClose, onUpdated, membros = [], onSaveMembros, access = null }) {
  const [form, setForm] = useState({ nome: user.nome || "", cpf: user.cpf || "", telefone: user.telefone || "" });
  const [pwd, setPwd] = useState({ senhaAtual: "", novaSenha: "", confirmar: "" });
  const [pMsg, setPMsg] = useState(""); const [pErr, setPErr] = useState("");
  const [sMsg, setSMsg] = useState(""); const [sErr, setSErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Passkeys (Face ID / digital).
  const pkSupported = webauthnSupported();
  const [passkeys, setPasskeys] = useState([]);
  const [pkBusy, setPkBusy] = useState(false);
  const [pkErr, setPkErr] = useState("");
  useEffect(() => { if (pkSupported) listPasskeys().then((r) => setPasskeys(r.passkeys || [])).catch(() => {}); }, [pkSupported]);

  async function addPasskey() {
    setPkErr(""); setPkBusy(true);
    try {
      const r = await registerPasskey();
      setPasskeys(r.passkeys || []);
    } catch (e) {
      if (!(e && (e.name === "NotAllowedError" || e.name === "AbortError"))) setPkErr(e.message || "Não foi possível adicionar a passkey.");
    } finally { setPkBusy(false); }
  }
  async function removePasskey(id) {
    setPkErr(""); setPkBusy(true);
    try { await deletePasskey(id); setPasskeys((ps) => ps.filter((p) => p.id !== id)); }
    catch (e) { setPkErr(e.message || "Não foi possível remover."); }
    finally { setPkBusy(false); }
  }

  // Dispositivos / sessões ativas.
  const [sessions, setSessions] = useState([]);
  const [sessBusy, setSessBusy] = useState(false);
  const [sessErr, setSessErr] = useState("");
  useEffect(() => { listSessions().then((r) => setSessions(r.sessions || [])).catch(() => {}); }, []);
  async function desconectar(id) {
    setSessErr(""); setSessBusy(true);
    try { await revokeSession(id); setSessions((ss) => ss.filter((s) => s.id !== id)); }
    catch (e) { setSessErr(e.message || "Não foi possível desconectar."); }
    finally { setSessBusy(false); }
  }

  // Família (logins / papéis).
  const [fam, setFam] = useState({ members: [], invites: [], canManage: false, ownerNome: "" });
  const [famErr, setFamErr] = useState("");
  const [famBusy, setFamBusy] = useState(false);
  const [novoConvite, setNovoConvite] = useState({ nome: "", role: "member" });
  const [linkConvite, setLinkConvite] = useState("");
  const recarregarFam = () => householdMembers().then(setFam).catch(() => {});
  useEffect(() => { recarregarFam(); }, []);
  async function gerarConvite() {
    setFamErr(""); setFamBusy(true); setLinkConvite("");
    try {
      const r = await createHouseholdInvite({ nome: novoConvite.nome.trim(), role: novoConvite.role });
      setLinkConvite(r.url);
      setNovoConvite({ nome: "", role: "member" });
      recarregarFam();
    } catch (e) { setFamErr(e.message || "Não foi possível gerar o convite."); }
    finally { setFamBusy(false); }
  }
  async function trocarPapel(id, role) {
    setFamErr("");
    try { await setMemberRole(id, role); recarregarFam(); }
    catch (e) { setFamErr(e.message || "Não foi possível alterar o papel."); }
  }
  async function removerMembro(id) {
    setFamErr(""); setFamBusy(true);
    try { await removeMember(id); recarregarFam(); }
    catch (e) { setFamErr(e.message || "Não foi possível remover."); }
    finally { setFamBusy(false); }
  }
  async function revogarConvite(id) {
    try { await revokeHouseholdInvite(id); recarregarFam(); } catch { /* ignore */ }
  }

  // Notificações push.
  const [push, setPush] = useState("off");
  const [pushErr, setPushErr] = useState("");
  useEffect(() => { if (pushSupported()) pushStatus().then(setPush).catch(() => {}); else setPush("unsupported"); }, []);
  async function togglePush() {
    setPushErr("");
    const antes = push; setPush("busy");
    try {
      if (antes === "on") { await disablePush(); setPush("off"); }
      else { await enablePush(); setPush("on"); }
    } catch (e) { setPushErr(e.message || "Não foi possível alterar as notificações."); setPush(antes); }
  }

  // Plano atual + valor pago (base + dependentes × valor por dependente).
  const [plans, setPlans] = useState([]);
  useEffect(() => { getPlans().then((ps) => setPlans(ps || [])).catch(() => {}); }, []);
  const planoAtual = (plans.find((p) => p.slug === (access && access.plano && access.plano.slug))) || null;
  const nDeps = (membros || []).filter((m) => m.tipo === "dependente" && m.ativo !== false).length;
  const baseCent = planoAtual ? planoAtual.precoCentavos || 0 : 0;
  const perDepCent = planoAtual ? planoAtual.precoDependenteCentavos || 0 : 0;
  const totalMes = (baseCent + nDeps * perDepCent) / 100;
  const subStatus = access && access.subscription ? access.subscription.status : null;

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
      if (pwd.novaSenha.length < 8) throw new Error("A nova senha deve ter ao menos 8 caracteres.");
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
    <div className="scrim-fade" onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--scrim)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto", backdropFilter: "blur(4px)" }}>
      <div className="pop-in" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440 }}>
        <Card style={{ padding: "22px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: "var(--r-md)", background: "linear-gradient(150deg, var(--accent-soft), var(--primary-strong))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-primary), inset 0 1px 0 rgba(255,255,255,.3)" }}><CircleUser size={22} /></div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{user.nome}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{user.email}</div>
              </div>
            </div>
            <button aria-label="Fechar" onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, width: 30, height: 30, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
          </div>

          {/* Plano atual */}
          <STitle><IcoTxt Icon={WalletCards}>Seu plano</IcoTxt></STitle>
          <div style={{ background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>{planoAtual ? planoAtual.nome : (access && access.plano ? access.plano.nome : "Sem plano ativo")}</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: C.accent }}>{planoAtual ? `${fmt(totalMes)}/mês` : "—"}</span>
            </div>
            {planoAtual && (
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Base do plano</span><span>{fmt(baseCent / 100)}/mês</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{nDeps} dependente{nDeps !== 1 ? "s" : ""}{perDepCent > 0 ? ` × ${fmt(perDepCent / 100)}` : ""}</span>
                  <span>{fmt((nDeps * perDepCent) / 100)}/mês</span>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
              {subStatus && <Badge label={subStatus === "active" ? "Assinatura ativa" : subStatus} color={subStatus === "active" ? C.emerald : C.amber} />}
              {access && access.admin && <Badge label="Admin" color={C.violet} />}
              {access && access.billingEnabled === false && <span style={{ fontSize: 10, color: C.muted }}>cobrança em modo de testes</span>}
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: C.muted, margin: "8px 2px 0", lineHeight: 1.5 }}>O valor acumula {perDepCent > 0 ? `${fmt(perDepCent / 100)} por dependente vinculado.` : "conforme os dependentes vinculados."} Gerencie os familiares mais abaixo.</div>

          <Divider />

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

          {pkSupported && (
            <>
              <Divider />
              <STitle><IcoTxt Icon={Fingerprint}>Chaves de acesso (passkeys)</IcoTxt></STitle>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>Entre com Face ID ou digital, sem senha. A chave fica guardada no seu aparelho — pode adicionar uma por dispositivo.</p>
              {passkeys.length > 0 && (
                <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                  {passkeys.map((p) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                      <Fingerprint size={16} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{p.nome}</div>
                        <div style={{ fontSize: 10.5, color: C.muted }}>
                          {p.backedUp ? "Sincronizada" : "Só neste aparelho"}
                          {p.lastUsedAt ? ` · usada em ${new Date(p.lastUsedAt).toLocaleDateString("pt-BR")}` : ` · criada em ${new Date(p.createdAt).toLocaleDateString("pt-BR")}`}
                        </div>
                      </div>
                      <button className="mini-act" aria-label="Remover passkey" disabled={pkBusy} onClick={() => removePasskey(p.id)} style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", border: `1px solid color-mix(in srgb, var(--danger) 22%, transparent)`, borderRadius: 8, color: C.red, cursor: "pointer" }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              {pkErr && <Msg err={pkErr} />}
              <Btn variant="ghost" onClick={addPasskey} disabled={pkBusy} style={{ marginTop: 4 }}><IcoTxt Icon={Plus}>Adicionar Face ID / digital</IcoTxt></Btn>
            </>
          )}

          {/* Notificações push */}
          <Divider />
          <STitle><IcoTxt Icon={Bell}>Notificações no celular</IcoTxt></STitle>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Avisos de fatura e salário</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                {push === "unsupported" ? "Este navegador não suporta notificações."
                  : push === "denied" ? "Permissão bloqueada — libere nas configurações do navegador."
                  : push === "unavailable" ? "Disponível no app publicado (instale/abra o PWA)."
                  : "Receba um aviso quando a fatura estiver perto de vencer ou o salário cair."}
              </div>
            </div>
            {(push === "on" || push === "off" || push === "busy") && (
              <Btn variant={push === "on" ? "ghost" : "primary"} onClick={togglePush} disabled={push === "busy"} style={{ flex: "0 0 auto", padding: "9px 14px" }}>
                {push === "busy" ? "..." : push === "on" ? "Desativar" : "Ativar"}
              </Btn>
            )}
          </div>
          {pushErr && <Msg err={pushErr} />}

          {/* Dispositivos / sessões ativas */}
          <Divider />
          <STitle><IcoTxt Icon={Smartphone}>Dispositivos conectados</IcoTxt></STitle>
          <p style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>Aparelhos com a sua conta conectada. Se não reconhecer algum, desconecte — ele precisará entrar de novo.</p>
          <div style={{ display: "grid", gap: 8 }}>
            {sessions.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>Nenhuma sessão ativa encontrada.</div>}
            {sessions.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                <Smartphone size={16} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    {nomeDispositivo(s.userAgent)}
                    {s.atual && <Badge label="Este aparelho" color={C.emerald} />}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.muted }}>{s.ip ? `${s.ip} · ` : ""}ativo {haQuanto(s.lastSeen)}</div>
                </div>
                {s.atual
                  ? <span style={{ fontSize: 10.5, color: C.muted }}>atual</span>
                  : <button className="mini-act" aria-label="Desconectar dispositivo" disabled={sessBusy} onClick={() => desconectar(s.id)} style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", border: `1px solid color-mix(in srgb, var(--danger) 22%, transparent)`, borderRadius: 8, color: C.red, cursor: "pointer" }}><LogOut size={14} /></button>}
              </div>
            ))}
          </div>
          {sessErr && <Msg err={sessErr} />}

          {/* Acesso da família (logins + papéis) */}
          <Divider />
          <STitle><IcoTxt Icon={Users}>Acesso da família</IcoTxt></STitle>
          {fam.canManage ? (
            <>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>Dê um login próprio a cada familiar. Todos veem as finanças da família; o papel define quem edita. <strong style={{ color: C.subtle }}>Visualizador</strong> é só leitura.</p>
              <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                {fam.members.map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        {m.nome}
                        {m.id === user.id && <Badge label="Você" color={C.indigo} />}
                        {m.isOwner && <Badge label="Titular" color={C.emerald} />}
                      </div>
                      <div style={{ fontSize: 10.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.email}</div>
                    </div>
                    {m.isOwner ? (
                      <span style={{ fontSize: 11, color: C.muted }}>{ROLE_LABEL.owner}</span>
                    ) : (
                      <>
                        <select value={m.role} onChange={(e) => trocarPapel(m.id, e.target.value)} disabled={famBusy} style={{ fontSize: 12, padding: "5px 8px", borderRadius: 8, background: C.fill, color: C.text, border: `1px solid ${C.border}` }}>
                          <option value="admin">Admin</option>
                          <option value="member">Membro</option>
                          <option value="viewer">Visualizador</option>
                        </select>
                        <button className="mini-act" aria-label="Remover acesso" disabled={famBusy} onClick={() => removerMembro(m.id)} style={{ background: "color-mix(in srgb, var(--danger) 10%, transparent)", border: `1px solid color-mix(in srgb, var(--danger) 22%, transparent)`, borderRadius: 8, color: C.red, cursor: "pointer" }}><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {fam.invites.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Convites pendentes</div>
                  {fam.invites.map((i) => (
                    <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.subtle, marginBottom: 4 }}>
                      <span style={{ flex: 1 }}>{i.nome || "Convite"} · {ROLE_LABEL[i.role] || i.role}</span>
                      <button onClick={() => revogarConvite(i.id)} style={{ background: "none", border: 0, color: C.red, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Revogar</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Gerar convite */}
              <div style={{ background: "var(--fill-2)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                <Label style={{ marginBottom: 8 }}>Convidar familiar</Label>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <Inp placeholder="Nome (opcional)" value={novoConvite.nome} onChange={(e) => setNovoConvite((p) => ({ ...p, nome: e.target.value }))} style={{ flex: 1 }} />
                  <select value={novoConvite.role} onChange={(e) => setNovoConvite((p) => ({ ...p, role: e.target.value }))} style={{ fontSize: 12, padding: "0 8px", borderRadius: 8, background: C.fill, color: C.text, border: `1px solid ${C.border}` }}>
                    <option value="admin">Admin</option>
                    <option value="member">Membro</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                </div>
                <Btn variant="ghost" onClick={gerarConvite} disabled={famBusy} style={{ width: "100%" }}><IcoTxt Icon={Plus}>Gerar link de convite</IcoTxt></Btn>
                {linkConvite && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                    <Inp readOnly value={linkConvite} style={{ flex: 1, fontSize: 11 }} onFocus={(e) => e.target.select()} />
                    <Btn variant="ghost" onClick={() => { try { navigator.clipboard.writeText(linkConvite); } catch { /* ignore */ } }} style={{ flex: "0 0 auto", padding: "9px 12px" }}>Copiar</Btn>
                  </div>
                )}
                {linkConvite && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>Compartilhe esse link (WhatsApp, etc.). Ele expira em 7 dias e só pode ser usado uma vez.</div>}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>Você faz parte da família de <strong style={{ color: C.text }}>{fam.ownerNome || "—"}</strong> — papel <strong style={{ color: C.text }}>{ROLE_LABEL[user.householdRole] || user.householdRole}</strong>. As finanças são compartilhadas com a família.</p>
          )}
          {famErr && <Msg err={famErr} />}

          {onSaveMembros && (
            <>
              <Divider />
              <STitle><IcoTxt Icon={Users}>Familiares / dependentes</IcoTxt></STitle>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>Adicione familiares para gerir as finanças deles na mesma conta. Os extratos e empréstimos ficam separados por pessoa. O valor da assinatura aumenta conforme o número de dependentes. <strong style={{ color: C.subtle }}>Ao remover um dependente, os lançamentos dele voltam para o principal e o valor é reduzido.</strong></p>
              <MembrosManager membros={membros} onSave={onSaveMembros} saving={busy} access={access} />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
