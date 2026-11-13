// Testes de integração do fluxo de autenticação (HTTP real via supertest).
// Precisam de um Postgres migrado — aponte DB_* para um banco de teste antes de
// rodar (ver docker descartável no README/plano). Rodados com `node --test`.
const test = require("node:test");
const { after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const { sequelize } = require("../src/models");

// Extrai "fs_refresh=xxxx" do Set-Cookie da resposta.
function refreshCookie(res) {
  const set = res.headers["set-cookie"] || [];
  const c = set.find((x) => x.startsWith("fs_refresh="));
  return c ? c.split(";")[0] : null;
}

const senha = "senha12345";
const novoEmail = (sufixo = "") => `test_${Date.now()}_${Math.round(Math.random() * 1e6)}${sufixo}@example.com`;

after(async () => { await sequelize.close(); });

test("cadastro emite access token + refresh cookie", async () => {
  const reg = await request(app).post("/auth/register").send({ nome: "Teste", email: novoEmail(), senha });
  assert.equal(reg.status, 201);
  assert.ok(reg.body.token, "deve retornar access token");
  assert.equal(reg.body.user.temSenha, true);
  assert.ok(refreshCookie(reg), "deve setar o cookie fs_refresh");
});

test("refresh rotaciona o cookie e reuso do antigo revoga a família", async () => {
  const reg = await request(app).post("/auth/register").send({ nome: "Teste", email: novoEmail(), senha });
  const cookie1 = refreshCookie(reg);

  // 1) refresh válido rotaciona o cookie
  const ref1 = await request(app).post("/auth/refresh").set("Cookie", cookie1);
  assert.equal(ref1.status, 200);
  assert.ok(ref1.body.token);
  const cookie2 = refreshCookie(ref1);
  assert.ok(cookie2 && cookie2 !== cookie1, "o cookie deve rotacionar");

  // 2) reuso do cookie ANTIGO → 401 (detecção de reuso)
  const reuse = await request(app).post("/auth/refresh").set("Cookie", cookie1);
  assert.equal(reuse.status, 401);

  // 3) a família foi revogada → o cookie rotacionado também morre
  const after2 = await request(app).post("/auth/refresh").set("Cookie", cookie2);
  assert.equal(after2.status, 401);
});

test("login correto abre sessão; logout revoga o refresh", async () => {
  const email = novoEmail();
  await request(app).post("/auth/register").send({ nome: "Teste", email, senha });

  const login = await request(app).post("/auth/login").send({ email, senha });
  assert.equal(login.status, 200);
  const cookie = refreshCookie(login);
  assert.ok(cookie);

  const logout = await request(app).post("/auth/logout").set("Cookie", cookie);
  assert.equal(logout.status, 200);

  const depois = await request(app).post("/auth/refresh").set("Cookie", cookie);
  assert.equal(depois.status, 401);
});

test("senha errada → 401 invalid_credentials", async () => {
  const email = novoEmail();
  await request(app).post("/auth/register").send({ nome: "Teste", email, senha });
  const bad = await request(app).post("/auth/login").send({ email, senha: "errada99999" });
  assert.equal(bad.status, 401);
  assert.equal(bad.body.code, "invalid_credentials");
});

test("refresh sem cookie → 401", async () => {
  const semCookie = await request(app).post("/auth/refresh");
  assert.equal(semCookie.status, 401);
});
