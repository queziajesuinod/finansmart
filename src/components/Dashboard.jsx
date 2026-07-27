// @ts-nocheck
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { C, MONTH_NAMES, today, daysInMonth, CATEGORIES, salarioVigente, tint } from "../lib/constants";
import { calcPMT, calcSaldoDevedor, calcParcelasPagas } from "../lib/finance";
import * as api from "../lib/api";
import DashboardTab from "./tabs/DashboardTab.jsx";
import LancamentosTab from "./tabs/LancamentosTab.jsx";
import ExtratoTab from "./tabs/ExtratoTab.jsx";
import ImportarTab from "./tabs/ImportarTab.jsx";
import CartoesTab from "./tabs/CartoesTab.jsx";
import EmprestimosTab from "./tabs/EmprestimosTab.jsx";
import ParceladosTab from "./tabs/ParceladosTab.jsx";
import MetasTab from "./tabs/MetasTab.jsx";
import HistoricoTab from "./tabs/HistoricoTab.jsx";
import AssistenteTab from "./tabs/AssistenteTab.jsx";
import AdminTab from "./tabs/AdminTab.jsx";
import { TabIcon } from "../lib/icons.jsx";
import { LogoTile, Wordmark } from "./Logo.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import ProfileModal from "./ProfileModal.jsx";
import NotificationBell from "./NotificationBell.jsx";
import { gerarNotificacoes } from "../lib/notifications";
import { detectarAssinaturas } from "../lib/subscriptions";
import { CircleUser } from "../lib/icons.jsx";

export default function Dashboard({ user, access, onLogout, onUserUpdate }) {
  const [tab, setTab] = useState("dashboard");
  const [profileOpen, setProfileOpen] = useState(false);
  const [monthIdx, setMonthIdx] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const mk = `${year}-${monthIdx}`;

  // Per-month state
  const [incomes, setIncomes] = useState({});
  const [allDespesas, setAllDespesas] = useState({});
  // Global state
  const [membros, setMembros] = useState([]);
  const [emprestimos, setEmprestimos] = useState([]);
  const [goals, setGoals] = useState([]);
  const [parcelados, setParcelados] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [categoryRules, setCategoryRules] = useState({});
  const [cardProfilesDB, setCardProfilesDB] = useState([]);
  const [chat, setChat] = useState([{ role: "assistant", content: "Olá! Sou seu assistente financeiro. Posso analisar seus gastos, calcular dívidas, comparar meses e dar dicas práticas. Como posso te ajudar?" }]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [erroSync, setErroSync] = useState("");

  // Carrega tudo da API na montagem.
  useEffect(() => {
    (async () => {
      try {
        const s = await api.getState();
        setIncomes(s.incomes);
        setAllDespesas(s.despesas);
        setMembros(s.membros || []);
        setEmprestimos(s.emprestimos);
        setGoals(s.goals);
        setParcelados(s.parcelados);
        setCartoes(s.cartoes);
        setCategoryRules(s.categoryRules || {});
        setCardProfilesDB(s.cardProfiles || []);
      } catch (e) {
        setErroSync("Não foi possível carregar seus dados do servidor.");
      } finally {
        setDataLoaded(true);
      }
    })();
  }, []);

  // Salva otimista: atualiza a tela e sincroniza com a API.
  const persist = useCallback((setter, saver) => async (v) => {
    setter(v);
    try { await saver(v); setErroSync(""); } catch { setErroSync("Falha ao salvar no servidor. Verifique sua conexão."); }
  }, []);

  const saveMembros = useCallback(persist(setMembros, api.saveMembros), [persist]);
  const saveIncomes = useCallback(persist(setIncomes, api.saveIncomes), [persist]);
  const saveDespesas = useCallback(persist(setAllDespesas, api.saveDespesas), [persist]);
  const saveEmprestimos = useCallback(persist(setEmprestimos, api.saveEmprestimos), [persist]);
  const saveGoals = useCallback(persist(setGoals, api.saveGoals), [persist]);
  const saveParcelados = useCallback(persist(setParcelados, api.saveParcelados), [persist]);
  const saveCartoes = useCallback(persist(setCartoes, api.saveCartoes), [persist]);
  const saveCategoryRules = useCallback(persist(setCategoryRules, api.saveCategoryRules), [persist]);
  const saveCardProfiles = useCallback(persist(setCardProfilesDB, api.saveCardProfiles), [persist]);

  // Salva a lista de membros e, se algum dependente foi REMOVIDO, joga os
  // lançamentos dele de volta para o principal (membroId = null) em todas as
  // coleções. O valor da assinatura cai sozinho (é calculado pela contagem).
  const saveMembrosCascade = useCallback((novaLista) => {
    const vivos = new Set((novaLista || []).map((m) => m.id));
    const removidos = new Set((membros || []).filter((m) => !vivos.has(m.id)).map((m) => m.id));
    if (removidos.size) {
      const orfao = (mid) => mid && removidos.has(mid);
      if (Object.values(allDespesas || {}).some((list) => (list || []).some((d) => orfao(d.membroId)))) {
        const next = {};
        for (const [k, list] of Object.entries(allDespesas || {})) next[k] = (list || []).map((d) => (orfao(d.membroId) ? { ...d, membroId: null } : d));
        saveDespesas(next);
      }
      if ((emprestimos || []).some((e) => orfao(e.membroId))) saveEmprestimos(emprestimos.map((e) => (orfao(e.membroId) ? { ...e, membroId: null } : e)));
      if ((parcelados || []).some((p) => orfao(p.membroId))) saveParcelados(parcelados.map((p) => (orfao(p.membroId) ? { ...p, membroId: null } : p)));
      if ((cartoes || []).some((c) => (c.compras || []).some((x) => orfao(x.membroId)))) {
        saveCartoes(cartoes.map((c) => ({ ...c, compras: (c.compras || []).map((x) => (orfao(x.membroId) ? { ...x, membroId: null } : x)) })));
      }
    }
    saveMembros(novaLista);
  }, [membros, allDespesas, emprestimos, parcelados, cartoes, saveDespesas, saveEmprestimos, saveParcelados, saveCartoes, saveMembros]);

  const income = incomes[mk] || { renda: "", extra: "" };
  const despesas = allDespesas[mk] || [];
  const setIncome = (k, v) => saveIncomes({ ...incomes, [mk]: { ...income, [k]: v } });
  const setDespesasMk = (fn) => { const next = typeof fn === "function" ? fn(despesas) : fn; saveDespesas({ ...allDespesas, [mk]: next }); };

  // Salário: usa o explícito do mês; se vazio, herda o último mês informado.
  const salarioVig = salarioVigente(incomes, year, monthIdx);
  const rendaExplicita = income.renda !== "" && income.renda != null;
  const rendaHerdada = !rendaExplicita && salarioVig.valor !== "";
  const rendaStr = rendaExplicita ? income.renda : (rendaHerdada ? salarioVig.valor : "");

  const rendaNum = parseFloat((rendaStr || "").replace(",", ".")) || 0;
  const extraNum = parseFloat((income.extra || "").replace(",", ".")) || 0;
  const totalRenda = rendaNum + extraNum;
  const despesasLancadas = useMemo(() => despesas.reduce((s, d) => s + d.valor, 0), [despesas]);

  const parcelasMensais = useMemo(() => emprestimos.reduce((s, e) => {
    const pago = e.pagoAuto !== false && e.dataPrimeira ? calcParcelasPagas(e.dataPrimeira, e.parcelas) : e.pago;
    return s + (pago < e.parcelas ? calcPMT(e.valorContratado, e.taxa, e.parcelas) : 0);
  }, 0), [emprestimos]);

  // Parcelas do mês vindas da aba Parcelados. IMPORTANTE: se a parcela já está
  // numa fatura de cartão importada DESTE mês (o total da fatura já a inclui),
  // não somamos de novo — evita contar em dobro. Nos meses sem fatura
  // (retroativos/futuros) a parcela conta normalmente como projeção.
  const parcelasCartaoMes = useMemo(() => {
    const mesRefStr = `${year}-${monthIdx}`;
    const cartoesMes = (cartoes || []).filter((c) => c.mesRef === mesRefStr);
    const ref = new Date(year, monthIdx, 1);
    const refFim = new Date(year, monthIdx + 1, 0);
    return parcelados.reduce((s, p) => {
      const ini = new Date(p.dataCompra + "T12:00:00");
      const fim = new Date(ini); fim.setMonth(fim.getMonth() + p.totalParcelas - 1);
      if (!(ini <= refFim && fim >= ref)) return s; // não ativa neste mês
      const jaNaFatura = cartoesMes.some((c) =>
        (c.compras || []).some((x) => x.parcelas > 1 && x.parcelas === p.totalParcelas && Math.abs((x.valor || 0) - p.valorParcela) < 0.01)
      );
      return jaNaFatura ? s : s + p.valorParcela;
    }, 0);
  }, [parcelados, cartoes, year, monthIdx]);

  const faturasCartaoMes = useMemo(() => (cartoes || []).filter((c) => c.mesRef === `${year}-${monthIdx}`).reduce((s, c) => s + c.total, 0), [cartoes, year, monthIdx]);

  const totalDespesas = despesasLancadas + parcelasMensais + parcelasCartaoMes + faturasCartaoMes;

  const dim = daysInMonth(year, monthIdx);
  const dayNow = (year === today.getFullYear() && monthIdx === today.getMonth()) ? today.getDate() : dim;
  const pctMes = (dayNow / dim) * 100;
  const pctGasto = totalRenda > 0 ? (totalDespesas / totalRenda) * 100 : 0;
  const gastoDiario = useMemo(() => { if (!despesas.length || !dayNow) return 0; const maxD = Math.max(...despesas.map((d) => new Date(d.data + "T12:00:00").getDate()), 1); return despesasLancadas / maxD; }, [despesas, despesasLancadas, dayNow]);
  const projecao = totalRenda - (gastoDiario * dim + parcelasMensais + parcelasCartaoMes + faturasCartaoMes);
  const saldoAtual = totalRenda - totalDespesas;
  const totalEmprestimos = useMemo(() => emprestimos.reduce((s, e) => {
    const pago = e.pagoAuto !== false && e.dataPrimeira ? calcParcelasPagas(e.dataPrimeira, e.parcelas) : e.pago;
    return s + calcSaldoDevedor(e.valorContratado, e.taxa, e.parcelas, pago);
  }, 0), [emprestimos]);

  const parcelVencendoMes = useMemo(() => parcelados.filter((p) => {
    const inicio = new Date(p.dataCompra + "T12:00:00");
    const fim = new Date(inicio); fim.setMonth(fim.getMonth() + p.totalParcelas - 1);
    return fim.getFullYear() === year && fim.getMonth() === monthIdx;
  }), [parcelados, year, monthIdx]);

  const statusInfo = useMemo(() => {
    if (!totalRenda) return null;
    if (projecao > totalRenda * 0.15) return { label: "Superávit", statusIcon: "superavit", color: C.emerald, bg: tint(C.emerald, 8), desc: "Você está indo muito bem!" };
    if (projecao >= 0) return { label: "Equilibrado", statusIcon: "equilibrado", color: C.amber, bg: tint(C.amber, 8), desc: "Fique atento aos gastos." };
    return { label: "Déficit", statusIcon: "deficit", color: C.red, bg: tint(C.red, 8), desc: "Gastos projetados excedem a renda." };
  }, [projecao, totalRenda]);

  const porCategoria = useMemo(() => CATEGORIES.map((c) => ({ ...c, total: despesas.filter((d) => d.categoria === c.id).reduce((s, d) => s + d.valor, 0) })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total), [despesas]);

  const historicoMeses = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, monthIdx - 5 + i, 1);
    const m = d.getMonth(), y = d.getFullYear(), k = `${y}-${m}`;
    const exp = incomes[k] || {};
    // Salário efetivo do mês (explícito ou herdado) + renda extra do mês.
    const rendaMes = (exp.renda && String(exp.renda).trim() !== "") ? exp.renda : salarioVigente(incomes, y, m).valor;
    const rendaEf = parseFloat((rendaMes || "0").replace(",", ".")) || 0;
    const extraEf = parseFloat((exp.extra || "0").replace(",", ".")) || 0;
    return { label: MONTH_NAMES[m].slice(0, 3), despesas: (allDespesas[k] || []).reduce((s, x) => s + x.valor, 0), renda: rendaEf + extraEf };
  }), [allDespesas, incomes, year, monthIdx]);

  // Perfis para a importação: cadastrados ("Meus Cartões") + os derivados do
  // histórico de importações. Os cadastrados têm prioridade e trazem os 4 finais.
  const cardProfiles = useMemo(() => {
    const map = new Map();
    // 1) derivados do histórico
    const ordenados = [...(cartoes || [])].sort((a, b) => String(a.criadoEm || "").localeCompare(String(b.criadoEm || "")));
    for (const c of ordenados) {
      const key = (c.nome || c.banco || "").toLowerCase().trim();
      if (!key) continue;
      map.set(key, { banco: c.banco || "", nome: c.nome || c.banco || "Cartão", limite: c.limite || 0, vencimentoDia: c.vencimentoDia || null, vencimento: c.vencimento || "", finais: "" });
    }
    // 2) cadastrados sobrescrevem/adicionam (com finais)
    for (const p of cardProfilesDB || []) {
      const key = (p.nome || "").toLowerCase().trim();
      if (!key) continue;
      map.set(key, { banco: p.banco || "", nome: p.nome, limite: Number(p.limite) || 0, vencimentoDia: p.vencimentoDia || null, vencimento: "", finais: p.finais || "" });
    }
    return [...map.values()];
  }, [cartoes, cardProfilesDB]);

  // Assinaturas / recorrentes detectadas nas faturas + lançamentos (todos os meses).
  // Limite de meses para considerar recorrente é configurável (salvo no navegador).
  const [assinMinMeses, setAssinMinMeses] = useState(() => { try { return parseInt(localStorage.getItem("jp:assinMinMeses"), 10) || 3; } catch { return 3; } });
  const mudarAssinMinMeses = (n) => { const v = Math.max(1, Math.min(12, n)); setAssinMinMeses(v); try { localStorage.setItem("jp:assinMinMeses", String(v)); } catch { /* ignore */ } };
  const despesasTodas = useMemo(() => Object.values(allDespesas || {}).flat(), [allDespesas]);
  const assinaturas = useMemo(() => detectarAssinaturas({ cartoes, despesas: despesasTodas, minMeses: assinMinMeses }), [cartoes, despesasTodas, assinMinMeses]);

  // Notificações proativas (saldo, faturas vencendo, metas, parcelas, aumentos...).
  const notificacoes = useMemo(() => gerarNotificacoes({
    year, monthIdx, today,
    totalRenda, totalDespesas, projecao,
    porCategoria, cartoes, parcelVencendoMes, goals, assinaturas: assinaturas.itens,
  }), [year, monthIdx, totalRenda, totalDespesas, projecao, porCategoria, cartoes, parcelVencendoMes, goals, assinaturas]);

  const ALL_TABS = [
    { id: "dashboard", label: "Visão Geral" },
    { id: "lancamentos", label: "Lançamentos" },
    { id: "extrato", label: "Extrato" },
    { id: "importar", label: "Importar PDF" },
    { id: "cartoes", label: "Cartões de Crédito" },
    { id: "emprestimos", label: "Empréstimos" },
    { id: "parcelados", label: "Parcelados" },
    { id: "metas", label: "Metas" },
    { id: "historico", label: "Histórico" },
    { id: "assistente", label: "Assistente IA" },
  ];

  // Só mostra as abas que o plano do usuário libera.
  const modulos = access?.modulos || [];
  const TABS = ALL_TABS.filter((t) => modulos.includes(t.id));
  // Admin tem uma aba extra de administração (não é um "módulo" de plano).
  if (access?.admin) TABS.push({ id: "admin", label: "Administração" });

  // Se a aba ativa não é permitida, volta para a primeira disponível.
  useEffect(() => {
    if (TABS.length && !TABS.some((t) => t.id === tab)) setTab(TABS[0].id);
  }, [modulos]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabPermitida = (id) => modulos.includes(id);

  // Mantém a aba ativa visível na faixa rolável (mobile).
  const tabStripRef = useRef(null);
  useEffect(() => {
    const el = tabStripRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [tab]);

  if (!dataLoaded) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: "sans-serif" }}>Carregando seus dados...</div>;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter','Segoe UI',sans-serif", color: C.text }}>
      <div style={{ background: "var(--fill-2)", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(20px)" }}>
        <div className="app-topbar" style={{ maxWidth: 900, margin: "0 auto" }}>
          <div className="app-brand">
            <LogoTile size={34} />
            <div style={{ minWidth: 0 }}>
              <Wordmark size={15} />
              <div style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Olá, {user.nome.split(" ")[0]}!</div>
            </div>
          </div>
          <div className="app-month">
            <button className="icon-btn" aria-label="Mês anterior" onClick={() => { const d = new Date(year, monthIdx - 1, 1); setMonthIdx(d.getMonth()); setYear(d.getFullYear()); }} style={{ fontSize: 18 }}>‹</button>
            <div style={{ fontSize: 13, fontWeight: 700, minWidth: 92, textAlign: "center" }}>{MONTH_NAMES[monthIdx].slice(0, 3)} {year}</div>
            <button className="icon-btn" aria-label="Próximo mês" onClick={() => { const d = new Date(year, monthIdx + 1, 1); setMonthIdx(d.getMonth()); setYear(d.getFullYear()); }} style={{ fontSize: 18 }}>›</button>
          </div>
          <div className="app-actions">
            <NotificationBell notificacoes={notificacoes} onNavigate={setTab} />
            <button className="icon-btn" aria-label="Meu perfil" onClick={() => setProfileOpen(true)}><CircleUser size={16} /></button>
            <ThemeToggle />
            <button onClick={onLogout} aria-label="Sair" style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 10, height: 40, padding: "0 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Sair</button>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <div ref={tabStripRef} className="tab-strip" style={{ maxWidth: 900, margin: "0 auto" }}>
            {TABS.map((t) => {
              const on = tab === t.id;
              return (
                <button key={t.id} data-active={on} onClick={() => setTab(t.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: on ? 700 : 600, whiteSpace: "nowrap", transition: "all .15s", border: `1px solid ${on ? tint(C.accent, 35) : C.border}`, background: on ? tint(C.accent, 14) : "transparent", color: on ? C.accent : C.muted }}>
                  <TabIcon id={t.id} size={14} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "18px 12px 48px" }}>
        {erroSync && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: C.red, borderRadius: 10, padding: "10px 14px", fontSize: 12, marginBottom: 14 }}>{erroSync}</div>}

        {tab === "dashboard" && tabPermitida("dashboard") && <DashboardTab income={income} setIncome={setIncome} rendaStr={rendaStr} rendaHerdada={rendaHerdada} salarioVig={salarioVig} totalRenda={totalRenda} rendaNum={rendaNum} extraNum={extraNum} totalDespesas={totalDespesas} despesasLancadas={despesasLancadas} parcelasMensais={parcelasMensais} parcelasCartaoMes={parcelasCartaoMes} faturasCartaoMes={faturasCartaoMes} saldoAtual={saldoAtual} projecao={projecao} pctMes={pctMes} pctGasto={pctGasto} gastoDiario={gastoDiario} statusInfo={statusInfo} porCategoria={porCategoria} totalEmprestimos={totalEmprestimos} parcelVencendoMes={parcelVencendoMes} despesas={despesas} monthIdx={monthIdx} year={year} assinaturas={assinaturas} assinMinMeses={assinMinMeses} onAssinMinMeses={mudarAssinMinMeses} />}
        {tab === "lancamentos" && tabPermitida("lancamentos") && <LancamentosTab despesas={despesas} setDespesasMk={setDespesasMk} membros={membros} />}
        {tab === "extrato" && tabPermitida("extrato") && <ExtratoTab despesas={despesas} setDespesasMk={setDespesasMk} totalDespesas={totalDespesas} cartoes={cartoes} monthIdx={monthIdx} year={year} setTab={setTab} membros={membros} />}
        {tab === "importar" && tabPermitida("importar") && <ImportarTab setDespesasMk={setDespesasMk} year={year} monthIdx={monthIdx} cartoes={cartoes} setCartoes={saveCartoes} parcelados={parcelados} setParcelados={saveParcelados} categoryRules={categoryRules} setCategoryRules={saveCategoryRules} cardProfiles={cardProfiles} setTab={setTab} membros={membros} setMembros={saveMembros} temAssistente={tabPermitida("assistente")} access={access} />}
        {tab === "cartoes" && tabPermitida("cartoes") && <CartoesTab cartoes={cartoes} setCartoes={saveCartoes} cardProfiles={cardProfilesDB} setCardProfiles={saveCardProfiles} membros={membros} />}
        {tab === "emprestimos" && tabPermitida("emprestimos") && <EmprestimosTab emprestimos={emprestimos} setEmprestimos={saveEmprestimos} membros={membros} />}
        {tab === "parcelados" && tabPermitida("parcelados") && <ParceladosTab parcelados={parcelados} setParcelados={saveParcelados} year={year} monthIdx={monthIdx} membros={membros} />}
        {tab === "metas" && tabPermitida("metas") && <MetasTab goals={goals} setGoals={saveGoals} />}
        {tab === "historico" && tabPermitida("historico") && <HistoricoTab historicoMeses={historicoMeses} />}
        {tab === "assistente" && tabPermitida("assistente") && <AssistenteTab chat={chat} setChat={setChat} totalRenda={totalRenda} totalDespesas={totalDespesas} saldoAtual={saldoAtual} projecao={projecao} statusInfo={statusInfo} porCategoria={porCategoria} goals={goals} emprestimos={emprestimos} parcelados={parcelados} monthIdx={monthIdx} year={year} />}
        {tab === "admin" && access?.admin && <AdminTab />}
      </div>

      {profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} onUpdated={onUserUpdate} membros={membros} onSaveMembros={saveMembrosCascade} access={access} />}
    </div>
  );
}
