// Handler de erros central. Deve ser o último middleware registrado.
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);

  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({ error: "Registro já existe.", code: "conflict", detalhes: err.errors?.map((e) => e.message) });
  }
  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({ error: "Dados inválidos.", code: "validation", detalhes: err.errors?.map((e) => e.message) });
  }
  if (err.name === "SequelizeForeignKeyConstraintError") {
    return res.status(409).json({ error: "Registro em uso e não pode ser removido.", code: "in_use" });
  }

  // Erros 4xx intencionais (com err.status definido) mantêm a mensagem, que é
  // voltada ao usuário. Já erros 5xx inesperados NÃO expõem err.message em
  // produção — poderia vazar detalhes internos (colunas do banco, caminhos).
  const status = err.status || 500;
  const detalheSeguro = status < 500 || process.env.NODE_ENV !== "production";
  res.status(status).json({
    error: detalheSeguro ? (err.message || "Erro interno do servidor.") : "Erro interno do servidor.",
    code: err.code || "internal",
  });
};
