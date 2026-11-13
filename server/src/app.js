const path = require("path");
const fs = require("fs");
const Sentry = require("@sentry/node");

// Monitoramento de erros em produção — no-op se SENTRY_DSN não estiver setado.
// Inicializa antes do app p/ instrumentar o Express.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { passport } = require("./config/passport");
const routes = require("./routes");
const errorHandler = require("./middleware/error");

const app = express();

// Em produção a API roda atrás de um proxy reverso (ex: nginx). Isso faz o
// req.ip refletir o cliente real (via X-Forwarded-For) — essencial para o
// rate limit por IP não tratar todo mundo como o mesmo endereço do proxy.
// TRUST_PROXY = nº de proxies confiáveis (1 = um nginx na frente). 0 desliga.
app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://127.0.0.1:4173",
    credentials: true,
  })
);
// As coleções são salvas inteiras (replace-all) e as faturas acumulam mês a mês:
// o limite padrão de 100 KB do express.json estouraria com o uso normal.
app.use(express.json({ limit: "5mb" }));
// Lê o refresh cookie (sessão longa) e o challenge de WebAuthn.
app.use(cookieParser());
app.use(passport.initialize());

// ─── Servir o frontend (build do Vite) na mesma origem, em produção ──────────
// Estrutura: /app/dist (frontend) e /app/server (backend). __dirname = server/src.
const DIST = path.resolve(__dirname, "../../dist");
const API_PREFIX = /^\/(auth|api|admin|plans|health)(\/|$)/;
const temDist = fs.existsSync(DIST);

// IMPORTANTE: /admin (exata) é a PÁGINA do Console no SPA e precisa ser servida
// ANTES das rotas de API. O grupo /admin da API usa requireAuth; numa navegação
// de browser (sem Bearer token) ele devolveria 401 "no_token". As CHAMADAS de API
// do admin são sub-caminhos (/admin/overview, /admin/users, /admin/plans…) e
// continuam indo para o router protegido normalmente.
if (temDist) {
  app.get(["/admin", "/admin/"], (req, res) => res.sendFile(path.join(DIST, "index.html")));
}

// API.
app.use("/", routes);

if (temDist) {
  app.use(express.static(DIST));
  // Fallback SPA: qualquer rota que não seja de API devolve o index.html.
  app.get("*", (req, res, next) => {
    if (API_PREFIX.test(req.path)) return next();
    return res.sendFile(path.join(DIST, "index.html"));
  });
}

// 404 para rotas de API não encontradas.
app.use((req, res) => res.status(404).json({ error: "Rota não encontrada.", code: "not_found" }));

// Captura de erros pelo Sentry (antes do nosso handler) — no-op se não configurado.
if (process.env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);

app.use(errorHandler);

module.exports = app;
