// @ts-nocheck
import { SearchX } from "lucide-react";
import { C, tint } from "../lib/constants";

export function Card({ children, style = {} }) {
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 18px", boxShadow: "var(--shadow-sm)", ...style }}>{children}</div>;
}

export function Label({ children, style = {} }) {
  return <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6, ...style }}>{children}</div>;
}

export function Field({ label, children, span = 1, style = {} }) {
  return <div style={{ gridColumn: `span ${span}`, ...style }}>{label && <Label>{label}</Label>}{children}</div>;
}

export function Inp({ style = {}, ...p }) {
  return <input {...p} style={{ width: "100%", padding: "10px 13px", background: C.fill, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", ...style }} />;
}

export function Sel({ children, style = {}, ...p }) {
  return <select {...p} style={{ width: "100%", padding: "10px 13px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", ...style }}>{children}</select>;
}

export function Btn({ children, variant = "primary", style = {}, ...p }) {
  const variants = {
    // Platina — botão de ação principal (chapado, sem degradê).
    primary: { background: C.primary, color: C.onPrimary, border: "none" },
    sm: { background: C.primary, color: C.onPrimary, border: "none", fontSize: 12, padding: "7px 14px" },
    ghost: { background: "transparent", border: `1px solid ${C.border}`, color: C.subtle },
    danger: { background: tint(C.red, 10), border: `1px solid ${tint(C.red, 26)}`, color: C.red },
    success: { background: tint(C.emerald, 12), border: `1px solid ${tint(C.emerald, 30)}`, color: C.emerald },
  };
  return <button {...p} style={{ padding: "11px 18px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "filter .15s, transform .08s", ...variants[variant], ...style }}>{children}</button>;
}

export function Badge({ label, color, Icon }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color, background: tint(color, 14), padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5 }}>{Icon && <Icon size={12} strokeWidth={2.2} />}{label}</span>;
}

export function Bar({ pct, color, h = 6 }) {
  return (
    <div style={{ height: h, background: C.track, borderRadius: 999, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 999, transition: "width .5s" }} />
    </div>
  );
}

export function Empty({ title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: C.muted }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: C.fill2, border: `1px solid ${C.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14, color: C.muted }}>
        <SearchX size={26} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.subtle, marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

export function STitle({ children, style = {} }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, ...style }}>{children}</div>;
}

export function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "16px 0" }} />;
}

// Ícone + texto alinhados (para títulos e botões).
export function IcoTxt({ Icon, size = 14, gap = 8, children }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap }}><Icon size={size} strokeWidth={2} /> {children}</span>;
}
