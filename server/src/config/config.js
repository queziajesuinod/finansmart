// Configuração compartilhada pela aplicação e pela sequelize-cli.
require("dotenv").config();

// Se DB_SCHEMA estiver definido, todas as conexões usam esse schema
// (cria se não existir e ajusta o search_path). Vale para app e migrations.
function schemaHooks() {
  const schema = process.env.DB_SCHEMA;
  if (!schema) return {};
  return {
    hooks: {
      afterConnect: async (connection) => {
        await connection.query(`CREATE SCHEMA IF NOT EXISTS "${schema}";`);
        await connection.query(`SET search_path TO "${schema}";`);
      },
    },
  };
}

const common = {
  dialect: "postgres",
  logging: false,
  define: { underscored: false, freezeTableName: false },
  ...schemaHooks(),
};

function fromParts() {
  return {
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS || "postgres",
    database: process.env.DB_NAME || "finansmart",
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 5432),
    ...common,
  };
}

const useUrl = Boolean(process.env.DATABASE_URL);

module.exports = {
  development: useUrl
    ? { use_env_variable: "DATABASE_URL", ...common }
    : fromParts(),
  test: useUrl
    ? { use_env_variable: "DATABASE_URL", ...common }
    : { ...fromParts(), database: `${process.env.DB_NAME || "finansmart"}_test` },
  production: {
    use_env_variable: "DATABASE_URL",
    ...common,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  },
};
