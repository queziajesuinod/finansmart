// Restringe a rota a administradores. Roda depois de requireAuth.
module.exports = function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito a administradores.", code: "admin_only" });
  }
  next();
};
