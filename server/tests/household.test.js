// Testes de integração do login familiar (household). Precisam de um Postgres
// migrado (ver docker descartável). Rodados com `node --test`.
const test = require("node:test");
const { after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const { sequelize } = require("../src/models");

const senha = "senha12345";
const novoEmail = (s = "") => `hh_${Date.now()}_${Math.round(Math.random() * 1e6)}${s}@example.com`;

after(async () => { await sequelize.close(); });

// Cria um dono (owner) e devolve { token, email }.
async function criarDono() {
  const email = novoEmail();
  const reg = await request(app).post("/auth/register").send({ nome: "Dono", email, senha });
  assert.equal(reg.status, 201);
  return { token: reg.body.token, email, user: reg.body.user };
}

async function convidar(token, role) {
  const r = await request(app).post("/auth/household/invites").set("Authorization", `Bearer ${token}`).send({ nome: "Fulano", role });
  assert.equal(r.status, 201);
  return r.body.token; // token do convite
}

test("convite → aceite → dados compartilhados com o dono", async () => {
  const dono = await criarDono();

  // dono salva uma despesa
  const put = await request(app).put("/api/despesas").set("Authorization", `Bearer ${dono.token}`)
    .send([{ descricao: "Mercado", valor: 100, categoria: "alimentacao", data: "2026-11-10", ano: 2026, mes: 10 }]);
  assert.equal(put.status, 200);

  // convida um membro e aceita
  const inviteToken = await convidar(dono.token, "member");
  const prev = await request(app).get(`/auth/household/invites/${inviteToken}`);
  assert.equal(prev.body.valido, true);
  const accept = await request(app).post(`/auth/household/invites/${inviteToken}/accept`).send({ nome: "Maria", email: novoEmail("m"), senha });
  assert.equal(accept.status, 201);
  const memberToken = accept.body.token;
  assert.equal(accept.body.user.isOwner, false);
  assert.equal(accept.body.user.householdRole, "member");

  // o MEMBRO enxerga a despesa do dono (dados compartilhados)
  const stateMembro = await request(app).get("/api/state").set("Authorization", `Bearer ${memberToken}`);
  assert.equal(stateMembro.status, 200);
  const temMercado = Object.values(stateMembro.body.despesas || {}).flat().some((d) => d.descricao === "Mercado");
  assert.ok(temMercado, "membro deve ver a despesa do dono");

  // membro adiciona outra despesa; o dono passa a ver as duas
  const existentes = Object.values(stateMembro.body.despesas || {}).flat().map((d) => ({ descricao: d.descricao, valor: d.valor, categoria: d.categoria, data: d.data, ano: 2026, mes: 10 }));
  const put2 = await request(app).put("/api/despesas").set("Authorization", `Bearer ${memberToken}`)
    .send([...existentes, { descricao: "Farmácia", valor: 50, categoria: "saude", data: "2026-11-11", ano: 2026, mes: 10 }]);
  assert.equal(put2.status, 200);
  const stateDono = await request(app).get("/api/state").set("Authorization", `Bearer ${dono.token}`);
  const nomes = Object.values(stateDono.body.despesas || {}).flat().map((d) => d.descricao);
  assert.ok(nomes.includes("Mercado") && nomes.includes("Farmácia"), "dono deve ver as duas despesas");
});

test("viewer é somente leitura (PUT → 403 read_only)", async () => {
  const dono = await criarDono();
  const inviteToken = await convidar(dono.token, "viewer");
  const accept = await request(app).post(`/auth/household/invites/${inviteToken}/accept`).send({ nome: "Zé", email: novoEmail("v"), senha });
  const viewerToken = accept.body.token;
  assert.equal(accept.body.user.householdRole, "viewer");

  // lê ok
  const read = await request(app).get("/api/state").set("Authorization", `Bearer ${viewerToken}`);
  assert.equal(read.status, 200);
  // escreve bloqueado
  const write = await request(app).put("/api/despesas").set("Authorization", `Bearer ${viewerToken}`).send([]);
  assert.equal(write.status, 403);
  assert.equal(write.body.code, "read_only");
});

test("membro não gere a família (convidar → 403)", async () => {
  const dono = await criarDono();
  const inviteToken = await convidar(dono.token, "member");
  const accept = await request(app).post(`/auth/household/invites/${inviteToken}/accept`).send({ nome: "Ana", email: novoEmail("a"), senha });
  const memberToken = accept.body.token;

  const r = await request(app).post("/auth/household/invites").set("Authorization", `Bearer ${memberToken}`).send({ role: "member" });
  assert.equal(r.status, 403);
  assert.equal(r.body.code, "forbidden");
});

test("convite inválido → preview valido=false e accept 400", async () => {
  const prev = await request(app).get("/auth/household/invites/tokeninexistente123");
  assert.equal(prev.body.valido, false);
  const accept = await request(app).post("/auth/household/invites/tokeninexistente123/accept").send({ nome: "X", email: novoEmail("x"), senha });
  assert.equal(accept.status, 400);
});
