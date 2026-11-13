// Login familiar (household) — modelo "dados do dono".
// O espaço financeiro da família é a conta do titular (owner). Um membro com login
// tem householdOwnerId = id do titular; ao operar, o servidor usa os dados do dono.
// Papéis: owner (titular), admin (gere família + edita), member (edita), viewer (só lê).
const crypto = require("crypto");
const { Op } = require("sequelize");
const { User, HouseholdInvite } = require("../models");
const { hashPassword } = require("../utils/password");

const ROLES = ["admin", "member", "viewer"]; // "owner" é implícito, não atribuível
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const normRole = (r) => (ROLES.includes(r) ? r : "member");
const canWrite = (role) => role !== "viewer";

// User dono do espaço de dados (o próprio se standalone; senão o titular).
async function resolveOwner(user) {
  if (!user.householdOwnerId) return user;
  const owner = await User.findByPk(user.householdOwnerId);
  return owner || user; // titular sumiu → vira dono de si (fail-safe)
}

function memberJSON(u, ownerId) {
  const isOwner = u.id === ownerId;
  return {
    id: u.id, nome: u.nome, email: u.email,
    isOwner,
    role: isOwner ? "owner" : (u.householdRole || "member"),
    temSenha: Boolean(u.senhaHash), temGoogle: Boolean(u.googleId),
    membroId: u.membroId || null,
    createdAt: u.createdAt,
  };
}

async function listMembers(ownerId) {
  const users = await User.findAll({
    where: { [Op.or]: [{ id: ownerId }, { householdOwnerId: ownerId }] },
    order: [["createdAt", "ASC"]],
  });
  // Dono primeiro, depois os membros.
  return users.map((u) => memberJSON(u, ownerId)).sort((a, b) => (a.isOwner === b.isOwner ? 0 : a.isOwner ? -1 : 1));
}

async function createInvite(ownerId, { nome, role, membroId } = {}) {
  const invite = await HouseholdInvite.create({
    ownerId,
    token: crypto.randomBytes(24).toString("base64url"),
    nome: nome ? String(nome).slice(0, 80) : null,
    role: normRole(role),
    membroId: membroId ? String(membroId) : null,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });
  return invite;
}

async function listInvites(ownerId) {
  const invites = await HouseholdInvite.findAll({
    where: { ownerId, usedAt: { [Op.is]: null }, expiresAt: { [Op.gt]: new Date() } },
    order: [["createdAt", "DESC"]],
  });
  return invites.map((i) => ({ id: i.id, token: i.token, nome: i.nome, role: i.role, expiresAt: i.expiresAt }));
}

// Convite válido (existe, não usado, não expirado) ou null.
async function getValidInvite(token) {
  if (!token) return null;
  const invite = await HouseholdInvite.findOne({ where: { token } });
  if (!invite || invite.usedAt || invite.expiresAt.getTime() <= Date.now()) return null;
  return invite;
}

async function revokeInvite(ownerId, id) {
  const n = await HouseholdInvite.destroy({ where: { id, ownerId } });
  return n > 0;
}

// Aceita o convite: cria o login do membro no household do dono. Retorna o User
// novo, ou { error } em caso de validação.
async function acceptInvite(token, { nome, email, senha }) {
  const invite = await getValidInvite(token);
  if (!invite) return { error: "Convite inválido ou expirado.", code: "invite_invalid" };

  const emailNorm = (email || "").trim().toLowerCase();
  if (!nome || !nome.trim() || !emailNorm || !senha) return { error: "Preencha nome, e-mail e senha.", code: "missing_fields" };
  if (String(senha).length < 8) return { error: "A senha deve ter ao menos 8 caracteres.", code: "weak_password" };
  if (await User.findOne({ where: { email: emailNorm } })) return { error: "E-mail já cadastrado.", code: "email_taken" };

  const user = await User.create({
    nome: nome.trim(),
    email: emailNorm,
    senhaHash: await hashPassword(String(senha)),
    role: "cliente",
    householdOwnerId: invite.ownerId,
    householdRole: normRole(invite.role),
    membroId: invite.membroId || null,
  });
  invite.usedAt = new Date();
  await invite.save();
  return { user };
}

async function setMemberRole(ownerId, memberUserId, role) {
  const u = await User.findOne({ where: { id: memberUserId, householdOwnerId: ownerId } });
  if (!u) return false;
  u.householdRole = normRole(role);
  await u.save();
  return true;
}

async function removeMember(ownerId, memberUserId) {
  const n = await User.destroy({ where: { id: memberUserId, householdOwnerId: ownerId } });
  return n > 0;
}

module.exports = {
  ROLES, canWrite, resolveOwner,
  listMembers, createInvite, listInvites, getValidInvite, revokeInvite, acceptInvite,
  setMemberRole, removeMember,
};
