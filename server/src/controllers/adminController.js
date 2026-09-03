const { fn, col, literal, Op } = require("sequelize");
const { User, Module, Plan, PlanModule, Subscription, CategoryRule, GlobalCategoryRule, ImportLog, Cartao, Despesa, Parcelado, Emprestimo, Membro, Goal } = require("../models");
const { getVigenteSubscription } = require("../services/access");
const { getAllSettings, setSettings } = require("../services/settings");

// ─── helpers ─────────────────────────────────────────────────
async function setPlanModules(plan, chaves) {
  if (!Array.isArray(chaves)) return;
  const mods = await Module.findAll({ where: { chave: chaves } });
  await PlanModule.destroy({ where: { planId: plan.id } });
  await PlanModule.bulkCreate(mods.map((m) => ({ planId: plan.id, moduleId: m.id })));
}

const planJSON = (p) => ({
  id: p.id, nome: p.nome, slug: p.slug, descricao: p.descricao, precoCentavos: p.precoCentavos,
  precoDependenteCentavos: p.precoDependenteCentavos,
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
    const { nome, slug, descricao, precoCentavos, precoDependenteCentavos, intervalo, moduloChaves } = req.body || {};
    if (!nome?.trim() || !slug?.trim()) return res.status(400).json({ error: "Informe nome e slug.", code: "missing_fields" });
    const plan = await Plan.create({
      nome: nome.trim(), slug: slug.trim(), descricao: descricao || null,
      precoCentavos: Number(precoCentavos) || 0, precoDependenteCentavos: Number(precoDependenteCentavos) || 0,
      intervalo: intervalo === "year" ? "year" : "month",
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
    const { nome, descricao, precoCentavos, precoDependenteCentavos, intervalo, ativo, moduloChaves } = req.body || {};
    if (nome !== undefined) plan.nome = nome;
    if (descricao !== undefined) plan.descricao = descricao;
    if (precoCentavos !== undefined) plan.precoCentavos = Number(precoCentavos) || 0;
    if (precoDependenteCentavos !== undefined) plan.precoDependenteCentavos = Number(precoDependenteCentavos) || 0;
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
// Lista com busca, filtros (status/plano/papel) e paginação. Como o "status" e o
// "plano" dependem da assinatura vigente (calculada), filtramos por eles em memória.
async function listUsers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(5, parseInt(req.query.pageSize, 10) || 15));
    const q = String(req.query.q || "").trim().toLowerCase();
    const role = req.query.role;       // "admin" | "cliente"
    const status = req.query.status;   // "liberado" | "pendente" | "sem"
    const plano = req.query.plano;     // slug

    const where = {};
    if (role === "admin" || role === "cliente") where.role = role;
    const users = await User.findAll({ where, order: [["createdAt", "DESC"]] });

    const enriched = [];
    for (const u of users) {
      const sub = await getVigenteSubscription(u.id);
      const liberado = sub ? sub.estaLiberada() : false;
      const st = liberado ? "liberado" : (sub ? "pendente" : "sem");
      enriched.push({ u, sub, liberado, st });
    }
    let filtered = enriched;
    if (q) filtered = filtered.filter(({ u }) => `${u.nome} ${u.email} ${u.telefone || ""}`.toLowerCase().includes(q));
    if (["liberado", "pendente", "sem"].includes(status)) filtered = filtered.filter((x) => x.st === status);
    if (plano) filtered = filtered.filter((x) => x.sub && x.sub.plan && x.sub.plan.slug === plano);

    const total = filtered.length;
    const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
    res.json({
      page, pageSize, total,
      users: rows.map(({ u, sub, liberado }) => ({
        id: u.id, nome: u.nome, email: u.email, role: u.role, ativo: u.ativo, createdAt: u.createdAt, telefone: u.telefone,
        subscription: sub ? { status: sub.status, liberado, plano: sub.plan ? sub.plan.nome : null, planoSlug: sub.plan ? sub.plan.slug : null, currentPeriodEnd: sub.currentPeriodEnd } : null,
      })),
    });
  } catch (e) { next(e); }
}

// Detalhe de um usuário: contagens do domínio + histórico de assinaturas.
async function userDetail(req, res, next) {
  try {
    const u = await User.findByPk(req.params.id);
    if (!u) return res.status(404).json({ error: "Usuário não encontrado.", code: "not_found" });
    const w = { where: { userId: u.id } };
    const [cartoes, despesas, parcelados, emprestimos, membros, goals, subs] = await Promise.all([
      Cartao.count(w), Despesa.count(w), Parcelado.count(w), Emprestimo.count(w), Membro.count(w), Goal.count(w),
      Subscription.findAll({ where: { userId: u.id }, include: [{ model: Plan, as: "plan" }], order: [["createdAt", "DESC"]], limit: 12 }),
    ]);
    res.json({
      id: u.id, nome: u.nome, email: u.email, telefone: u.telefone, cpf: u.cpf, role: u.role, ativo: u.ativo, createdAt: u.createdAt,
      counts: { cartoes, despesas, parcelados, emprestimos, membros, goals },
      subscriptions: subs.map((s) => ({ status: s.status, plano: s.plan ? s.plan.nome : null, criadaEm: s.createdAt, currentPeriodEnd: s.currentPeriodEnd, canceladaEm: s.canceladaEm })),
    });
  } catch (e) { next(e); }
}

// ─── VISÃO GERAL (negócio) ───────────────────────────────────
async function overview(req, res, next) {
  try {
    const now = new Date();
    const em7 = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const [usuariosTotal, novosMes, subs] = await Promise.all([
      User.count(),
      User.count({ where: { createdAt: { [Op.gte]: inicioMes } } }),
      Subscription.findAll({ where: { status: ["active", "trialing"] }, include: [{ model: Plan, as: "plan" }, { model: User, as: "user", attributes: ["nome", "email"] }] }),
    ]);
    const ativas = subs.filter((s) => s.estaLiberada());
    // MRR estimado = soma dos preços base dos planos ativos (anual → /12). Não inclui
    // dependentes (aproximação; o preço por dependente varia por conta).
    let mrrCentavos = 0;
    for (const s of ativas) {
      const p = s.plan; if (!p) continue;
      mrrCentavos += p.intervalo === "year" ? Math.round((p.precoCentavos || 0) / 12) : (p.precoCentavos || 0);
    }
    const expirando = ativas
      .filter((s) => s.currentPeriodEnd && new Date(s.currentPeriodEnd) <= em7)
      .sort((a, b) => new Date(a.currentPeriodEnd) - new Date(b.currentPeriodEnd))
      .slice(0, 20)
      .map((s) => ({ usuario: s.user ? (s.user.nome || s.user.email) : "—", email: s.user ? s.user.email : "", plano: s.plan ? s.plan.nome : null, em: s.currentPeriodEnd }));

    const growth = [];
    for (let i = 5; i >= 0; i--) {
      const ini = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const fim = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const n = await User.count({ where: { createdAt: { [Op.gte]: ini, [Op.lt]: fim } } });
      growth.push({ mes: `${ini.getFullYear()}-${String(ini.getMonth() + 1).padStart(2, "0")}`, novos: n });
    }
    res.json({ usuariosTotal, novosMes, assinaturasAtivas: ativas.length, mrrCentavos, expirando, growth });
  } catch (e) { next(e); }
}

// ─── CONFIGURAÇÕES DO SISTEMA ────────────────────────────────
async function getSettings(req, res, next) {
  try {
    const s = await getAllSettings();
    const planos = await Plan.findAll({ where: { ativo: true }, attributes: ["slug", "nome"], order: [["nome", "ASC"]] });
    res.json({
      settings: {
        planoPadrao: s.planoPadrao || process.env.DEFAULT_PLAN_SLUG || "completo",
        iaImportAtiva: s.iaImportAtiva !== false,
        avisoGlobal: s.avisoGlobal || "",
        cobrancaAtiva: s.cobrancaAtiva == null ? (process.env.BILLING_ENABLED === "true") : s.cobrancaAtiva === true,
        trialDias: s.trialDias != null ? Number(s.trialDias) || 0 : 0,
        cadastroPublico: s.cadastroPublico !== false,
      },
      planos: planos.map((p) => ({ slug: p.slug, nome: p.nome })),
    });
  } catch (e) { next(e); }
}
async function putSettings(req, res, next) {
  try {
    const b = req.body || {};
    const patch = {};
    if (b.planoPadrao !== undefined) patch.planoPadrao = String(b.planoPadrao || "").trim() || null;
    if (b.iaImportAtiva !== undefined) patch.iaImportAtiva = b.iaImportAtiva !== false;
    if (b.avisoGlobal !== undefined) patch.avisoGlobal = String(b.avisoGlobal || "").slice(0, 400);
    if (b.cobrancaAtiva !== undefined) patch.cobrancaAtiva = b.cobrancaAtiva === true;
    if (b.trialDias !== undefined) patch.trialDias = Math.max(0, Math.min(365, parseInt(b.trialDias, 10) || 0));
    if (b.cadastroPublico !== undefined) patch.cadastroPublico = b.cadastroPublico !== false;
    await setSettings(patch);
    res.json({ ok: true });
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

// ─── ANÁLISE DE IMPORTAÇÕES ──────────────────────────────────
// Agrega o que os clientes tiveram que corrigir (regras de categoria), a qualidade
// do parser por banco (via import_logs) e as regras globais já ativas.
async function listImports(req, res, next) {
  try {
    // Resiliente: se as migrações 030/031 ainda não rodaram, degrada p/ vazio em
    // vez de derrubar o painel inteiro.
    let globais = [];
    try { globais = await GlobalCategoryRule.findAll({ order: [["chave", "ASC"]] }); } catch { globais = []; }
    const globalKeys = new Set(globais.map((g) => g.chave));

    // Candidatos: regras PESSOAIS agregadas (comerciante → categoria) entre todos.
    const rows = await CategoryRule.findAll({
      attributes: ["chave", "categoria", [fn("COUNT", literal('DISTINCT "userId"')), "usuarios"]],
      group: ["chave", "categoria"], raw: true,
    });
    const porChave = {};
    for (const r of rows) {
      const u = Number(r.usuarios) || 0;
      const cur = porChave[r.chave];
      if (!cur) porChave[r.chave] = { chave: r.chave, categoria: r.categoria, usuarios: u, total: u, divergente: false };
      else {
        cur.total += u;
        if (u > cur.usuarios) { cur.categoria = r.categoria; cur.usuarios = u; }
        cur.divergente = true; // usuários discordam da categoria p/ o mesmo comerciante
      }
    }
    const candidatos = Object.values(porChave)
      .filter((c) => !globalKeys.has(c.chave))
      .sort((a, b) => b.usuarios - a.usuarios || b.total - a.total)
      .slice(0, 100);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(5, parseInt(req.query.pageSize, 10) || 10));

    // Agregação por banco (todos os logs) + logs paginados. Resiliente à tabela ausente.
    let porBanco = [], logRows = [], logsTotal = 0;
    try {
      const bancoRows = await ImportLog.findAll({
        attributes: [
          "banco",
          [fn("COUNT", col("id")), "importacoes"],
          [fn("SUM", col("itensConfirmados")), "itens"],
          [fn("SUM", col("categoriasCorrigidas")), "corrigidas"],
          [fn("SUM", literal('CASE WHEN "teveEstorno" THEN 1 ELSE 0 END')), "estornos"],
        ],
        group: ["banco"], raw: true,
      });
      porBanco = bancoRows
        .map((r) => ({ banco: r.banco || "—", importacoes: Number(r.importacoes) || 0, itens: Number(r.itens) || 0, corrigidas: Number(r.corrigidas) || 0, estornos: Number(r.estornos) || 0 }))
        .sort((a, b) => b.importacoes - a.importacoes);

      const res2 = await ImportLog.findAndCountAll({
        include: [{ model: User, as: "user", attributes: ["nome", "email"] }],
        order: [["createdAt", "DESC"]], limit: pageSize, offset: (page - 1) * pageSize,
      });
      logRows = res2.rows; logsTotal = res2.count;
    } catch { porBanco = []; logRows = []; logsTotal = 0; }

    res.json({
      globais: globais.map((g) => ({ id: g.id, chave: g.chave, categoria: g.categoria })),
      candidatos, porBanco, page, pageSize, logsTotal,
      logs: logRows.map((l) => ({
        id: l.id, banco: l.banco, mesRef: l.mesRef, fonte: l.fonte,
        usuario: l.user ? (l.user.nome || l.user.email) : "—", email: l.user ? l.user.email : "",
        itensParsed: l.itensParsed, itensConfirmados: l.itensConfirmados, itensRemovidos: l.itensRemovidos,
        parcelas: l.parcelas, categoriasCorrigidas: l.categoriasCorrigidas,
        totalDetectado: l.totalDetectado == null ? null : Number(l.totalDetectado), totalUsado: l.totalUsado == null ? null : Number(l.totalUsado),
        teveEstorno: l.teveEstorno, correcoes: Array.isArray(l.correcoes) ? l.correcoes : [], criadoEm: l.createdAt,
      })),
    });
  } catch (err) { next(err); }
}

async function promoteGlobalRule(req, res, next) {
  try {
    const chave = String(req.body.chave || "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 60);
    const categoria = String(req.body.categoria || "").trim();
    if (!chave || !categoria) return res.status(400).json({ error: "Informe comerciante e categoria." });
    const [rule] = await GlobalCategoryRule.findOrCreate({ where: { chave }, defaults: { categoria, criadoPor: req.user.id } });
    if (rule.categoria !== categoria) { rule.categoria = categoria; await rule.save(); }
    res.json({ id: rule.id, chave: rule.chave, categoria: rule.categoria });
  } catch (err) { next(err); }
}

async function deleteGlobalRule(req, res, next) {
  try { await GlobalCategoryRule.destroy({ where: { id: req.params.id } }); res.json({ ok: true }); }
  catch (err) { next(err); }
}

module.exports = {
  listModules, createModule, updateModule, deleteModule,
  listPlans, createPlan, updatePlan, deletePlan,
  listUsers, userDetail, grantUser, revokeUser, setRole,
  listImports, promoteGlobalRule, deleteGlobalRule,
  overview, getSettings, putSettings,
};
