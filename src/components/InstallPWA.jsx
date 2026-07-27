// @ts-nocheck
// Banner que estimula instalar o PWA — usado SÓ na tela de login.
// Android/desktop: usa o evento beforeinstallprompt (botão "Instalar").
// iOS (Safari não dispara o evento): mostra as instruções de "Adicionar à Tela de Início".
import { useState, useEffect } from "react";
import { C } from "../lib/constants";
import { Btn } from "./ui";
import { Smartphone, X } from "../lib/icons.jsx";
import { LogoTile } from "./Logo.jsx";

function jaInstalado() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function InstallPWA() {
  const [deferred, setDeferred] = useState(null);
  const [visivel, setVisivel] = useState(false);
  const [dispensado, setDispensado] = useState(() => { try { return localStorage.getItem("jp:pwaDismiss") === "1"; } catch { return false; } });

  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent || "") && !/crios|fxios|edgios/i.test(navigator.userAgent || "");

  useEffect(() => {
    if (jaInstalado()) return;
    const onBIP = (e) => { e.preventDefault(); setDeferred(e); setVisivel(true); };
    const onInstalled = () => setVisivel(false);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    if (isIOS) setVisivel(true); // iOS não tem beforeinstallprompt → só instruções
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isIOS]);

  if (jaInstalado() || dispensado || !visivel) return null;

  async function instalar() {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch { /* ignore */ }
    setDeferred(null);
    setVisivel(false);
  }
  const dispensar = () => { setDispensado(true); try { localStorage.setItem("jp:pwaDismiss", "1"); } catch { /* ignore */ } };

  return (
    <div style={{ marginTop: 18, position: "relative", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--shadow-sm)" }}>
      <LogoTile size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><Smartphone size={14} color={C.accent} /> Instale o app no seu celular</div>
        {isIOS ? (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>No Safari: toque em <strong style={{ color: C.subtle }}>Compartilhar</strong> e depois em <strong style={{ color: C.subtle }}>“Adicionar à Tela de Início”</strong>.</div>
        ) : (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Acesso em tela cheia, mais rápido e funciona offline.</div>
        )}
      </div>
      {deferred && !isIOS && <Btn variant="sm" onClick={instalar} style={{ flexShrink: 0 }}>Instalar</Btn>}
      <button onClick={dispensar} aria-label="Dispensar" style={{ position: "absolute", top: 6, right: 6, background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 4, display: "inline-flex", lineHeight: 0 }}><X size={14} /></button>
    </div>
  );
}
