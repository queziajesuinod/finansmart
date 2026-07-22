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

app.use("/", routes);

// 404 para rotas não encontradas.
app.use((req, res) => res.status(404).json({ error: "Rota não encontrada.", code: "not_found" }));

app.use(errorHandler);

module.exports = app;
