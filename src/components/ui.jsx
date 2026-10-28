// @ts-nocheck
import { useState, useEffect } from "react";
import { SearchX } from "lucide-react";
import { C, tint } from "../lib/constants";

// ─── Valor monetário (estilo caixa: preenche da direita, sem vírgula manual) ──
// Cada dígito digitado entra pelos centavos: "5"→"0,05", "123"→"1,23",
// "12345"→"123,45". Vírgula/pontos aparecem sozinhos. Vazio continua vazio.
function fmtCentavosBR(str) {
  const digits = String(str ?? "").replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (digits === "") return "";
  const padded = digits.padStart(3, "0"); // garante ao menos "0,0X"
  const intPart = padded.slice(0, -2).replace(/^0+(?=\d)/, "") || "0";
  const decPart = padded.slice(-2);
  return `${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decPart}`;
}
// Display BR "1.234,56" → número limpo "1234.56" (para o resto do app).
function brParaNumStr(brStr) {
  return String(brStr ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
}
// Valor guardado (número em reais, ex.: 12200.5) → display BR "12.200,50".
function numParaBR(v) {
  if (v === "" || v == null) return "";
  let s = String(v).replace(/[^\d.,]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (s === "" || s === ".") return "";
  const n = parseFloat(s);
  if (isNaN(n)) return "";
  const [intRaw, decRaw] = n.toFixed(2).split(".");
  return `${intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decRaw}`;
}
const _floatDe = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? 0 : n; };

// Drop-in dos inputs de valor: onChange recebe e.target.value já como número
// limpo ("1234.56"), então o código que faz parseFloat(...) continua igual.
export function MoneyInput({ value, onChange, style = {}, ...p }) {
  const [display, setDisplay] = useState(() => numParaBR(value));
  useEffect(() => {
    if (_floatDe(brParaNumStr(display)) !== _floatDe(value)) setDisplay(numParaBR(value));
  }, [value]);
  function handle(e) {
    const f = fmtCentavosBR(e.target.value);
    setDisplay(f);
    onChange && onChange({ target: { value: brParaNumStr(f) } });
  }
  return <input {...p} type="text" inputMode="decimal" value={display} onChange={handle}
    style={{ width: "100%", padding: "10px 13px", background: C.fill, border: `1px solid ${C.border}`, borderRadius: "var(--r-md)", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", ...style }} />;
}

export function Card({ children, style = {} }) {
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "var(--r-xl)", padding: "18px 18px", boxShadow: "var(--shadow-sm), var(--edge)", ...style }}>{children}</div>;
}

export function Label({ children, style = {} }) {
  return <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6, ...style }}>{children}</div>;
}

export function Field({ label, children, span = 1, style = {} }) {
  return <div style={{ gridColumn: `span ${span}`, ...style }}>{label && <Label>{label}</Label>}{children}</div>;
}

export function Inp({ style = {}, ...p }) {
  return <input {...p} style={{ width: "100%", padding: "10px 13px", background: C.fill, border: `1px solid ${C.border}`, borderRadius: "var(--r-md)", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", ...style }} />;
}

export function Sel({ children, style = {}, ...p }) {
  return <select {...p} style={{ width: "100%", padding: "10px 13px", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: "var(--r-md)", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", ...style }}>{children}</select>;
}

// Botão "Elite": cantos crisp (r-sm) e profundidade real. O estilo vive em
// .btn no index.css; aqui só mapeamos a variante. `sm` = primário compacto.
export function Btn({ children, variant = "primary", className = "", style = {}, ...p }) {
  const v = variant === "sm" ? "primary sm" : variant;
  return <button {...p} className={`btn ${v} ${className}`.trim()} style={style}>{children}</button>;
}

export function Badge({ label, color, Icon }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color, background: tint(color, 14), border: `1px solid ${tint(color, 24)}`, padding: "3px 10px", borderRadius: "var(--r-xs)", display: "inline-flex", alignItems: "center", gap: 5 }}>{Icon && <Icon size={12} strokeWidth={2.2} />}{label}</span>;
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
      <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: C.fill2, border: `1px solid ${C.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14, color: C.muted }}>
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
