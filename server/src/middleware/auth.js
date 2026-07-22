// Exige um JWT válido e carrega o usuário em req.user.
const { verifyToken } = require("../utils/jwt");
const { User } = require("../models");

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
    next();
  } catch (err) {
    next(err);
  }
};
