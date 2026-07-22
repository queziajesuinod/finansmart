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

// Tile da marca (quadrado arredondado com o símbolo). bg = azul de ação.
export function LogoTile({ size = 34, radius = 10 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <LogoMark size={Math.round(size * 0.62)} />
    </div>
  );
}

// Wordmark com a tipografia de títulos (Plus Jakarta Sans).
export function Wordmark({ size = 15 }) {
  return (
    <span style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontWeight: 800, fontSize: size, letterSpacing: "-0.3px", color: "var(--text)" }}>
      José <span style={{ color: "var(--accent)" }}>Planeja</span>
    </span>
  );
}
