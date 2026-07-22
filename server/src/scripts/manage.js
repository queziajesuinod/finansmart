// Gestão de módulos (páginas) e planos via linha de comando.
//
//   npm run manage -- modules:list
//   npm run manage -- module:add <chave> "<Nome>" [ordem]
//   npm run manage -- module:rm  <chave>
//   npm run manage -- plans:list
//   npm run manage -- plan:add <slug> "<Nome>" <precoCentavos> <chave1,chave2,...>
//   npm run manage -- plan:set-modules <slug> <chave1,chave2,...>
//
require("dotenv").config();
const { sequelize, Module, Plan, PlanModule } = require("../models");

async function modulesList() {
  const mods = await Module.findAll({ order: [["ordem", "ASC"]] });
  console.table(mods.map((m) => ({ chave: m.chave, nome: m.nome, ordem: m.ordem })));
}

async function moduleAdd(chave, nome, ordem) {
  if (!chave || !nome) throw new Error('Uso: module:add <chave> "<Nome>" [ordem]');
  const [mod, criado] = await Module.findOrCreate({
    where: { chave },
    defaults: { nome, ordem: Number(ordem) || 0 },
  });
  if (!criado) { mod.nome = nome; if (ordem) mod.ordem = Number(ordem); await mod.save(); }
  console.log(`${criado ? "✅ Módulo criado" : "✏️  Módulo atualizado"}: ${chave} (${nome})`);
}

async function moduleRm(chave) {
  const n = await Module.destroy({ where: { chave } });
  console.log(n ? `🗑️  Módulo removido: ${chave}` : `Módulo não encontrado: ${chave}`);
}

async function plansList() {
  const plans = await Plan.findAll({ include: [{ model: Module, as: "modules" }], order: [["precoCentavos", "ASC"]] });
  for (const p of plans) {
    console.log(`\n• ${p.nome} (${p.slug}) — R$ ${(p.precoCentavos / 100).toFixed(2)}/${p.intervalo}`);
    console.log(`  módulos: ${(p.modules || []).map((m) => m.chave).sort().join(", ") || "(nenhum)"}`);
  }
  console.log();
}

async function linkPlanModules(plan, chaves) {
  const mods = await Module.findAll({ where: { chave: chaves } });
  const achadas = mods.map((m) => m.chave);
  const faltando = chaves.filter((c) => !achadas.includes(c));
  if (faltando.length) console.warn(`⚠️  Chaves ignoradas (módulo inexistente): ${faltando.join(", ")}`);
  await PlanModule.destroy({ where: { planId: plan.id } });
  await PlanModule.bulkCreate(mods.map((m) => ({ planId: plan.id, moduleId: m.id })));
  return achadas;
}

async function planAdd(slug, nome, precoCentavos, chavesCsv) {
  if (!slug || !nome) throw new Error('Uso: plan:add <slug> "<Nome>" <precoCentavos> <chave1,chave2,...>');
  const [plan] = await Plan.findOrCreate({ where: { slug }, defaults: { nome, precoCentavos: Number(precoCentavos) || 0 } });
  plan.nome = nome; plan.precoCentavos = Number(precoCentavos) || 0; await plan.save();
  const chaves = (chavesCsv || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ligadas = await linkPlanModules(plan, chaves);
  console.log(`✅ Plano "${nome}" (${slug}) com ${ligadas.length} módulos: ${ligadas.sort().join(", ")}`);
}

async function planSetModules(slug, chavesCsv) {
  const plan = await Plan.findOne({ where: { slug } });
  if (!plan) throw new Error(`Plano não encontrado: ${slug}`);
  const chaves = (chavesCsv || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ligadas = await linkPlanModules(plan, chaves);
  console.log(`✅ Plano "${plan.nome}" agora tem ${ligadas.length} módulos: ${ligadas.sort().join(", ")}`);
}

const [cmd, ...args] = process.argv.slice(2);
const commands = {
  "modules:list": () => modulesList(),
  "module:add": () => moduleAdd(args[0], args[1], args[2]),
  "module:rm": () => moduleRm(args[0]),
  "plans:list": () => plansList(),
  "plan:add": () => planAdd(args[0], args[1], args[2], args[3]),
  "plan:set-modules": () => planSetModules(args[0], args[1]),
};

(async () => {
  if (!commands[cmd]) {
    console.log("Comandos:\n  " + Object.keys(commands).join("\n  "));
    process.exit(1);
  }
  await sequelize.authenticate();
  await commands[cmd]();
  process.exit(0);
})().catch((err) => { console.error("❌", err.message); process.exit(1); });
