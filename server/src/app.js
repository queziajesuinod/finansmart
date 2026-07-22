const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { passport } = require("./config/passport");
const routes = require("./routes");
const errorHandler = require("./middleware/error");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://127.0.0.1:4173",
    credentials: true,
  })
);
app.use(express.json());
app.use(passport.initialize());

// API.
app.use("/", routes);

// ─── Servir o frontend (build do Vite) na mesma origem, em produção ──────────
// Estrutura: /app/dist (frontend) e /app/server (backend). __dirname = server/src.
const DIST = path.resolve(__dirname, "../../dist");
const API_PREFIX = /^\/(auth|api|admin|plans|health)(\/|$)/;

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  // Fallback SPA: qualquer rota que não seja de API devolve o index.html.
  app.get("*", (req, res, next) => {
    if (API_PREFIX.test(req.path)) return next();
    return res.sendFile(path.join(DIST, "index.html"));
  });
}

// 404 para rotas de API não encontradas.
app.use((req, res) => res.status(404).json({ error: "Rota não encontrada.", code: "not_found" }));

app.use(errorHandler);

module.exports = app;
