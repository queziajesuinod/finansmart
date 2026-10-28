// @ts-nocheck
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { C, MONTH_NAMES, today, daysInMonth, CATEGORIES, salarioVigente, tint, holeritesVigentes, rendaHolerite, rendasExtrasDoMes, addMonths } from "../lib/constants";
import { calcParcelasPagas, emprestimoEstado, parcelaEmprestimoNoMes } from "../lib/finance";
import * as api from "../lib/api";
import DashboardTab from "./tabs/DashboardTab.jsx";
import ReceitasTab from "./tabs/ReceitasTab.jsx";
import InvestimentosTab from "./tabs/InvestimentosTab.jsx";
import LancamentosTab from "./tabs/LancamentosTab.jsx";
import ExtratoTab from "./tabs/ExtratoTab.jsx";
import CartoesTab from "./tabs/CartoesTab.jsx";
import EmprestimosTab from "./tabs/EmprestimosTab.jsx";
import MetasTab from "./tabs/MetasTab.jsx";
import HistoricoTab from "./tabs/HistoricoTab.jsx";
import AssistenteTab from "./tabs/AssistenteTab.jsx";
import AdminTab from "./tabs/AdminTab.jsx";
import { TabIcon } from "../lib/icons.jsx";
import { LogoTile, Wordmark, LoadingScreen } from "./Logo.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import ProfileModal from "./ProfileModal.jsx";
import NotificationBell from "./NotificationBell.jsx";
import { gerarNotificacoes } from "../lib/notifications";
import { detectarAssinaturas } from "../lib/subscriptions";
import { CircleUser, Settings, Plus, LogOut, X, Sparkles, TriangleAlert } from "../lib/icons.jsx";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";

export default function Dashboard({ user, access, onLogout, onUserUpdate, initialTab }) {
  const [tab, setTab] = useState(initialTab || "dashboard");
  const [profileOpen, setProfileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  const [globalCategoryRules, setGlobalCategoryRules] = useState({});
  const [cardProfilesDB, setCardProfilesDB] = useState([]);
  const [holerites, setHolerites] = useState([]);
  const [rendasExtras, setRendasExtras] = useState([]);
  const [investimentos, setInvestimentos] = useState([]);
  const [chat, setChat] = useState([{ role: "assistant", content: "Olá! Sou seu assistente financeiro. Posso analisar seus gastos, calcular dívidas, comparar meses e dar dicas práticas. Como posso te ajudar?" }]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [erroSync, setErroSync] = useState("");
  const [avisoGlobal, setAvisoGlobal] = useState("");

  // Carrega tudo da API (na montagem e ao recarregar após um conflito).
  const carregar = useCallback(async () => {
    const s = await api.getState();
    setIncomes(s.incomes);
    setAllDespesas(s.despesas);
    setMembros(s.membros || []);
    setEmprestimos(s.emprestimos);
    setGoals(s.goals);
    setParcelados(s.parcelados);
    setCartoes(s.cartoes);
    setCategoryRules(s.categoryRules || {});
    setGlobalCategoryRules(s.globalCategoryRules || {});
    setAvisoGlobal(s.avisoGlobal || "");
    setCardProfilesDB(s.cardProfiles || []);
    setHolerites(s.holerites || []);
    setRendasExtras(s.rendasExtras || []);
    setInvestimentos(s.investimentos || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await carregar();
      } catch (e) {
        setErroSync("Não foi possível carregar seus dados do servidor.");
      } finally {
        setDataLoaded(true);
      }
    })();
  }, [carregar]);

  // Salva otimista: atualiza a tela e sincroniza com a API. Cada coleção tem a sua
  // fila — só um PUT por vez, sempre com o valor mais recente — para os salvamentos
  // não chegarem fora de ordem. Se o servidor recusar por dados desatualizados
  // (outro aparelho salvou antes), recarrega tudo em vez de sobrescrever.
  const persist = useCallback((setter, saver) => {
    const fila = { rodando: false, tem: false, valor: undefined };
    const drenar = async () => {
      fila.rodando = true;
      while (fila.tem) {
        const v = fila.valor;
        fila.tem = false;
        try {
          await saver(v);
          setErroSync("");
        } catch (e) {
          if (e && e.code === "stale_data") {
            fila.tem = false;
            try { await carregar(); } catch { /* mantém a tela atual */ }
            setErroSync("Seus dados foram alterados em outro aparelho. Recarregamos a versão mais recente — refaça a última alteração.");
          } else {
            setErroSync("Falha ao salvar no servidor. Verifique sua conexão.");
          }
        }
      }
      fila.rodando = false;
    };
    return (v) => {
      setter(v);
      fila.valor = v;
      fila.tem = true;
      if (!fila.rodando) drenar();
    };
  }, [carregar]);

  const saveMembros = useCallback(persist(setMembros, api.saveMembros), [persist]);
  const saveIncomes = useCallback(persist(setIncomes, api.saveIncomes), [persist]);
  const saveDespesas = useCallback(persist(setAllDespesas, api.saveDespesas), [persist]);
  const saveEmprestimos = useCallback(persist(setEmprestimos, api.saveEmprestimos), [persist]);
  const saveGoals = useCallback(persist(setGoals, api.saveGoals), [persist]);
  const saveParcelados = useCallback(persist(setParcelados, api.saveParcelados), [persist]);
  const saveCartoes = useCallback(persist(setCartoes, api.saveCartoes), [persist]);
  const saveCategoryRules = useCallback(persist(setCategoryRules, api.saveCategoryRules), [persist]);
  const saveCardProfiles = useCallback(persist(setCardProfilesDB, api.saveCardProfiles), [persist]);
  const saveHolerites = useCallback(persist(setHolerites, api.saveHolerites), [persist]);
  const saveRendasExtras = useCallback(persist(setRendasExtras, api.saveRendasExtras), [persist]);
  const saveInvestimentos = useCallback(persist(setInvestimentos, api.saveInvestimentos), [persist]);

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
      if ((holerites || []).some((h) => orfao(h.membroId))) saveHolerites(holerites.map((h) => (orfao(h.membroId) ? { ...h, membroId: null } : h)));
      if ((rendasExtras || []).some((r) => orfao(r.membroId))) saveRendasExtras(rendasExtras.map((r) => (orfao(r.membroId) ? { ...r, membroId: null } : r)));
      if ((investimentos || []).some((v) => orfao(v.membroId))) saveInvestimentos(investimentos.map((v) => (orfao(v.membroId) ? { ...v, membroId: null } : v)));
    }
    saveMembros(novaLista);
  }, [membros, allDespesas, emprestimos, parcelados, cartoes, holerites, rendasExtras, investimentos, saveDespesas, saveEmprestimos, saveParcelados, saveCartoes, saveHolerites, saveRendasExtras, saveInvestimentos, saveMembros]);

  const income = incomes[mk] || { renda: "", extra: "" };
  const despesas = allDespesas[mk] || [];
  const setIncome = (k, v) => saveIncomes({ ...incomes, [mk]: { ...income, [k]: v } });
  const setDespesasMk = (fn) => { const next = typeof fn === "function" ? fn(despesas) : fn; saveDespesas({ ...allDespesas, [mk]: next }); };

  // ─── Totais de um mês qualquer (mês exibido e Histórico usam a mesma conta) ───
  const rendaNoMes = (y, m) =>
    holeritesVigentes(holerites, y, m).reduce((s, h) => s + rendaHolerite(h), 0) +
    rendasExtrasDoMes(rendasExtras, y, m).reduce((s, r) => s + (Number(r.valor) || 0), 0);
  const parcelasEmprestimosNoMes = (y, m) => emprestimos.reduce((s, e) => {
    const p = parcelaEmprestimoNoMes(e, y, m);
    return s + (p ? p.valor : 0);
  }, 0);
  // Parcelas da aba Parcelados. IMPORTANTE: se a parcela já está numa fatura de
  // cartão importada DAQUELE mês (o total da fatura já a inclui), não somamos de
  // novo — evita contar em dobro. Nos meses sem fatura (retroativos/futuros) a
  // parcela conta normalmente como projeção.
  const parcelasAvulsasNoMes = (y, m) => {
    const cartoesMes = (cartoes || []).filter((c) => c.mesRef === `${y}-${m}`);
    const ref = new Date(y, m, 1);
    const refFim = new Date(y, m + 1, 0);
    return parcelados.reduce((s, p) => {
      const ini = new Date(p.dataCompra + "T12:00:00");
      const fim = addMonths(p.dataCompra, p.totalParcelas - 1);
      if (!(ini <= refFim && fim >= ref)) return s; // não ativa neste mês
      const jaNaFatura = cartoesMes.some((c) =>
        (c.compras || []).some((x) => x.parcelas > 1 && x.parcelas === p.totalParcelas && Math.abs((x.valor || 0) - p.valorParcela) < 0.01)
      );
      return jaNaFatura ? s : s + p.valorParcela;
    }, 0);
  };
  // Regime de CAIXA: o cartão pesa no gasto do mês pelo que foi PAGO (valorPago).
  // Fatura ainda não conciliada (valorPago null) conta cheia (obrigação pendente);
  // ao registrar a baixa, passa a contar só o que foi quitado.
  const faturasNoMes = (y, m) => (cartoes || []).filter((c) => c.mesRef === `${y}-${m}`).reduce((s, c) => s + (c.valorPago == null ? (c.total || 0) : (Number(c.valorPago) || 0)), 0);

  // Renda fixa estruturada: soma da renda dos holerites vigentes no mês
  // (líquido + benefícios/outros rendimentos).
  const holeritesDoMes = useMemo(() => holeritesVigentes(holerites, year, monthIdx), [holerites, year, monthIdx]);
  const rendaHoleritesNum = useMemo(() => holeritesDoMes.reduce((s, h) => s + rendaHolerite(h), 0), [holeritesDoMes]);
  const temHoleriteMes = holeritesDoMes.length > 0;

  // Salário manual: usa o explícito do mês; se vazio, herda o último mês — MAS só
  // quando NÃO há holerite no mês. Com holerite, ele é a renda fixa; herdar o
  // salário manual por cima duplicaria a renda.
  const salarioVig = salarioVigente(incomes, year, monthIdx);
  const rendaExplicita = income.renda !== "" && income.renda != null;
  const rendaHerdada = !rendaExplicita && !temHoleriteMes && salarioVig.valor !== "";
  const rendaStr = rendaExplicita ? income.renda : (rendaHerdada ? salarioVig.valor : "");

  const rendaManualNum = parseFloat((rendaStr || "").replace(",", ".")) || 0;
  const extraManualNum = parseFloat((income.extra || "").replace(",", ".")) || 0;

  // Rendas extras estruturadas (por membro) do mês.
  const extrasDoMes = useMemo(() => rendasExtrasDoMes(rendasExtras, year, monthIdx), [rendasExtras, year, monthIdx]);
  const rendaExtrasMembrosNum = useMemo(() => extrasDoMes.reduce((s, r) => s + (Number(r.valor) || 0), 0), [extrasDoMes]);

  // Renda entra SÓ pelo cadastro (holerites e rendas extras por membro). Os campos
  // do topo são só visualização, pra não haver duplicidade.
  const rendaNum = rendaHoleritesNum; // renda fixa total = holerites
  const extraNum = rendaExtrasMembrosNum; // renda extra total = rendas extras por membro
  const totalRenda = rendaNum + extraNum;
  const despesasLancadas = useMemo(() => despesas.reduce((s, d) => s + d.valor, 0), [despesas]);

  // Parcelas de empréstimo que vencem NO MÊS exibido (já com aportes/amortizações).
  // É a mesma conta que alimenta as linhas de empréstimo do Extrato.
  const parcelasMensais = useMemo(() => parcelasEmprestimosNoMes(year, monthIdx), [emprestimos, year, monthIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const parcelasCartaoMes = useMemo(() => parcelasAvulsasNoMes(year, monthIdx), [parcelados, cartoes, year, monthIdx]); // eslint-disable-line react-hooks/exhaustive-deps
  const faturasCartaoMes = useMemo(() => faturasNoMes(year, monthIdx), [cartoes, year, monthIdx]); // eslint-disable-line react-hooks/exhaustive-deps

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
    return s + emprestimoEstado(e, pago).saldo; // saldo devedor (já com aportes/amortizações)
  }, 0), [emprestimos]);

  const parcelVencendoMes = useMemo(() => parcelados.filter((p) => {
    const fim = addMonths(p.dataCompra, p.totalParcelas - 1);
    return fim.getFullYear() === year && fim.getMonth() === monthIdx;
  }), [parcelados, year, monthIdx]);

  const statusInfo = useMemo(() => {
    if (!totalRenda) return null;
    if (projecao > totalRenda * 0.15) return { label: "Superávit", statusIcon: "superavit", color: C.emerald, bg: tint(C.emerald, 8), desc: "Você está indo muito bem!" };
    if (projecao >= 0) return { label: "Equilibrado", statusIcon: "equilibrado", color: C.amber, bg: tint(C.amber, 8), desc: "Fique atento aos gastos." };
    return { label: "Déficit", statusIcon: "deficit", color: C.red, bg: tint(C.red, 8), desc: "Gastos projetados excedem a renda." };
  }, [projecao, totalRenda]);

  const porCategoria = useMemo(() => {
    // Gastos por categoria = lançamentos avulsos + compras de cartão da fatura do mês.
    const comprasMes = (cartoes || []).filter((c) => c.mesRef === `${year}-${monthIdx}`).flatMap((c) => c.compras || []);
    return CATEGORIES.map((c) => {
      const totalDespesas = despesas.filter((d) => d.categoria === c.id).reduce((s, d) => s + d.valor, 0);
      const totalCartao = comprasMes.filter((x) => (x.categoria || "outros") === c.id).reduce((s, x) => s + (Number(x.valor) || 0), 0);
      return { ...c, total: totalDespesas + totalCartao };
    }).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  }, [despesas, cartoes, year, monthIdx]);

  // Histórico: mesma conta do mês exibido (renda dos holerites + extras; gastos =
  // lançamentos + cartão + parcelas de empréstimo + parcelas avulsas).
  const historicoMeses = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, monthIdx - 5 + i, 1);
    const m = d.getMonth(), y = d.getFullYear();
    const lancadas = (allDespesas[`${y}-${m}`] || []).reduce((s, x) => s + x.valor, 0);
    return { label: MONTH_NAMES[m].slice(0, 3), despesas: lancadas + parcelasEmprestimosNoMes(y, m) + parcelasAvulsasNoMes(y, m) + faturasNoMes(y, m), renda: rendaNoMes(y, m) };
  }), [allDespesas, holerites, rendasExtras, emprestimos, parcelados, cartoes, year, monthIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Perfis para a importação: cadastrados ("Meus Cartões") + os derivados do
  // histórico de importações. Os cadastrados têm prioridade e trazem os 4 finais.
  const cardProfiles = useMemo(() => {
    const map = new Map();
    // 1) derivados do histórico
    const ordenados = [...(cartoes || [])].sort((a, b) => String(a.criadoEm || "").localeCompare(String(b.criadoEm || "")));
    for (const c of ordenados) {
      const key = (c.nome || c.banco || "").toLowerCase().trim();
      if (!key) continue;
      map.set(key, { banco: c.banco || "", nome: c.nome || c.banco || "Cartão", limite: c.limite || 0, vencimentoDia: c.vencimentoDia || null, fechamentoDia: null, vencimento: c.vencimento || "", finais: "" });
    }
    // 2) cadastrados sobrescrevem/adicionam (com finais)
    for (const p of cardProfilesDB || []) {
      const key = (p.nome || "").toLowerCase().trim();
      if (!key) continue;
      map.set(key, { banco: p.banco || "", nome: p.nome, limite: Number(p.limite) || 0, vencimentoDia: p.vencimentoDia || null, fechamentoDia: p.fechamentoDia || null, vencimento: "", finais: p.finais || "" });
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
    { id: "dashboard", label: "Visão Geral", grupo: "Visão", desc: "Saldo e projeção do mês" },
    // Receitas não é um módulo de plano: acompanha quem tem a Visão Geral.
    { id: "receitas", label: "Receitas", modulo: "dashboard", grupo: "Dia a dia", desc: "Holerites e rendas extras" },
    { id: "lancamentos", label: "Lançamentos", grupo: "Dia a dia", desc: "Registrar gastos do mês" },
    { id: "extrato", label: "Extrato", grupo: "Dia a dia", desc: "Tudo que entrou e saiu" },
    { id: "cartoes", label: "Cartões de Crédito", grupo: "Crédito & dívidas", desc: "Faturas e compras no cartão" },
    { id: "emprestimos", label: "Empréstimos", grupo: "Crédito & dívidas", desc: "Parcelas e saldo devedor" },
    { id: "investimentos", label: "Investimentos", grupo: "Planejamento", desc: "Aportes e patrimônio" },
    { id: "metas", label: "Metas", grupo: "Planejamento", desc: "Objetivos de economia" },
    { id: "historico", label: "Histórico", grupo: "Planejamento", desc: "Comparativo dos meses" },
    { id: "assistente", label: "Assistente IA", grupo: "Inteligência", desc: "Análises com IA" },
  ];
  const GRUPOS = ["Visão", "Dia a dia", "Crédito & dívidas", "Planejamento", "Inteligência"];

  // Só mostra as abas que o plano do usuário libera.
  const modulos = access?.modulos || [];
  const TABS = ALL_TABS.filter((t) => modulos.includes(t.modulo || t.id));
  // Navegação agrupada para o drawer (hub).
  const NAV = GRUPOS.map((g) => ({ grupo: g, itens: TABS.filter((t) => t.grupo === g) })).filter((s) => s.itens.length);
  const tabAtual = TABS.find((t) => t.id === tab) || TABS[0];

  // Se a aba ativa não é permitida, volta para a primeira disponível.
  useEffect(() => {
    if (TABS.length && !TABS.some((t) => t.id === tab)) setTab(TABS[0].id);
  }, [modulos]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabPermitida = (id) => TABS.some((t) => t.id === id);
  const go = (id) => { setTab(id); setDrawerOpen(false); };

  // Fecha o drawer com Esc e trava a rolagem do fundo enquanto aberto.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [drawerOpen]);

  if (!dataLoaded) return <LoadingScreen text="Carregando seus dados..." />;

  // Administração é uma PÁGINA de gestão à parte servida na rota /admin. Esta
  // ramificação permanece como fallback caso alguém force tab="admin".
  if (tab === "admin" && access?.admin) {
    return <AdminTab user={user} onBack={() => setTab(TABS.find((t) => t.id !== "admin")?.id || "dashboard")} onLogout={onLogout} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter','Segoe UI',sans-serif", color: C.text }}>
      <div style={{ background: "color-mix(in srgb, var(--surface) 86%, transparent)", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(18px)", boxShadow: "var(--shadow-sm)" }}>
        <div className="app-topbar" style={{ maxWidth: 1040, margin: "0 auto" }}>
          <button className="menu-btn" aria-label="Abrir menu" onClick={() => setDrawerOpen(true)}><Menu size={20} /></button>
          <div className="app-brand">
            <LogoTile size={34} />
            <div style={{ minWidth: 0 }}>
              <Wordmark size={15} />
              <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, letterSpacing: "0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tabAtual?.label || "Visão Geral"}</div>
            </div>
          </div>
          <div className="app-month">
            <button className="mbtn" aria-label="Mês anterior" onClick={() => { const d = new Date(year, monthIdx - 1, 1); setMonthIdx(d.getMonth()); setYear(d.getFullYear()); }}><ChevronLeft size={17} /></button>
            <div className="mlabel">{MONTH_NAMES[monthIdx].slice(0, 3)} {year}</div>
            <button className="mbtn" aria-label="Próximo mês" onClick={() => { const d = new Date(year, monthIdx + 1, 1); setMonthIdx(d.getMonth()); setYear(d.getFullYear()); }}><ChevronRight size={17} /></button>
          </div>
          <div className="app-actions">
            <NotificationBell notificacoes={notificacoes} onNavigate={setTab} />
            <button className="icon-btn" aria-label="Meu perfil" onClick={() => setProfileOpen(true)}><CircleUser size={16} /></button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {drawerOpen && (
        <>
          <div className="drawer-scrim" onClick={() => setDrawerOpen(false)} />
          <nav className="drawer" aria-label="Navegação principal">
            <div className="drawer-head">
              <LogoTile size={42} />
              <div className="who">
                <b>{user.nome.split(" ")[0]}</b>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block", maxWidth: 200 }}>{user.email}</span>
              </div>
              <button className="icon-btn" style={{ marginLeft: "auto" }} aria-label="Fechar menu" onClick={() => setDrawerOpen(false)}><X size={16} /></button>
            </div>
            <div className="drawer-body">
              {NAV.map((sec) => (
                <div key={sec.grupo}>
                  <div className="nav-group-label">{sec.grupo}</div>
                  {sec.itens.map((t) => (
                    <button key={t.id} className="nav-item" aria-current={tab === t.id} onClick={() => go(t.id)}>
                      <span className="nic"><TabIcon id={t.id} size={18} /></span>
                      <span className="ntxt"><b>{t.label}</b><span>{t.desc}</span></span>
                    </button>
                  ))}
                </div>
              ))}
              {access?.admin && (
                <div>
                  <div className="nav-group-label">Operação</div>
                  <button className="nav-item" onClick={() => { window.location.href = "/admin"; }}>
                    <span className="nic"><Settings size={18} /></span>
                    <span className="ntxt"><b>Administração</b><span>Console de gestão · /admin</span></span>
                  </button>
                </div>
              )}
            </div>
            <div className="drawer-foot">
              {tabPermitida("lancamentos") && (
                <button className="btn primary" onClick={() => go("lancamentos")}><Plus size={16} /> Novo lançamento</button>
              )}
              <button className="btn ghost" onClick={onLogout} style={{ flex: tabPermitida("lancamentos") ? "0 0 auto" : "1" }}><LogOut size={16} /> Sair</button>
            </div>
          </nav>
        </>
      )}

      <div className="has-dock" style={{ maxWidth: 1040, margin: "0 auto", padding: "18px 12px 64px" }}>
        {avisoGlobal && <div style={{ display: "flex", gap: 10, background: tint(C.accent, 10), border: `1px solid ${tint(C.accent, 28)}`, color: C.subtle, borderRadius: "var(--r-md)", padding: "11px 14px", fontSize: 12.5, marginBottom: 14, lineHeight: 1.5 }}><Sparkles size={15} style={{ flexShrink: 0, color: C.accent, marginTop: 1 }} />{avisoGlobal}</div>}
        {erroSync && <div style={{ display: "flex", gap: 10, background: tint(C.red, 10), border: `1px solid ${tint(C.red, 25)}`, color: C.red, borderRadius: "var(--r-md)", padding: "11px 14px", fontSize: 12, marginBottom: 14 }}><TriangleAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} />{erroSync}</div>}

        <div key={tab} className="tab-fade">
        {tab === "dashboard" && tabPermitida("dashboard") && <DashboardTab income={income} setIncome={setIncome} rendaStr={rendaStr} rendaHerdada={rendaHerdada} salarioVig={salarioVig} totalRenda={totalRenda} rendaNum={rendaNum} extraNum={extraNum} rendaManualNum={rendaManualNum} rendaHoleritesNum={rendaHoleritesNum} extraManualNum={extraManualNum} rendaExtrasMembrosNum={rendaExtrasMembrosNum} membros={membros} holerites={holerites} setHolerites={saveHolerites} rendasExtras={rendasExtras} setRendasExtras={saveRendasExtras} totalDespesas={totalDespesas} despesasLancadas={despesasLancadas} parcelasMensais={parcelasMensais} parcelasCartaoMes={parcelasCartaoMes} faturasCartaoMes={faturasCartaoMes} saldoAtual={saldoAtual} projecao={projecao} pctMes={pctMes} pctGasto={pctGasto} gastoDiario={gastoDiario} statusInfo={statusInfo} porCategoria={porCategoria} totalEmprestimos={totalEmprestimos} parcelVencendoMes={parcelVencendoMes} despesas={despesas} monthIdx={monthIdx} year={year} assinaturas={assinaturas} assinMinMeses={assinMinMeses} onAssinMinMeses={mudarAssinMinMeses} historicoMeses={historicoMeses} setTab={setTab} />}
        {tab === "receitas" && tabPermitida("receitas") && <ReceitasTab totalRenda={totalRenda} rendaNum={rendaNum} extraNum={extraNum} pctMes={pctMes} pctGasto={pctGasto} membros={membros} holerites={holerites} setHolerites={saveHolerites} rendasExtras={rendasExtras} setRendasExtras={saveRendasExtras} monthIdx={monthIdx} year={year} />}
        {tab === "lancamentos" && tabPermitida("lancamentos") && <LancamentosTab despesas={despesas} setDespesasMk={setDespesasMk} membros={membros} />}
        {tab === "extrato" && tabPermitida("extrato") && <ExtratoTab despesas={despesas} setDespesasMk={setDespesasMk} totalDespesas={totalDespesas} cartoes={cartoes} emprestimos={emprestimos} holerites={holerites} rendasExtras={rendasExtras} temReceitas={tabPermitida("receitas")} monthIdx={monthIdx} year={year} setTab={setTab} membros={membros} />}
        {tab === "cartoes" && tabPermitida("cartoes") && <CartoesTab cartoes={cartoes} setCartoes={saveCartoes} cardProfiles={cardProfilesDB} setCardProfiles={saveCardProfiles} cardProfilesImport={cardProfiles} parcelados={parcelados} setParcelados={saveParcelados} categoryRules={categoryRules} setCategoryRules={saveCategoryRules} globalCategoryRules={globalCategoryRules} membros={membros} setMembros={saveMembros} temImportar temAssistente={modulos.includes("assistente")} access={access} year={year} monthIdx={monthIdx} />}
        {tab === "emprestimos" && tabPermitida("emprestimos") && <EmprestimosTab emprestimos={emprestimos} setEmprestimos={saveEmprestimos} membros={membros} />}
        {tab === "investimentos" && tabPermitida("investimentos") && <InvestimentosTab investimentos={investimentos} setInvestimentos={saveInvestimentos} membros={membros} year={year} monthIdx={monthIdx} />}
        {tab === "metas" && tabPermitida("metas") && <MetasTab goals={goals} setGoals={saveGoals} />}
        {tab === "historico" && tabPermitida("historico") && <HistoricoTab historicoMeses={historicoMeses} />}
        {tab === "assistente" && tabPermitida("assistente") && <AssistenteTab chat={chat} setChat={setChat} totalRenda={totalRenda} totalDespesas={totalDespesas} saldoAtual={saldoAtual} projecao={projecao} statusInfo={statusInfo} porCategoria={porCategoria} goals={goals} emprestimos={emprestimos} parcelados={parcelados} parcelasMensais={parcelasMensais} totalEmprestimos={totalEmprestimos} investimentos={investimentos} holerites={holerites} rendasExtras={rendasExtras} monthIdx={monthIdx} year={year} />}
        </div>
      </div>

      {/* Barra inferior (mobile) — destinos principais + novo lançamento.
          O drawer (menu ≡) continua para o resto dos módulos e a conta. */}
      <nav className="dock" aria-label="Navegação rápida">
        {tabPermitida("dashboard") && <button className="dock-nav" aria-current={tab === "dashboard"} onClick={() => go("dashboard")}><TabIcon id="dashboard" size={21} /> Visão</button>}
        {tabPermitida("cartoes") && <button className="dock-nav" aria-current={tab === "cartoes"} onClick={() => go("cartoes")}><TabIcon id="cartoes" size={21} /> Cartões</button>}
        {tabPermitida("lancamentos") && <button className="dock-fab" aria-label="Novo lançamento" onClick={() => go("lancamentos")}><Plus size={24} /></button>}
        {tabPermitida("metas") && <button className="dock-nav" aria-current={tab === "metas"} onClick={() => go("metas")}><TabIcon id="metas" size={21} /> Metas</button>}
        {tabPermitida("historico") && <button className="dock-nav" aria-current={tab === "historico"} onClick={() => go("historico")}><TabIcon id="historico" size={21} /> Histórico</button>}
      </nav>

      {profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} onUpdated={onUserUpdate} membros={membros} onSaveMembros={saveMembrosCascade} access={access} />}
    </div>
  );
}
