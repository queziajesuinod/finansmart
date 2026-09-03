// Configurações globais do sistema (app_settings). Resiliente: se a tabela ainda
// não existe (migração 032 não rodou), degrada para os defaults em vez de quebrar.
const { AppSetting } = require("../models");

async function getAllSettings() {
  try {
    const rows = await AppSetting.findAll();
    return Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
  } catch { return {}; }
}

async function getSetting(chave, fallback = null) {
  try {
    const r = await AppSetting.findByPk(chave);
    return r && r.valor != null ? r.valor : fallback;
  } catch { return fallback; }
}

async function setSettings(obj) {
  for (const [chave, valor] of Object.entries(obj || {})) {
    await AppSetting.upsert({ chave, valor });
  }
  return getAllSettings();
}

module.exports = { getAllSettings, getSetting, setSettings };
