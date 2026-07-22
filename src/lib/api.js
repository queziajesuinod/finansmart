// @ts-nocheck
// Cliente da API do FinançaSmart. Guarda o JWT no localStorage e converte
// os dados entre o formato do backend e o formato usado pelo frontend.

const API_URL = (import.meta.env && import.meta.env.VITE_API_URL) || "http://127.0.0.1:3333";
const TOKEN_KEY = "finansmart:token";

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }
export const googleLoginUrl = `${API_URL}/auth/google`;

async function request(method, path, body) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* sem corpo */ }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Erro ${res.status}`);
    err.status = res.status;
    err.code = data && data.code;
    err.data = data;
    if (res.status === 401) clearToken();
    throw err;
  }
  return data;
}

// ─── Auth ────────────────────────────────────────────────────
export async function authConfig() {
  try { return await request("GET", "/auth/config"); } catch { return { googleEnabled: false }; }
}
export async function register(payload) {
  const data = await request("POST", "/auth/register", payload);
  setToken(data.token);
  return data; // { token, user, access }
}
export async function login(payload) {
  const data = await request("POST", "/auth/login", payload);
  setToken(data.token);
  return data;
}
export async function me() {
  return request("GET", "/auth/me"); // { user, access }
}
export function updateProfile(payload) { return request("PUT", "/auth/profile", payload); } // { user }
export function changePassword(payload) { return request("POST", "/auth/change-password", payload); }
export function logout() { clearToken(); }

// ─── Estado (dados do domínio) ───────────────────────────────
const numToInput = (n) => (n && Number(n) !== 0 ? String(n) : "");

// Carrega tudo e converte para os formatos que o Dashboard já usa.
export async function getState() {
  const s = await request("GET", "/api/state");

  const incomes = {};
  for (const i of s.incomes || []) {
    incomes[`${i.ano}-${i.mes}`] = { renda: numToInput(i.renda), extra: numToInput(i.extra) };
  }

  const despesas = {};
  for (const d of s.despesas || []) {
    const key = `${d.ano}-${d.mes}`;
    (despesas[key] = despesas[key] || []).push({
      id: d.id, descricao: d.descricao, valor: Number(d.valor) || 0,
      categoria: d.categoria, data: d.data, fixo: !!d.fixo,
    });
  }

  return {
    incomes,
    despesas,
    emprestimos: s.emprestimos || [],
    parcelados: s.parcelados || [],
    cartoes: s.cartoes || [],
    goals: s.goals || [],
    categoryRules: s.categoryRules || {},
    cardProfiles: s.cardProfiles || [],
  };
}

// parse da chave "ano-monthIdx"
function parseKey(key) {
  const [ano, mes] = String(key).split("-");
  return { ano: parseInt(ano, 10), mes: parseInt(mes, 10) };
}

// ─── Saves (replace-all por coleção) ─────────────────────────
export function saveIncomes(map) {
  const arr = Object.entries(map || {}).map(([key, v]) => {
    const { ano, mes } = parseKey(key);
    return { ano, mes, renda: v.renda, extra: v.extra };
  });
  return request("PUT", "/api/incomes", arr);
}

export function saveDespesas(map) {
  const arr = [];
  for (const [key, list] of Object.entries(map || {})) {
    const { ano, mes } = parseKey(key);
    for (const d of list || []) {
      arr.push({ descricao: d.descricao, valor: d.valor, categoria: d.categoria, data: d.data, fixo: d.fixo, ano, mes });
    }
  }
  return request("PUT", "/api/despesas", arr);
}

export function saveEmprestimos(arr) { return request("PUT", "/api/emprestimos", arr || []); }
export function saveParcelados(arr) { return request("PUT", "/api/parcelados", arr || []); }
export function saveCartoes(arr) { return request("PUT", "/api/cartoes", arr || []); }
export function saveGoals(arr) { return request("PUT", "/api/goals", arr || []); }
export function saveCategoryRules(map) { return request("PUT", "/api/category-rules", map || {}); }
export function saveCardProfiles(arr) { return request("PUT", "/api/card-profiles", arr || []); }

// ─── Planos (tela de assinatura) ─────────────────────────────
export function getPlans() { return request("GET", "/plans"); }

// ─── Administração (só para role admin) ──────────────────────
export const admin = {
  modules: () => request("GET", "/admin/modules"),
  moduleCreate: (b) => request("POST", "/admin/modules", b),
  moduleUpdate: (id, b) => request("PUT", `/admin/modules/${id}`, b),
  moduleDelete: (id) => request("DELETE", `/admin/modules/${id}`),
  plans: () => request("GET", "/admin/plans"),
  planCreate: (b) => request("POST", "/admin/plans", b),
  planUpdate: (id, b) => request("PUT", `/admin/plans/${id}`, b),
  planDelete: (id) => request("DELETE", `/admin/plans/${id}`),
  users: () => request("GET", "/admin/users"),
  userGrant: (id, b) => request("POST", `/admin/users/${id}/grant`, b),
  userRevoke: (id) => request("POST", `/admin/users/${id}/revoke`),
  userRole: (id, b) => request("POST", `/admin/users/${id}/role`, b),
};
