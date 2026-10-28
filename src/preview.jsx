// @ts-nocheck
// Harness de verificação visual (impeccable) — monta o Dashboard REAL com dados
// simulados, sem backend. A API falha de propósito e o shell renderiza assim
// mesmo (o Dashboard trata o erro e segue). Usado só para screenshots.
import { createRoot } from "react-dom/client";
import "./index.css";

const params = new URLSearchParams(location.search);
const theme = params.get("theme");
if (theme) document.documentElement.setAttribute("data-theme", theme);

// Stub da API para o harness: devolve um estado realista em /api/state sem
// backend, para os screenshots mostrarem o app com dados de verdade.
const MOCK_STATE = {
  revs: {},
  incomes: [],
  holerites: [{ id: 1, membroId: null, titulo: "Salário", mesRef: "2026-01", recorrente: true, diaRecebimento: 5, salarioBruto: 9800, descontos: [{ nome: "INSS", valor: 980 }, { nome: "IRRF", valor: 620 }], outrosRendimentos: [{ nome: "Vale-refeição", valor: 800 }] }],
  rendasExtras: [{ id: 1, membroId: null, titulo: "Freela design", valor: 1200, mesRef: "2026-10", recorrente: false, data: "2026-10-14" }],
  despesas: [
    { id: 1, descricao: "Aluguel", valor: 2200, categoria: "moradia", data: "2026-10-10", ano: 2026, mes: 9 },
    { id: 2, descricao: "Supermercado", valor: 862.4, categoria: "alimentacao", data: "2026-10-05", ano: 2026, mes: 9 },
    { id: 3, descricao: "Uber", valor: 184.5, categoria: "transporte", data: "2026-10-12", ano: 2026, mes: 9 },
    { id: 4, descricao: "Farmácia", valor: 132.7, categoria: "saude", data: "2026-10-15", ano: 2026, mes: 9 },
    { id: 5, descricao: "Cinema", valor: 96, categoria: "lazer", data: "2026-10-18", ano: 2026, mes: 9 },
    { id: 6, descricao: "Streaming", valor: 55.9, categoria: "assinaturas", data: "2026-10-02", ano: 2026, mes: 9 },
  ],
  parcelados: [], membros: [],
  emprestimos: [
    { id: 1, instituicao: "Caixa", contrato: "CEF-00482", sistema: "PRICE", valorContratado: 40000, taxa: 1.49, taxaPeriodo: "mensal", dataContratacao: "2024-02-10", dataPrimeira: "2024-03-10", dataQuitacao: "2028-02-10", diaVencimento: 10, parcelas: 48, pago: 0, pagoAuto: true, membroId: null, amortizacoes: [], pagamentosParcelas: { "1": "2024-03-08", "2": "2024-04-12", "3": "2024-05-10" } },
  ],
  goals: [
    { id: 1, nome: "Reserva de emergência", alvo: 30000, atual: 18500, prazo: "2027-06-30" },
    { id: 2, nome: "Viagem Europa", alvo: 15000, atual: 4200, prazo: "2027-12-20" },
  ],
  investimentos: [
    { id: 1, instituicao: "Nubank", nome: "Caixinha Turbo", tipo: "RF", indexador: "CDI", percentual: 100, valorAplicado: 15000, dataAplicacao: "2025-03-10", membroId: null, historico: [{ mesRef: "2026-10", saldo: 16820 }] },
    { id: 2, instituicao: "XP Investimentos", nome: "Tesouro Selic 2029", tipo: "RF", indexador: "SELIC", percentual: 100, valorAplicado: 8000, dataAplicacao: "2025-08-01", membroId: null, historico: [{ mesRef: "2026-10", saldo: 8540 }] },
    { id: 3, instituicao: "Tesouro Direto", nome: "Aporte mensal", tipo: "RF", indexador: "SELIC", percentual: 100, valorAplicado: 500, dataAplicacao: "2026-02-01", membroId: null, debita: true, recorrente: true, historico: [{ mesRef: "2026-10", saldo: 4600 }] },
  ],
  cartoes: [{
    id: 1, nome: "Nubank Ultravioleta", banco: "Nubank", mesRef: "2026-9",
    total: 2847.6, limite: 12000, vencimentoDia: 12, valorPago: null, criadoEm: "2026-10-01",
    compras: [
      { id: 1, descricao: "Amazon.com.br", valor: 289.9, categoria: "outros", data: "2026-10-03", parcelas: 1 },
      { id: 2, descricao: "Posto Shell", valor: 210.0, categoria: "transporte", data: "2026-10-06", parcelas: 1 },
      { id: 3, descricao: "iFood", valor: 87.5, categoria: "alimentacao", data: "2026-10-08", parcelas: 1 },
      { id: 4, descricao: "Drogasil", valor: 64.2, categoria: "saude", data: "2026-10-09", parcelas: 1 },
    ],
  }],
  categoryRules: {}, globalCategoryRules: {},
  cardProfiles: [{ id: 1, nome: "Nubank Ultravioleta", banco: "Nubank", limite: "12000", vencimentoDia: 12, fechamentoDia: 4, finais: "4291" }],
  avisoGlobal: "Dica: cadastre seus cartões para importar faturas automaticamente e acompanhar o saldo devedor.",
};
if (params.get("data") !== "0") {
  const real = window.fetch;
  window.fetch = (url, opt) => {
    const u = String(url);
    if (u.includes("/api/state")) return Promise.resolve(new Response(JSON.stringify(MOCK_STATE), { status: 200, headers: { "Content-Type": "application/json" } }));
    if (u.includes("/api/")) return Promise.resolve(new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }));
    return real(url, opt);
  };
}

const Dashboard = (await import("./components/Dashboard.jsx")).default;
const AdminTab = (await import("./components/tabs/AdminTab.jsx")).default;
const ProfileModal = (await import("./components/ProfileModal.jsx")).default;
const { LoadingScreen } = await import("./components/Logo.jsx");

const user = { nome: "Ana Souza", email: "ana.souza@email.com" };
const access = {
  liberado: true,
  admin: true,
  modulos: ["dashboard", "lancamentos", "extrato", "cartoes", "emprestimos", "investimentos", "metas", "historico", "assistente"],
};

const root = createRoot(document.getElementById("root"));
const view = params.get("view");
if (view === "loading") {
  root.render(<LoadingScreen text="Carregando seus dados..." />);
} else if (view === "profile") {
  root.render(<ProfileModal user={user} access={access} membros={[]} onClose={() => {}} onUpdated={() => {}} onSaveMembros={() => {}} />);
} else if (view === "admin") {
  root.render(<AdminTab user={user} onBack={() => {}} onLogout={() => {}} />);
} else {
  root.render(<Dashboard user={user} access={access} onLogout={() => {}} onUserUpdate={() => {}} initialTab={params.get("tab") || "dashboard"} />);
}

// Abre o drawer automaticamente para o screenshot quando ?drawer=1.
if (params.get("drawer")) {
  setTimeout(() => { (document.querySelector(".menu-btn") || document.querySelector(".ad-menu-btn"))?.click(); }, 400);
}
// Abre o painel de notificações quando ?notif=1.
if (params.get("notif")) {
  setTimeout(() => { document.querySelector('button[aria-label="Notificações"]')?.click(); }, 500);
}
// Abre o form de amortização do 1º empréstimo quando ?amort=1.
if (params.get("amort")) {
  setTimeout(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Amortizar")?.click(); }, 500);
}
// Abre a tabela do 1º empréstimo quando ?tabela=1.
if (params.get("tabela")) {
  setTimeout(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Ver tabela")?.click(); }, 500);
}
