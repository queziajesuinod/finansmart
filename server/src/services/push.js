// Web Push — avisos proativos no celular (fatura vencendo, salário a receber).
//
// A maior parte das notificações do app é calculada no NAVEGADOR (notifications.js),
// pois dependem do estado completo carregado na SPA. O push server-side cobre só os
// gatilhos computáveis a partir dos dados do servidor: datas de fatura e de salário.
// As chaves VAPID são geradas 1x e guardadas em app_settings (JSONB).
const webpush = require("web-push");
const { PushSubscription, Cartao, Holerite } = require("../models");
const { getSetting, setSettings } = require("./settings");

let configured = false;

async function getVapidKeys() {
  let publicKey = await getSetting("vapidPublicKey", null);
  let privateKey = await getSetting("vapidPrivateKey", null);
  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
    await setSettings({ vapidPublicKey: publicKey, vapidPrivateKey: privateKey });
  }
  return { publicKey, privateKey };
}

async function ensureConfigured() {
  if (configured) return;
  const { publicKey, privateKey } = await getVapidKeys();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contato@joseplaneja.aleftec.com.br", publicKey, privateKey);
  configured = true;
}

async function publicKey() {
  return (await getVapidKeys()).publicKey;
}

// Envia um payload a todos os aparelhos do usuário; limpa inscrições mortas (404/410).
async function sendToUser(userId, payload) {
  await ensureConfigured();
  const subs = await PushSubscription.findAll({ where: { userId } });
  const data = JSON.stringify(payload);
  let enviados = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data);
      enviados++;
    } catch (err) {
      if (err && (err.statusCode === 404 || err.statusCode === 410)) await s.destroy();
    }
  }));
  return enviados;
}

// Dias até a próxima ocorrência de um dia-do-mês (0 = hoje).
function diasAte(dia, hoje) {
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  let due = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
  if (dia < hoje.getDate()) due = new Date(hoje.getFullYear(), hoje.getMonth() + 1, dia);
  return Math.round((due - base) / 86400000);
}

// Avisos de push de UM usuário para a data de referência (só dados do servidor).
async function avisosDoUsuario(userId, hoje = new Date()) {
  const [cartoes, holerites] = await Promise.all([
    Cartao.findAll({ where: { userId } }),
    Holerite.findAll({ where: { userId } }),
  ]);
  const out = [];

  // Fatura de cartão vencendo (só as ainda não pagas). Dispara em D-3, D-1 e no dia.
  const vistos = new Set();
  for (const c of cartoes) {
    if (!c.vencimentoDia || c.valorPago != null) continue;
    const chave = `${(c.banco || c.nome || "").toLowerCase()}-${c.vencimentoDia}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const dias = diasAte(c.vencimentoDia, hoje);
    if (dias === 3 || dias === 1 || dias === 0) {
      const quando = dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`;
      out.push({ title: `Fatura ${c.banco || c.nome || ""} vence ${quando}`, body: `A fatura do cartão ${c.nome || c.banco || ""} vence no dia ${c.vencimentoDia}.`, tag: `fatura-${chave}`, url: "/" });
    }
  }

  // Salário / holerite recorrente a receber. Dispara na véspera e no dia.
  const vistosH = new Set();
  for (const h of holerites) {
    if (h.recorrente === false || !h.diaRecebimento) continue;
    const chave = `${h.membroId || "principal"}-${h.diaRecebimento}`;
    if (vistosH.has(chave)) continue;
    vistosH.add(chave);
    const dias = diasAte(h.diaRecebimento, hoje);
    if (dias === 1 || dias === 0) {
      out.push({ title: dias === 0 ? "Dia de salário 💰" : "Salário cai amanhã", body: `Seu salário ${h.titulo ? `(${h.titulo}) ` : ""}cai no dia ${h.diaRecebimento}.`, tag: `salario-${chave}`, url: "/" });
    }
  }
  return out;
}

// Varre todos os usuários com inscrição e envia os avisos do dia. Idempotente no
// sentido do cron diário (o `tag` faz o SO agrupar/atualizar a mesma notificação).
async function runDailyJob({ hoje = new Date() } = {}) {
  await ensureConfigured();
  const subs = await PushSubscription.findAll({ attributes: ["userId"], group: ["userId"] });
  const userIds = [...new Set(subs.map((s) => s.userId))];
  let enviados = 0;
  for (const userId of userIds) {
    const avisos = await avisosDoUsuario(userId, hoje);
    for (const a of avisos) enviados += await sendToUser(userId, a);
  }
  return { usuarios: userIds.length, enviados };
}

module.exports = { publicKey, ensureConfigured, sendToUser, avisosDoUsuario, runDailyJob };
