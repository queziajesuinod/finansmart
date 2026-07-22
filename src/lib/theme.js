// @ts-nocheck
// Tema claro/escuro. Sem escolha explícita = segue o sistema.
const KEY = "jp:theme";

export function initTheme() {
  const t = localStorage.getItem(KEY);
  if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t);
}

export function currentTheme() {
  const s = document.documentElement.getAttribute("data-theme");
  if (s === "dark" || s === "light") return s;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setTheme(t) {
  const root = document.documentElement;
  if (t === "system") { root.removeAttribute("data-theme"); localStorage.removeItem(KEY); }
  else { root.setAttribute("data-theme", t); localStorage.setItem(KEY, t); }
}

export function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
