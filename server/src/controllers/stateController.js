const { sequelize, Income, Despesa, Emprestimo, Parcelado, Cartao, Compra, Goal, CategoryRule, CardProfile } = require("../models");

// ─── helpers ─────────────────────────────────────────────────
const num = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const int = (v) => Math.trunc(num(v));
const dateOrNull = (v) => (v ? String(v).slice(0, 10) : null);
const bool = (v) => Boolean(v);

// ─── GET /api/state — carrega tudo do usuário em uma chamada ──
async function getState(req, res, next) {
  try {
    const userId = req.user.id;
    const [incomes, despesas, emprestimos, parcelados, cartoes, goals, rules, profiles] = await Promise.all([
      Income.findAll({ where: { userId } }),
      Despesa.findAll({ where: { userId } }),
      Emprestimo.findAll({ where: { userId } }),
      Parcelado.findAll({ where: { userId } }),
      Cartao.findAll({ where: { userId }, include: [{ model: Compra, as: "compras" }] }),
      Goal.findAll({ where: { userId } }),
      CategoryRule.findAll({ where: { userId } }),
      CardProfile.findAll({ where: { userId }, order: [["nome", "ASC"]] }),
    ]);

    res.json({
      incomes: incomes.map((i) => ({ ano: i.ano, mes: i.mes, renda: num(i.renda), extra: num(i.extra) })),
      despesas: despesas.map((d) => ({ id: d.id, descricao: d.descricao, valor: num(d.valor), categoria: d.categoria, data: d.data, fixo: d.fixo, ano: d.ano, mes: d.mes })),
      emprestimos: emprestimos.map((e) => ({
        id: e.id, instituicao: e.instituicao, contrato: e.contrato, valorContratado: num(e.valorContratado),
        taxa: num(e.taxa), parcelas: e.parcelas, pago: e.pago, pagoAuto: e.pagoAuto,
        dataContratacao: e.dataContratacao, dataPrimeira: e.dataPrimeira, dataQuitacao: e.dataQuitacao,
      })),
      parcelados: parcelados.map((p) => ({
        id: p.id, descricao: p.descricao, valorTotal: num(p.valorTotal), totalParcelas: p.totalParcelas,
        parcelaAtual: p.parcelaAtual, valorParcela: num(p.valorParcela), dataCompra: p.dataCompra,
        categoria: p.categoria, origem: p.origem, cartaoId: p.cartaoId,
      })),
      cartoes: cartoes.map((c) => ({
        id: c.id, banco: c.banco, nome: c.nome, limite: num(c.limite), vencimentoDia: c.vencimentoDia,
        vencimento: c.vencimento, mesRef: c.mesRef, total: num(c.total), somaCompras: num(c.somaCompras),
        portadores: c.portadores || [],
        compras: (c.compras || []).map((x) => ({ id: x.id, descricao: x.descricao, valor: num(x.valor), data: x.data, categoria: x.categoria, parcelas: x.parcelas, parcelaAtual: x.parcelaAtual, portador: x.portador, final: x.final })),
      })),
      goals: goals.map((g) => ({ id: g.id, nome: g.nome, alvo: num(g.alvo), atual: num(g.atual), prazo: g.prazo })),
      categoryRules: Object.fromEntries(rules.map((r) => [r.chave, r.categoria])),
      cardProfiles: profiles.map((p) => ({ id: p.id, nome: p.nome, banco: p.banco, bandeira: p.bandeira, limite: num(p.limite), vencimentoDia: p.vencimentoDia, finais: p.finais, ativo: p.ativo })),
    });
  } catch (err) {
    next(err);
  }
}

// ─── PUT genérico "replace-all" por coleção ──────────────────
// O frontend mantém a coleção inteira em memória e a reenvia a cada mudança;
// aqui apagamos e recriamos dentro de uma transação.
function replaceAll(Model, mapRow) {
  return async (req, res, next) => {
    const userId = req.user.id;
    const items = Array.isArray(req.body) ? req.body : [];
    const t = await sequelize.transaction();
    try {
      await Model.destroy({ where: { userId }, transaction: t });
      const rows = items.map((it) => ({ ...mapRow(it), userId }));
      if (rows.length) await Model.bulkCreate(rows, { transaction: t });
      await t.commit();
      res.json({ ok: true, total: rows.length });
    } catch (err) {
      await t.rollback();
      next(err);
    }
  };
}

const putIncomes = replaceAll(Income, (i) => ({ ano: int(i.ano), mes: int(i.mes), renda: num(i.renda), extra: num(i.extra) }));

const putDespesas = replaceAll(Despesa, (d) => ({
  descricao: d.descricao, valor: num(d.valor), categoria: d.categoria || "outros",
  data: dateOrNull(d.data), ano: int(d.ano), mes: int(d.mes), fixo: bool(d.fixo),
}));

const putEmprestimos = replaceAll(Emprestimo, (e) => ({
  instituicao: e.instituicao, contrato: e.contrato || null, valorContratado: num(e.valorContratado),
  taxa: num(e.taxa), parcelas: int(e.parcelas), pago: int(e.pago), pagoAuto: bool(e.pagoAuto),
  dataContratacao: dateOrNull(e.dataContratacao), dataPrimeira: dateOrNull(e.dataPrimeira), dataQuitacao: dateOrNull(e.dataQuitacao),
}));

// cartaoId é ignorado no persist (referência vem de ids do frontend, não UUIDs).
const putParcelados = replaceAll(Parcelado, (p) => ({
  descricao: p.descricao, valorTotal: num(p.valorTotal), totalParcelas: int(p.totalParcelas),
  parcelaAtual: int(p.parcelaAtual), valorParcela: num(p.valorParcela), dataCompra: dateOrNull(p.dataCompra),
  categoria: p.categoria || "outros", origem: p.origem || null, cartaoId: null,
}));

const putGoals = replaceAll(Goal, (g) => ({ nome: g.nome, alvo: num(g.alvo), atual: num(g.atual), prazo: dateOrNull(g.prazo) }));

const putCardProfiles = replaceAll(CardProfile, (p) => ({
  nome: p.nome, banco: p.banco || null, bandeira: p.bandeira || null, limite: num(p.limite),
  vencimentoDia: p.vencimentoDia ? int(p.vencimentoDia) : null,
  finais: p.finais ? String(p.finais).replace(/\D/g, "").slice(-4) : null,
  ativo: p.ativo !== false,
}));

// Cartões têm compras aninhadas → tratamento próprio.
async function putCartoes(req, res, next) {
  const userId = req.user.id;
  const items = Array.isArray(req.body) ? req.body : [];
  const t = await sequelize.transaction();
  try {
    await Cartao.destroy({ where: { userId }, transaction: t }); // cascata apaga compras
    for (const c of items) {
      const cartao = await Cartao.create(
        {
          userId, banco: c.banco || null, nome: c.nome || "Cartão", limite: num(c.limite),
          vencimentoDia: c.vencimentoDia ? int(c.vencimentoDia) : null, vencimento: c.vencimento || null,
          mesRef: c.mesRef, total: num(c.total), somaCompras: num(c.somaCompras),
          portadores: Array.isArray(c.portadores) ? c.portadores : [],
        },
        { transaction: t }
      );
      const compras = (c.compras || []).map((x) => ({
        cartaoId: cartao.id, descricao: x.descricao, valor: num(x.valor), data: dateOrNull(x.data),
        categoria: x.categoria || "outros", parcelas: int(x.parcelas) || 1, parcelaAtual: int(x.parcelaAtual) || 1,
        portador: x.portador || "Titular", final: x.final || null,
      }));
      if (compras.length) await Compra.bulkCreate(compras, { transaction: t });
    }
    await t.commit();
    res.json({ ok: true, total: items.length });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

// Regras de categorização (comerciante → categoria). Recebe um mapa { chave: categoria }.
async function putCategoryRules(req, res, next) {
  const userId = req.user.id;
  const map = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const t = await sequelize.transaction();
  try {
    await CategoryRule.destroy({ where: { userId }, transaction: t });
    const rows = Object.entries(map)
      .filter(([k, v]) => k && v)
      .map(([chave, categoria]) => ({ userId, chave: String(chave).slice(0, 60), categoria: String(categoria) }));
    if (rows.length) await CategoryRule.bulkCreate(rows, { transaction: t });
    await t.commit();
    res.json({ ok: true, total: rows.length });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

module.exports = { getState, putIncomes, putDespesas, putEmprestimos, putParcelados, putGoals, putCartoes, putCategoryRules, putCardProfiles };
