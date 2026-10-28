// @ts-nocheck
// Marca do José Planeja: um "J" com seta de crescimento (aproximação vetorial
// limpa da logo). Usa currentColor, então adapta ao tema.
export function LogoMark({ size = 24, stroke = 3.4, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" {...p}>
      {/* seta de crescimento */}
      <path d="M9 32 L19 22 L25 27 L37 14" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 13 L38 13 L38 21" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      {/* J */}
      <path d="M33 9 L33 28 C33 34 27.5 37.5 21.5 35.5" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
    </svg>
  );
}

// Tile da marca — cartão metálico crisp: azul elétrico com brilho superior e
// profundidade real (nada de pílula/achatado). radius pequeno por padrão.
export function LogoTile({ size = 36, radius }) {
  const r = radius != null ? radius : Math.max(5, Math.round(size * 0.16));
  return (
    <div style={{
      width: size, height: size, borderRadius: r,
      background: "linear-gradient(180deg, var(--primary-strong), var(--primary))",
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      boxShadow: "var(--shadow-primary), inset 0 1px 0 rgba(255,255,255,0.30)",
    }}>
      <LogoMark size={Math.round(size * 0.6)} />
    </div>
  );
}

// Tela de carregamento compartilhada: logo pulsando + spinner + texto.
export function LoadingScreen({ text = "Carregando..." }) {
  return (
    <div className="jp-splash" style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div className="jp-splash-logo"><LogoTile size={60} /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="jp-spin" />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{text}</span>
      </div>
    </div>
  );
}

// Wordmark com a tipografia de títulos (Plus Jakarta Sans).
export function Wordmark({ size = 15 }) {
  return (
    <span style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontWeight: 800, fontSize: size, letterSpacing: "-0.3px", color: "var(--text)", whiteSpace: "nowrap" }}>
      José <span style={{ color: "var(--primary)" }}>Planeja</span>
    </span>
  );
}
