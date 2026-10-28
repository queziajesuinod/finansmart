// @ts-nocheck
// Sino de notificações: mostra a contagem de não lidas, abre um painel com a
// lista, permite marcar como lida (individual ou todas) e navegar para a aba.
import { useState, useRef, useEffect } from "react";
import { C, tint } from "../lib/constants";
import { loadRead, saveRead } from "../lib/notifications";
import { Bell, CheckCheck, Siren, TriangleAlert, Lightbulb, CircleCheck, X } from "../lib/icons.jsx";

const SEV = {
  alta: { cor: C.red, Icon: Siren },
  media: { cor: C.amber, Icon: TriangleAlert },
  info: { cor: C.indigo, Icon: Lightbulb },
  sucesso: { cor: C.emerald, Icon: CircleCheck },
};

export default function NotificationBell({ notificacoes = [], onNavigate }) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(() => loadRead());
  const boxRef = useRef(null);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const naoLidas = notificacoes.filter((n) => !read.has(n.id));
  const count = naoLidas.length;

  const marcarLida = (id) => setRead((prev) => { const s = new Set(prev); s.add(id); saveRead(s); return s; });
  const marcarTodas = () => setRead((prev) => { const s = new Set(prev); notificacoes.forEach((n) => s.add(n.id)); saveRead(s); return s; });
  const abrirNotif = (n) => { marcarLida(n.id); setOpen(false); if (n.tab && onNavigate) onNavigate(n.tab); };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button aria-label="Notificações" onClick={() => setOpen((v) => !v)}
        style={{ position: "relative", background: "var(--surface)", border: `1px solid ${C.border}`, color: count ? C.accent : C.subtle, borderRadius: "var(--r-md)", width: 40, height: 40, flexShrink: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-sm)" }}>
        <Bell size={16} />
        {count > 0 && (
          <span style={{ position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: C.red, color: "#fff", fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-panel pop-in" style={{ position: "absolute", right: 0, top: 48, width: 320, maxWidth: "86vw", maxHeight: 420, overflowY: "auto", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "var(--r-lg)", boxShadow: "var(--shadow), var(--edge)", zIndex: 200 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.surface }}>
            <span style={{ fontSize: 13, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 7 }}><Bell size={14} /> Notificações</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {count > 0 && (
                <button onClick={marcarTodas} title="Marcar todas como lidas" style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 6px" }}>
                  <CheckCheck size={13} /> Marcar lidas
                </button>
              )}
              <button aria-label="Fechar" onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "inline-flex" }}><X size={15} /></button>
            </div>
          </div>

          {notificacoes.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: C.muted }}>
              <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: tint(C.emerald, 12), border: `1px solid ${tint(C.emerald, 22)}`, color: C.emerald, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}><CircleCheck size={22} /></div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.subtle }}>Tudo em dia</div>
              <div style={{ fontSize: 11.5, marginTop: 3 }}>Nenhuma notificação por aqui.</div>
            </div>
          ) : (
            notificacoes.map((n) => {
              const sev = SEV[n.severidade] || SEV.info;
              const lida = read.has(n.id);
              return (
                <button key={n.id} onClick={() => abrirNotif(n)}
                  style={{ width: "100%", textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 14px", borderBottom: `1px solid ${C.border}`, background: lida ? "transparent" : tint(sev.cor, 6), border: "none", borderBottomStyle: "solid", cursor: "pointer" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: tint(sev.cor, 14), color: sev.cor, display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}><sev.Icon size={16} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{n.titulo}</span>
                      {!lida && <span style={{ width: 7, height: 7, borderRadius: "50%", background: sev.cor, flexShrink: 0 }} />}
                    </span>
                    <span style={{ display: "block", fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginTop: 2 }}>{n.msg}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
