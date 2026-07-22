// Lista pública de planos + módulos, para a tela de assinatura/pagamento.
const { Router } = require("express");
const { Plan, Module } = require("../models");

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const plans = await Plan.findAll({
      where: { ativo: true },
      include: [{ model: Module, as: "modules", through: { attributes: [] } }],
      order: [["precoCentavos", "ASC"]],
    });
    res.json(
      plans.map((p) => ({
        id: p.id,
        slug: p.slug,
        nome: p.nome,
        descricao: p.descricao,
        precoCentavos: p.precoCentavos,
        intervalo: p.intervalo,
        modulos: (p.modules || []).map((m) => ({ chave: m.chave, nome: m.nome })),
      }))
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
