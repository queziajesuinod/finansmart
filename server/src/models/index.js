// Carrega todos os models da pasta e configura as associações.
const fs = require("fs");
const path = require("path");
const { Sequelize, DataTypes } = require("sequelize");

const env = process.env.NODE_ENV || "development";
const config = require("../config/config")[env];

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

const db = {};

fs.readdirSync(__dirname)
  .filter((file) => file !== "index.js" && file.endsWith(".js"))
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((name) => {
  if (typeof db[name].associate === "function") db[name].associate(db);
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
