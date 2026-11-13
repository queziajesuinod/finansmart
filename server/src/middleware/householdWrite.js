// Bloqueia escrita de quem é "viewer" no household (só leitura). Deve rodar depois
// de requireAuth (que define req.householdRole). Defesa no servidor — a UI também
// esconde os botões, mas a regra que vale é esta.
const { canWrite } = require("../services/household");

module.exports = function requireHouseholdWrite(req, res, next) {
  if (!canWrite(req.householdRole)) {
    return res.status(403).json({ error: "Seu acesso é somente leitura nesta família.", code: "read_only" });
  }
  next();
};
