// Exige um JWT válido e carrega o usuário em req.user. Resolve também o "dono dos
// dados" do household (req.dataOwner): num login familiar, o membro opera sobre os
// dados do titular. Dados ficam em req.dataOwnerId; auth/passkeys/sessões/push
// continuam usando req.user (são por-pessoa).
const { verifyToken } = require("../utils/jwt");
const { User } = require("../models");
const { resolveOwner } = require("../services/household");

module.exports = async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Não autenticado.", code: "no_token" });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({ error: "Sessão inválida ou expirada.", code: "invalid_token" });
    }

    const user = await User.findByPk(payload.sub);
    if (!user || !user.ativo) {
      return res.status(401).json({ error: "Usuário não encontrado ou inativo.", code: "no_user" });
    }

    req.user = user;
    req.dataOwner = await resolveOwner(user);
    req.dataOwnerId = req.dataOwner.id;
    req.householdRole = user.householdOwnerId ? (user.householdRole || "member") : "owner";
    next();
  } catch (err) {
    next(err);
  }
};
