// @ts-nocheck
// Ícones de marca (Netflix, Google, Spotify...) para comerciantes conhecidos.
// Usa o pacote simple-icons (SVG bundlado, sem CDN). Quando o comerciante não
// é reconhecido, cai no ícone da categoria.
import {
  siNetflix, siSpotify, siGoogle, siYoutube, siYoutubemusic, siGoogleplay, siGoogledrive,
  siGooglephotos, siApple, siAppletv, siApplemusic, siIcloud, siHbo, siHbomax, siPlaystation,
  siSteam, siEpicgames, siParamountplus, siCrunchyroll, siDeezer, siTidal, siAudible,
  siDuolingo, siTwitch, siDropbox, siNotion, siClaude, siTelegram, siWhatsapp, siInstagram,
  siFacebook, siMercadopago, siIfood, siUber, siNubank, siPicpay,
  siNeon, siPagseguro, siMastercard, siVisa, siAmericanexpress,
} from "simple-icons";
import { catById } from "./constants";
import { CatIcon, CreditCard } from "./icons.jsx";

// Ordem importa: regras mais específicas primeiro.
const MAP = [
  [/netflix/, siNetflix],
  [/spotify/, siSpotify],
  [/youtube\s*music|ytmusic/, siYoutubemusic],
  [/youtube/, siYoutube],
  [/google\s*play|play\s*store|playstore/, siGoogleplay],
  [/google\s*drive/, siGoogledrive],
  [/google\s*photos|google\s*fotos/, siGooglephotos],
  [/google/, siGoogle],
  [/icloud/, siIcloud],
  [/apple\s*tv|appletv/, siAppletv],
  [/apple\s*music|applemusic/, siApplemusic],
  [/apple|itunes/, siApple],
  [/hbo\s*max|hbomax/, siHbomax],
  [/hbo/, siHbo],
  [/paramount/, siParamountplus],
  [/crunchyroll/, siCrunchyroll],
  [/deezer/, siDeezer],
  [/tidal/, siTidal],
  [/audible/, siAudible],
  [/duolingo/, siDuolingo],
  [/playstation|\bpsn\b/, siPlaystation],
  [/steam/, siSteam],
  [/epic\s*games|epicgames/, siEpicgames],
  [/twitch/, siTwitch],
  [/dropbox/, siDropbox],
  [/notion/, siNotion],
  [/anthropic|claude/, siClaude],
  [/telegram/, siTelegram],
  [/whatsapp/, siWhatsapp],
  [/instagram/, siInstagram],
  [/facebook|\bmeta\b/, siFacebook],
  [/mercado\s*pago|mercadopago|\bmeli\b|mercado\s*livre|mercadolivre/, siMercadopago],
  [/ifood|ifd\b/, siIfood],
  [/uber/, siUber],
  [/nubank|nu\s*pagamentos/, siNubank],
  [/picpay/, siPicpay],
];

// Retorna o ícone da marca para uma descrição, ou null.
export function getBrand(desc) {
  const l = (desc || "").toLowerCase();
  for (const [re, ic] of MAP) if (re.test(l)) return ic;
  return null;
}

// Só o glifo SVG da marca (na cor oficial).
export function BrandGlyph({ brand, size = 16 }) {
  return (
    <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill={`#${brand.hex}`} xmlns="http://www.w3.org/2000/svg">
      <path d={brand.path} />
    </svg>
  );
}

// Chip com o ícone: marca (se conhecida) num tile claro, senão o ícone da
// categoria no tom da categoria. Drop-in para as listas de compras/assinaturas.
export function MerchantIcon({ desc, cat = "outros", size = 16, box = 32, style = {} }) {
  const brand = getBrand(desc);
  const base = { width: box, height: box, borderRadius: 8, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", ...style };
  if (brand) {
    return <span style={{ ...base, background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}><BrandGlyph brand={brand} size={size} /></span>;
  }
  const c = catById(cat);
  return <span style={{ ...base, background: `color-mix(in srgb, ${c.color} 10%, transparent)`, color: c.color }}><CatIcon id={cat} size={size} /></span>;
}

// ─── Marca do cartão/banco ────────────────────────────────────
// Emissores com logo no simple-icons.
const ISSUER_ICONS = [
  [/nubank|\bnu\b/, siNubank],
  [/picpay/, siPicpay],
  [/mercado\s*pago|mercadopago|\bmeli\b/, siMercadopago],
  [/\bneon\b/, siNeon],
  [/pagseguro|pagbank/, siPagseguro],
];
// Bandeiras (fallback só quando o emissor não é reconhecido).
const NETWORK_ICONS = [
  [/american\s*express|amex/, siAmericanexpress],
  [/mastercard|master\b/, siMastercard],
  [/\bvisa\b/, siVisa],
];
// Bancos brasileiros SEM ícone no simple-icons: tile com a cor oficial + monograma.
const CUSTOM_BANKS = [
  [/ita[uú]/, { bg: "#EC7000", fg: "#fff", label: "itaú" }],
  [/bradesco/, { bg: "#CC092F", fg: "#fff", label: "Bra" }],
  [/caixa/, { bg: "#1C5FAF", fg: "#fff", label: "CX" }],
  [/santander/, { bg: "#EC0000", fg: "#fff", label: "San" }],
  [/banco do brasil|ourocard|\bbb\b/, { bg: "#F7E017", fg: "#0033A0", label: "BB" }],
  [/banco inter|\binter\b/, { bg: "#FF7A00", fg: "#fff", label: "inter" }],
  [/c6\s*bank|\bc6\b/, { bg: "#121212", fg: "#fff", label: "C6" }],
  [/btg/, { bg: "#002E5D", fg: "#fff", label: "BTG" }],
  [/\bxp\b/, { bg: "#0B0D12", fg: "#F5C400", label: "XP" }],
  [/will\s*bank|willbank/, { bg: "#FFEB00", fg: "#16151A", label: "will" }],
  [/sicoob/, { bg: "#003641", fg: "#7DB61C", label: "Sic" }],
  [/sicredi/, { bg: "#3FA535", fg: "#fff", label: "Sicr" }],
  [/banco original|\boriginal\b/, { bg: "#0A0A0A", fg: "#7ED957", label: "Ori" }],
];
const acha = (lista, text) => { const l = (text || "").toLowerCase(); for (const [re, v] of lista) if (re.test(l)) return v; return null; };
export function getBankBrand(text) { return acha(ISSUER_ICONS, text) || acha(NETWORK_ICONS, text); }

// Preto ou branco conforme a luminância do fundo (ex: fundo amarelo → logo preto).
function contrastColor(hex) {
  const h = (hex || "").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#111" : "#fff";
}
// Tile do cartão. Prioridade: emissor conhecido (logo) → banco BR (monograma)
// → bandeira (Visa/Master) → ícone genérico de cartão.
export function CardBrandTile({ banco, nome, w = 46, h = 32, radius = 7, iconSize = 17 }) {
  const key = `${banco || ""} ${nome || ""}`;
  const base = { width: w, height: h, borderRadius: radius, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" };
  const svgTile = (ic) => <div style={{ ...base, background: `#${ic.hex}` }}><svg viewBox="0 0 24 24" width={iconSize} height={iconSize} fill={contrastColor(ic.hex)}><path d={ic.path} /></svg></div>;

  const issuer = acha(ISSUER_ICONS, key);
  if (issuer) return svgTile(issuer);

  const cust = acha(CUSTOM_BANKS, key);
  if (cust) {
    const L = cust.label.length;
    const factor = L <= 2 ? 0.42 : L === 3 ? 0.34 : L === 4 ? 0.28 : 0.23;
    const fontSize = Math.max(9, Math.round(h * factor));
    return <div style={{ ...base, background: cust.bg }}><span style={{ color: cust.fg, fontWeight: 800, fontSize, letterSpacing: "-0.5px", lineHeight: 1 }}>{cust.label}</span></div>;
  }

  const net = acha(NETWORK_ICONS, key);
  if (net) return svgTile(net);

  return <div style={{ ...base, background: "var(--accent)", color: "#fff" }}><CreditCard size={iconSize} /></div>;
}
