// Normaliza a `dataCompra` dos parcelados importados que foram gravados com o mês
// errado por causa do antigo bug de overflow de dia do Date.setMonth (compras dia
// 29–31). NÃO adivinha: re-deriva a data da 1ª parcela a partir da COMPRA DE ORIGEM
// (que ainda guarda a data da fatura + a parcela), com aritmética de mês segura.
//
//   npm run fix:parcelados                     → DRY-RUN (só mostra o que mudaria)
//   npm run fix:parcelados -- --email a@b.com   → DRY-RUN, só desse usuário
//   npm run fix:parcelados -- --apply           → aplica de verdade
//   npm run fix:parcelados -- --email a@b.com --apply
//
require("dotenv").config();
const { sequelize, Parcelado, Cartao, Compra, User } = require("../models");

// ── addMonths seguro (mesma lógica do front): preserva o dia, prende no último dia
//    do mês de destino quando não existe (evita o overflow que estourava o mês). ──
function addMonths(input, months) {
  const d = input instanceof Date ? new Date(input.getTime()) : new Date(`${String(input).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const dia = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimoDia));
  return d;
}
const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Normaliza descrição p/ casar parcelado (marcador de parcela removido) com a compra.
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
const descBate = (a, b) => { const x = norm(a), y = norm(b); if (x.length < 4 || y.length < 4) return true; return x.includes(y) || y.includes(x); };

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const emailIdx = args.indexOf("--email");
  const email = emailIdx >= 0 ? (args[emailIdx + 1] || "").toLowerCase() : null;

  await sequelize.authenticate();
  const schema = process.env.DB_SCHEMA || "(default)";
  console.log("──────────────────────────────────────────────");
  console.log(`Banco   : ${process.env.DB_NAME || process.env.DATABASE_URL || "(config)"}  host=${process.env.DB_HOST || "url"}`);
  console.log(`Ambiente: NODE_ENV=${process.env.NODE_ENV || "development"}  schema=${schema}`);
  console.log(`Modo    : ${apply ? "APLICAR (vai gravar)" : "DRY-RUN (só simula)"}${email ? `  filtro email=${email}` : ""}`);
  console.log("──────────────────────────────────────────────\n");

  // Escopo opcional por usuário.
  let userIds = null;
  if (email) {
    const u = await User.findOne({ where: { email } });
    if (!u) { console.error(`Usuário não encontrado: ${email}`); process.exit(1); }
    userIds = [u.id];
  }

  const whereUser = userIds ? { userId: userIds } : {};
  const parcelados = await Parcelado.findAll({ where: whereUser });
  const cartoes = await Cartao.findAll({ where: whereUser, include: [{ model: Compra, as: "compras" }] });

  // Lista de compras parceladas (parcelas>1) com userId + nome do cartão de origem.
  const comprasParc = [];
  for (const c of cartoes) {
    for (const x of c.compras || []) {
      if ((x.parcelas || 1) > 1) comprasParc.push({ userId: c.userId, cartaoNome: (c.nome || "").toLowerCase().trim(), data: x.data, parcelas: x.parcelas, parcelaAtual: x.parcelaAtual, valor: Number(x.valor) || 0, descricao: x.descricao });
    }
  }

  const mudar = [], ambiguos = [], semFonte = [];
  for (const p of parcelados) {
    const origem = (p.origem || "").toLowerCase().trim();
    if (!origem) continue; // sem cartão de origem (manual) → não veio da importação, não mexe

    // Candidatas: mesmo usuário, mesmo cartão, mesmas parcelas, mesma parcela (valor) e descrição compatível.
    const cands = comprasParc.filter((x) =>
      x.userId === p.userId &&
      x.cartaoNome === origem &&
      x.parcelas === p.totalParcelas &&
      Math.abs(x.valor - (Number(p.valorParcela) || 0)) < 0.01 &&
      descBate(p.descricao, x.descricao)
    );
    if (!cands.length) { semFonte.push(p); continue; }

    // Cada candidata → data da 1ª parcela (deve ser a MESMA para todas do mesmo item).
    const datas = new Set();
    for (const c of cands) { const d = addMonths(c.data, -((c.parcelaAtual || 1) - 1)); if (d) datas.add(fmtDate(d)); }
    if (datas.size !== 1) { ambiguos.push({ p, datas: [...datas] }); continue; }

    const correta = [...datas][0];
    const atual = String(p.dataCompra).slice(0, 10);
    if (correta !== atual) mudar.push({ p, atual, correta });
  }

  // ── Relatório ──
  if (mudar.length) {
    console.log(`Parcelados a corrigir (${mudar.length}):\n`);
    for (const m of mudar) console.log(`  • ${m.p.descricao}  [${m.p.totalParcelas}x de R$ ${Number(m.p.valorParcela).toFixed(2)} · ${m.p.origem}]\n      ${m.atual}  →  ${m.correta}`);
    console.log("");
  } else {
    console.log("Nenhum parcelado precisa de correção. 🎉\n");
  }
  if (ambiguos.length) console.log(`⚠️  ${ambiguos.length} ambíguo(s) (múltiplas datas possíveis) — não alterados. Verifique manualmente.`);
  if (semFonte.length) console.log(`ℹ️  ${semFonte.length} sem compra de origem (fatura removida ou manual) — não alterados.`);

  if (!apply) {
    console.log(`\nDRY-RUN: nada foi gravado. Para aplicar, rode de novo com --apply.`);
    process.exit(0);
  }

  if (mudar.length) {
    const t = await sequelize.transaction();
    try {
      for (const m of mudar) await Parcelado.update({ dataCompra: m.correta }, { where: { id: m.p.id }, transaction: t });
      await t.commit();
      console.log(`\n✅ ${mudar.length} parcelado(s) corrigido(s) e salvo(s).`);
    } catch (err) {
      await t.rollback();
      console.error("\n❌ Falha ao aplicar — nada foi gravado (rollback):", err.message);
      process.exit(1);
    }
  }
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
