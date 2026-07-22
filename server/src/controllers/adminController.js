const { User, Module, Plan, PlanModule, Subscription } = require("../models");
const { getVigenteSubscription } = require("../services/access");

// ─── helpers ─────────────────────────────────────────────────
async function setPlanModules(plan, chaves) {
  if (!Array.isArray(chaves)) return;
  const mods = await Module.findAll({ where: { chave: chaves } });
  await PlanModule.destroy({ where: { planId: plan.id } });
  await PlanModule.bulkCreate(mods.map((m) => ({ planId: plan.id, moduleId: m.id })));
}

const planJSON = (p) => ({
  id: p.id, nome: p.nome, slug: p.slug, descricao: p.descricao, precoCentavos: p.precoCentavos,
  intervalo: p.intervalo, ativo: p.ativo, modulos: (p.modules || []).map((m) => m.chave).sort(),
});

// ─── MÓDULOS ─────────────────────────────────────────────────
async function listModules(req, res, next) {
  try {
    const mods = await Module.findAll({ order: [["ordem", "ASC"]] });
    res.json(mods.map((m) => ({ id: m.id, chave: m.chave, nome: m.nome, descricao: m.descricao, ordem: m.ordem })));
  } catch (e) { next(e); }
}
async function createModule(req, res, next) {
  try {
    const { chave, nome, descricao, ordem } = req.body || {};
    if (!chave?.trim() || !nome?.trim()) return res.status(400).json({ error: "Informe chave e nome.", code: "missing_fields" });
    const mod = await Module.create({ chave: chave.trim(), nome: nome.trim(), descricao: descricao || null, ordem: Number(ordem) || 0 });
    res.status(201).json({ id: mod.id, chave: mod.chave, nome: mod.nome, descricao: mod.descricao, ordem: mod.ordem });
  } catch (e) { next(e); }
}
async function updateModule(req, res, next) {
  try {
    const mod = await Module.findByPk(req.params.id);
    if (!mod) return res.status(404).json({ error: "Módulo não encontrado.", code: "not_found" });
    const { nome, descricao, ordem } = req.body || {};
    if (nome !== undefined) mod.nome = nome;
    if (descricao !== undefined) mod.descricao = descricao;
    if (ordem !== undefined) mod.ordem = Number(ordem) || 0;
    await mod.save();
    res.json({ id: mod.id, chave: mod.chave, nome: mod.nome, descricao: mod.descricao, ordem: mod.ordem });
  } catch (e) { next(e); }
}
async function deleteModule(req, res, next) {
  try {
    const n = await Module.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ error: "Módulo não encontrado.", code: "not_found" });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// ─── PLANOS ──────────────────────────────────────────────────
async function listPlans(req, res, next) {
  try {
    const plans = await Plan.findAll({ include: [{ model: Module, as: "modules", through: { attributes: [] } }], order: [["precoCentavos", "ASC"]] });
    res.json(plans.map(planJSON));
  } catch (e) { next(e); }
}
async function createPlan(req, res, next) {
  try {
    const { nome, slug, descricao, precoCentavos, intervalo, moduloChaves } = req.body || {};
    if (!nome?.trim() || !slug?.trim()) return res.status(400).json({ error: "Informe nome e slug.", code: "missing_fields" });
    const plan = await Plan.create({
      nome: nome.trim(), slug: slug.trim(), descricao: descricao || null,
      precoCentavos: Number(precoCentavos) || 0, intervalo: intervalo === "year" ? "year" : "month",
    });
    await setPlanModules(plan, moduloChaves);
    const full = await Plan.findByPk(plan.id, { include: [{ model: Module, as: "modules" }] });
    res.status(201).json(planJSON(full));
  } catch (e) { next(e); }
}
async function updatePlan(req, res, next) {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plano não encontrado.", code: "not_found" });
    const { nome, descricao, precoCentavos, intervalo, ativo, moduloChaves } = req.body || {};
    if (nome !== undefined) plan.nome = nome;
    if (descricao !== undefined) plan.descricao = descricao;
    if (precoCentavos !== undefined) plan.precoCentavos = Number(precoCentavos) || 0;
    if (intervalo !== undefined) plan.intervalo = intervalo === "year" ? "year" : "month";
    if (ativo !== undefined) plan.ativo = Boolean(ativo);
    await plan.save();
    if (moduloChaves !== undefined) await setPlanModules(plan, moduloChaves);
    const full = await Plan.findByPk(plan.id, { include: [{ model: Module, as: "modules" }] });
    res.json(planJSON(full));
  } catch (e) { next(e); }
}
async function deletePlan(req, res, next) {
  try {
    const n = await Plan.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ error: "Plano não encontrado.", code: "not_found" });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// ─── USUÁRIOS ────────────────────────────────────────────────
async function listUsers(req, res, next) {
  try {
    const users = await User.findAll({ order: [["createdAt", "DESC"]] });
    const out = [];
    for (const u of users) {
      const sub = await getVigenteSubscription(u.id);
      out.push({
        id: u.id, nome: u.nome, email: u.email, role: u.role, ativo: u.ativo, createdAt: u.createdAt,
        cpf: u.cpf, telefone: u.telefone,
        subscription: sub ? { status: sub.status, liberado: sub.estaLiberada(), plano: sub.plan ? sub.plan.nome : null, currentPeriodEnd: sub.currentPeriodEnd } : null,
      });
    }
    res.json(out);
  } catch (e) { next(e); }
}
async function grantUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado.", code: "not_found" });
    const { planSlug, dias } = req.body || {};
    const plan = await Plan.findOne({ where: { slug: planSlug } });
    if (!plan) return res.status(400).json({ error: "Plano inválido.", code: "invalid_plan" });
    const fim = new Date();
    fim.setDate(fim.getDate() + (Number(dias) || 30));
    // cancela assinaturas ativas anteriores e cria uma nova
    await Subscription.update({ status: "canceled", canceladaEm: new Date() }, { where: { userId: user.id, status: ["active", "trialing"] } });
    const sub = await Subscription.create({ userId: user.id, planId: plan.id, status: "active", currentPeriodEnd: fim });
    res.json({ ok: true, subscriptionId: sub.id, status: sub.status, plano: plan.nome, currentPeriodEnd: fim });
  } catch (e) { next(e); }
}
async function revokeUser(req, res, next) {
  try {
    const n = await Subscription.update({ status: "canceled", canceladaEm: new Date() }, { where: { userId: req.params.id, status: ["active", "trialing"] } });
    res.json({ ok: true, canceladas: n[0] });
  } catch (e) { next(e); }
}
async function setRole(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado.", code: "not_found" });
    const { role } = req.body || {};
    if (!["admin", "cliente"].includes(role)) return res.status(400).json({ error: "Role inválido.", code: "invalid_role" });
    user.role = role;
    await user.save();
    res.json({ ok: true, role: user.role });
  } catch (e) { next(e); }
}

module.exports = {
  listModules, createModule, updateModule, deleteModule,
  listPlans, createPlan, updatePlan, deletePlan,
  listUsers, grantUser, revokeUser, setRole,
};
