const crypto = require("crypto");
const { sequelize, Income, Despesa, Emprestimo, Parcelado, Cartao, Compra, Goal, CategoryRule, CardProfile, Membro, Holerite, RendaExtra, GlobalCategoryRule, ImportLog, Investimento, DataRev } = require("../models");
const { getSetting } = require("../services/settings");

// Garante que o usuário tenha um membro "principal" (criado a partir do nome
// do próprio usuário). Chamado no getState para compatibilizar contas antigas.
async function ensurePrincipal(userId, nomeUsuario, transaction) {
  const principal = await Membro.findOne({ where: { userId, tipo: "principal" }, transaction });
  if (principal) return principal;
  return Membro.create(
    { id: crypto.randomUUID(), userId, nome: (nomeUsuario || "Eu").trim() || "Eu", tipo: "principal", ordem: 0, ativo: true },
    { transaction }
  );
}

// ─── helpers ─────────────────────────────────────────────────
const num = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const int = (v) => Math.trunc(num(v));
const dateOrNull = (v) => (v ? String(v).slice(0, 10) : null);
const bool = (v) => Boolean(v);
// Dia do mês (1–31) ou null.
const diaOuNull = (v) => { const d = int(v); return d >= 1 && d <= 31 ? d : null; };

// ─── Revisão por coleção (concorrência entre aparelhos) ──────
// O cliente manda em X-Data-Rev a revisão que carregou. Se outro aparelho já
// salvou a mesma coleção depois disso, respondemos 409 em vez de sobrescrever.
// Sem o cabeçalho (cliente antigo em cache) o PUT é aceito como antes. O lock
// na linha também enfileira PUTs simultâneos da mesma coleção.
async function conferirRev(req, colecao, transaction) {
  const userId = req.user.id;
  await DataRev.bulkCreate([{ userId, colecao, rev: 0 }], { ignoreDuplicates: true, transaction });
  const row = await DataRev.findOne({ where: { userId, colecao }, transaction, lock: transaction.LOCK.UPDATE });
  const enviada = req.get("X-Data-Rev");
  if (enviada != null && enviada !== "" && Number(enviada) !== row.rev) {
    const err = new Error("Estes dados foram alterados em outro aparelho. Recarregue para ver a versão mais recente.");
    err.status = 409;
    err.code = "stale_data";
    throw err;
  }
  row.rev += 1;
  await row.save({ transaction });
  return row.rev;
}

// ─── GET /api/state — carrega tudo do usuário em uma chamada ──
async function getState(req, res, next) {
  try {
    const userId = req.user.id;
    await ensurePrincipal(userId, req.user.nome);
    const [incomes, despesas, emprestimos, parcelados, cartoes, goals, rules, profiles, membros, holerites, rendasExtras, globalRules, investimentos, revs] = await Promise.all([
      Income.findAll({ where: { userId } }),
      Despesa.findAll({ where: { userId } }),
      Emprestimo.findAll({ where: { userId } }),
      Parcelado.findAll({ where: { userId } }),
      Cartao.findAll({ where: { userId }, include: [{ model: Compra, as: "compras" }] }),
      Goal.findAll({ where: { userId } }),
      CategoryRule.findAll({ where: { userId } }),
      CardProfile.findAll({ where: { userId }, order: [["nome", "ASC"]] }),
      Membro.findAll({ where: { userId }, order: [["ordem", "ASC"], ["nome", "ASC"]] }),
      Holerite.findAll({ where: { userId } }),
      RendaExtra.findAll({ where: { userId } }),
      // Resiliente: se a migração 030 ainda não rodou, degrada p/ vazio em vez de
      // derrubar o getState (que é o carregamento do app inteiro).
      GlobalCategoryRule.findAll().catch(() => []),
      // Resiliente: se a migração 033 ainda não rodou, degrada p/ vazio.
      Investimento.findAll({ where: { userId } }).catch(() => []),
      // Resiliente: se a migração 034 ainda não rodou, segue sem revisões.
      DataRev.findAll({ where: { userId } }).catch(() => []),
    ]);

    res.json({
      revs: Object.fromEntries(revs.map((r) => [r.colecao, r.rev])),
      holerites: holerites.map((h) => ({ id: h.id, membroId: h.membroId || null, mesRef: h.mesRef, titulo: h.titulo || "", salarioBruto: num(h.salarioBruto), salarioBase: num(h.salarioBase), diasTrabalhados: h.diasTrabalhados == null ? 30 : (Number(h.diasTrabalhados) || 30), descontos: Array.isArray(h.descontos) ? h.descontos : [], outrosRendimentos: Array.isArray(h.outrosRendimentos) ? h.outrosRendimentos : [], recorrente: h.recorrente !== false, diaRecebimento: h.diaRecebimento || null })),
      rendasExtras: rendasExtras.map((r) => ({ id: r.id, membroId: r.membroId || null, mesRef: r.mesRef, descricao: r.descricao || "", valor: num(r.valor), recorrente: r.recorrente === true, data: r.data || null })),
      investimentos: investimentos.map((v) => ({
        id: v.id, instituicao: v.instituicao, nome: v.nome || "", tipo: v.tipo === "RV" ? "RV" : "RF",
        indexador: v.indexador || null, percentual: v.percentual == null ? null : num(v.percentual),
        valorAplicado: num(v.valorAplicado), dataAplicacao: v.dataAplicacao, membroId: v.membroId || null,
        historico: Array.isArray(v.historico) ? v.historico : [],
      })),
      membros: membros.map((m) => ({ id: m.id, nome: m.nome, tipo: m.tipo, parentesco: m.parentesco, cor: m.cor, ordem: m.ordem, ativo: m.ativo })),
      incomes: incomes.map((i) => ({ ano: i.ano, mes: i.mes, renda: num(i.renda), extra: num(i.extra) })),
      despesas: despesas.map((d) => ({ id: d.id, descricao: d.descricao, valor: num(d.valor), categoria: d.categoria, data: d.data, fixo: d.fixo, ano: d.ano, mes: d.mes, membroId: d.membroId || null })),
      emprestimos: emprestimos.map((e) => ({
        id: e.id, instituicao: e.instituicao, contrato: e.contrato, sistema: e.sistema === "SAC" ? "SAC" : "PRICE",
        valorContratado: num(e.valorContratado),
        taxa: num(e.taxa), taxaPeriodo: e.taxaPeriodo === "anual" ? "anual" : "mensal",
        parcelas: e.parcelas, pago: e.pago, pagoAuto: e.pagoAuto,
        dataContratacao: e.dataContratacao, dataPrimeira: e.dataPrimeira, dataQuitacao: e.dataQuitacao,
        diaVencimento: e.diaVencimento || null,
        membroId: e.membroId || null,
        amortizacoes: Array.isArray(e.amortizacoes) ? e.amortizacoes : [],
      })),
      parcelados: parcelados.map((p) => ({
        id: p.id, descricao: p.descricao, valorTotal: num(p.valorTotal), totalParcelas: p.totalParcelas,
        parcelaAtual: p.parcelaAtual, valorParcela: num(p.valorParcela), dataCompra: p.dataCompra, dataCompraReal: p.dataCompraReal || null,
        categoria: p.categoria, origem: p.origem, cartaoId: p.cartaoId, membroId: p.membroId || null,
        pagas: Array.isArray(p.pagas) ? p.pagas : [],
      })),
      cartoes: cartoes.map((c) => ({
        id: c.id, banco: c.banco, nome: c.nome, limite: num(c.limite), vencimentoDia: c.vencimentoDia,
        vencimento: c.vencimento, mesRef: c.mesRef, total: num(c.total), somaCompras: num(c.somaCompras),
        valorPago: c.valorPago == null ? null : num(c.valorPago),
        portadores: c.portadores || [],
        pagamentos: Array.isArray(c.pagamentos) ? c.pagamentos : [],
        compras: (c.compras || []).map((x) => ({ id: x.id, descricao: x.descricao, valor: num(x.valor), data: x.data, categoria: x.categoria, parcelas: x.parcelas, parcelaAtual: x.parcelaAtual, portador: x.portador, final: x.final, membroId: x.membroId || null })),
      })),
      goals: goals.map((g) => ({ id: g.id, nome: g.nome, alvo: num(g.alvo), atual: num(g.atual), prazo: g.prazo })),
      categoryRules: Object.fromEntries(rules.map((r) => [r.chave, r.categoria])),
      // Regras GLOBAIS (promovidas pelo admin) — o importador aplica junto (as
      // pessoais têm prioridade). Ver [[importacao-por-banco]] no domínio.
      globalCategoryRules: Object.fromEntries(globalRules.map((r) => [r.chave, r.categoria])),
      // Aviso global (banner) configurável pelo admin em app_settings.
      avisoGlobal: (await getSetting("avisoGlobal", "")) || "",
      cardProfiles: profiles.map((p) => ({ id: p.id, nome: p.nome, banco: p.banco, bandeira: p.bandeira, limite: num(p.limite), vencimentoDia: p.vencimentoDia, fechamentoDia: p.fechamentoDia || null, finais: p.finais, ativo: p.ativo })),
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
      const rev = await conferirRev(req, Model.tableName, t);
      await Model.destroy({ where: { userId }, transaction: t });
      const rows = items.map((it) => ({ ...mapRow(it), userId }));
      if (rows.length) await Model.bulkCreate(rows, { transaction: t });
      await t.commit();
      res.json({ ok: true, total: rows.length, rev });
    } catch (err) {
      await t.rollback();
      next(err);
    }
  };
}

const putIncomes = replaceAll(Income, (i) => ({ ano: int(i.ano), mes: int(i.mes), renda: num(i.renda), extra: num(i.extra) }));

const membroIdOrNull = (v) => (v ? String(v) : null);

const putDespesas = replaceAll(Despesa, (d) => ({
  descricao: d.descricao, valor: num(d.valor), categoria: d.categoria || "outros",
  data: dateOrNull(d.data), ano: int(d.ano), mes: int(d.mes), fixo: bool(d.fixo),
  membroId: membroIdOrNull(d.membroId),
}));

const putEmprestimos = replaceAll(Emprestimo, (e) => ({
  instituicao: e.instituicao, contrato: e.contrato || null, sistema: e.sistema === "SAC" ? "SAC" : "PRICE",
  valorContratado: num(e.valorContratado),
  taxa: num(e.taxa), taxaPeriodo: e.taxaPeriodo === "anual" ? "anual" : "mensal",
  parcelas: int(e.parcelas), pago: int(e.pago), pagoAuto: bool(e.pagoAuto),
  dataContratacao: dateOrNull(e.dataContratacao), dataPrimeira: dateOrNull(e.dataPrimeira), dataQuitacao: dateOrNull(e.dataQuitacao),
  diaVencimento: diaOuNull(e.diaVencimento),
  membroId: membroIdOrNull(e.membroId),
  amortizacoes: Array.isArray(e.amortizacoes)
    ? e.amortizacoes
        .map((a) => ({
          id: a.id || crypto.randomUUID(), data: dateOrNull(a.data), valor: num(a.valor), tipo: a.tipo === "parcela" ? "parcela" : "prazo", parcela: int(a.parcela) || 0,
          // Valores informados pelo banco (opcionais): substituem o cálculo automático.
          ...(num(a.novoSaldo) > 0 ? { novoSaldo: num(a.novoSaldo) } : {}),
          ...(num(a.novaParcela) > 0 ? { novaParcela: num(a.novaParcela) } : {}),
          ...(int(a.novoPrazo) > 0 ? { novoPrazo: int(a.novoPrazo) } : {}),
        }))
        .filter((a) => a.valor > 0 || a.novoSaldo || a.novaParcela || a.novoPrazo)
    : [],
}));

// cartaoId é ignorado no persist (referência vem de ids do frontend, não UUIDs).
const putParcelados = replaceAll(Parcelado, (p) => ({
  descricao: p.descricao, valorTotal: num(p.valorTotal), totalParcelas: int(p.totalParcelas),
  parcelaAtual: int(p.parcelaAtual), valorParcela: num(p.valorParcela), dataCompra: dateOrNull(p.dataCompra), dataCompraReal: dateOrNull(p.dataCompraReal),
  categoria: p.categoria || "outros", origem: p.origem || null, cartaoId: null,
  membroId: membroIdOrNull(p.membroId),
  pagas: Array.isArray(p.pagas) ? [...new Set(p.pagas.map((x) => int(x)).filter((x) => x >= 1))] : [],
}));

const arr = (v) => (Array.isArray(v) ? v : []);
const linhasValor = (lista) => arr(lista).map((x) => ({ nome: (x && x.nome) || "", valor: num(x && x.valor) })).filter((x) => x.nome || x.valor);

const putHolerites = replaceAll(Holerite, (h) => ({
  membroId: membroIdOrNull(h.membroId), mesRef: String(h.mesRef || ""), titulo: h.titulo || null,
  salarioBruto: num(h.salarioBruto), salarioBase: num(h.salarioBase),
  diasTrabalhados: Math.min(31, Math.max(1, int(h.diasTrabalhados) || 30)),
  descontos: linhasValor(h.descontos), outrosRendimentos: linhasValor(h.outrosRendimentos),
  recorrente: h.recorrente !== false,
  diaRecebimento: diaOuNull(h.diaRecebimento),
}));

const putRendasExtras = replaceAll(RendaExtra, (r) => ({
  membroId: membroIdOrNull(r.membroId), mesRef: String(r.mesRef || ""), descricao: r.descricao || null, valor: num(r.valor), recorrente: r.recorrente === true,
  data: dateOrNull(r.data),
}));

const putInvestimentos = replaceAll(Investimento, (v) => ({
  instituicao: v.instituicao || "Investimento", nome: v.nome || null, tipo: v.tipo === "RV" ? "RV" : "RF",
  indexador: v.tipo === "RV" ? null : (v.indexador ? String(v.indexador).slice(0, 12) : null),
  percentual: v.tipo === "RV" || v.percentual == null || v.percentual === "" ? null : num(v.percentual),
  valorAplicado: num(v.valorAplicado), dataAplicacao: dateOrNull(v.dataAplicacao),
  membroId: membroIdOrNull(v.membroId),
  historico: Array.isArray(v.historico)
    ? v.historico.map((h) => ({ mesRef: String(h.mesRef || "").slice(0, 7), saldo: num(h.saldo) })).filter((h) => /^\d{4}-\d{2}$/.test(h.mesRef))
    : [],
}));

// Membros (familiares). Diferente do replaceAll genérico: PRESERVA o id vindo do
// cliente (referenciado por membroId em outras coleções) e garante 1 principal.
async function putMembros(req, res, next) {
  const userId = req.user.id;
  const items = Array.isArray(req.body) ? req.body : [];
  const t = await sequelize.transaction();
  try {
    const rev = await conferirRev(req, "membros", t);
    await Membro.destroy({ where: { userId }, transaction: t });
    let temPrincipal = false;
    const rows = items.map((m, i) => {
      const tipo = m.tipo === "principal" && !temPrincipal ? "principal" : "dependente";
      if (tipo === "principal") temPrincipal = true;
      return {
        id: m.id ? String(m.id) : crypto.randomUUID(),
        userId,
        nome: (m.nome || "").trim() || "Sem nome",
        tipo,
        parentesco: m.parentesco ? String(m.parentesco).slice(0, 40) : null,
        cor: m.cor || null,
        ordem: int(m.ordem) || i,
        ativo: m.ativo !== false,
      };
    });
    // Sempre garante um principal (recria a partir do nome do usuário se faltar).
    if (!temPrincipal) {
      rows.unshift({ id: crypto.randomUUID(), userId, nome: (req.user.nome || "Eu").trim() || "Eu", tipo: "principal", parentesco: null, cor: null, ordem: -1, ativo: true });
    }
    if (rows.length) await Membro.bulkCreate(rows, { transaction: t });
    await t.commit();
    const saved = await Membro.findAll({ where: { userId }, order: [["ordem", "ASC"], ["nome", "ASC"]] });
    res.json({ ok: true, rev, membros: saved.map((m) => ({ id: m.id, nome: m.nome, tipo: m.tipo, parentesco: m.parentesco, cor: m.cor, ordem: m.ordem, ativo: m.ativo })) });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

const putGoals = replaceAll(Goal, (g) => ({ nome: g.nome, alvo: num(g.alvo), atual: num(g.atual), prazo: dateOrNull(g.prazo) }));

const putCardProfiles = replaceAll(CardProfile, (p) => ({
  nome: p.nome, banco: p.banco || null, bandeira: p.bandeira || null, limite: num(p.limite),
  vencimentoDia: p.vencimentoDia ? int(p.vencimentoDia) : null,
  fechamentoDia: diaOuNull(p.fechamentoDia),
  finais: p.finais ? String(p.finais).replace(/\D/g, "").slice(-4) : null,
  ativo: p.ativo !== false,
}));

// Cartões têm compras aninhadas → tratamento próprio.
async function putCartoes(req, res, next) {
  const userId = req.user.id;
  const items = Array.isArray(req.body) ? req.body : [];
  const t = await sequelize.transaction();
  try {
    const rev = await conferirRev(req, "cartoes", t);
    await Cartao.destroy({ where: { userId }, transaction: t }); // cascata apaga compras
    for (const c of items) {
      const cartao = await Cartao.create(
        {
          userId, banco: c.banco || null, nome: c.nome || "Cartão", limite: num(c.limite),
          vencimentoDia: c.vencimentoDia ? int(c.vencimentoDia) : null, vencimento: c.vencimento || null,
          mesRef: c.mesRef, total: num(c.total), somaCompras: num(c.somaCompras),
          valorPago: c.valorPago == null || c.valorPago === "" ? null : num(c.valorPago),
          portadores: Array.isArray(c.portadores) ? c.portadores : [],
          pagamentos: Array.isArray(c.pagamentos)
            ? c.pagamentos.map((p) => ({ id: p.id || undefined, data: dateOrNull(p.data), valor: num(p.valor), descricao: p.descricao || "Pagamento" }))
            : [],
        },
        { transaction: t }
      );
      const compras = (c.compras || []).map((x) => ({
        cartaoId: cartao.id, descricao: x.descricao, valor: num(x.valor), data: dateOrNull(x.data),
        categoria: x.categoria || "outros", parcelas: int(x.parcelas) || 1, parcelaAtual: int(x.parcelaAtual) || 1,
        portador: x.portador || "Titular", final: x.final || null, membroId: x.membroId ? String(x.membroId) : null,
      }));
      if (compras.length) await Compra.bulkCreate(compras, { transaction: t });
    }
    await t.commit();
    res.json({ ok: true, total: items.length, rev });
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
    const rev = await conferirRev(req, "category_rules", t);
    await CategoryRule.destroy({ where: { userId }, transaction: t });
    const rows = Object.entries(map)
      .filter(([k, v]) => k && v)
      .map(([chave, categoria]) => ({ userId, chave: String(chave).slice(0, 60), categoria: String(categoria) }));
    if (rows.length) await CategoryRule.bulkCreate(rows, { transaction: t });
    await t.commit();
    res.json({ ok: true, total: rows.length, rev });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

// Registra um log de importação (métricas parse-vs-confirmado + correções de
// categoria). Chamado pelo cliente ao confirmar uma importação de fatura.
async function postImportLog(req, res, next) {
  try {
    const b = req.body || {};
    const correcoes = Array.isArray(b.correcoes)
      ? b.correcoes.map((c) => ({ chave: String(c.chave || "").slice(0, 60), de: String(c.de || ""), para: String(c.para || "") })).filter((c) => c.chave).slice(0, 200)
      : [];
    await ImportLog.create({
      userId: req.user.id,
      banco: b.banco ? String(b.banco).slice(0, 60) : null,
      mesRef: b.mesRef ? String(b.mesRef).slice(0, 10) : null,
      fonte: b.fonte === "ia" ? "ia" : "local",
      itensParsed: int(b.itensParsed), itensConfirmados: int(b.itensConfirmados),
      itensRemovidos: int(b.itensRemovidos), parcelas: int(b.parcelas),
      categoriasCorrigidas: correcoes.length || int(b.categoriasCorrigidas),
      totalDetectado: b.totalDetectado != null ? num(b.totalDetectado) : null,
      totalUsado: b.totalUsado != null ? num(b.totalUsado) : null,
      limiteDetectado: b.limiteDetectado != null ? num(b.limiteDetectado) : null,
      teveEstorno: bool(b.teveEstorno),
      correcoes,
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = { getState, putIncomes, putDespesas, putEmprestimos, putParcelados, putGoals, putCartoes, putCategoryRules, putCardProfiles, putMembros, putHolerites, putRendasExtras, putInvestimentos, postImportLog };
