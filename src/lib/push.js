// @ts-nocheck
// Web Push no cliente: detecta suporte, assina no PushManager com a chave VAPID
// do servidor e sincroniza a inscrição com o backend. O service worker (sw.js)
// é quem exibe a notificação quando ela chega.
import { pushVapidKey, pushSubscribe, pushUnsubscribe } from "./api";

export function pushSupported() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

// VAPID key (base64url) → Uint8Array exigido pelo PushManager.
function urlB64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Em dev o SW não é registrado (só em PROD) — getRegistration evita travar no ready.
async function getRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) || null;
}

// Estados: unsupported | denied | unavailable (SW não registrado, ex: dev) | on | off
export async function pushStatus() {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await getRegistration();
  if (!reg) return "unavailable";
  const sub = await reg.pushManager.getSubscription();
  return sub ? "on" : "off";
}

export async function enablePush() {
  if (!pushSupported()) throw new Error("Notificações não são suportadas neste navegador.");
  const reg = await getRegistration();
  if (!reg) throw new Error("As notificações funcionam no app publicado (PWA). Abra pela versão instalada/publicada.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permissão de notificações negada.");
  const { key } = await pushVapidKey();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(key) });
  const json = sub.toJSON(); // { endpoint, keys: { p256dh, auth } }
  await pushSubscribe({ endpoint: json.endpoint, keys: json.keys });
}

export async function disablePush() {
  const reg = await getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  try { await sub.unsubscribe(); } catch { /* ignore */ }
  try { await pushUnsubscribe(endpoint); } catch { /* ignore */ }
}
