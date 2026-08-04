// Configura o Passport para login com Google.
// A estratégia só é registrada se as credenciais estiverem no .env.
const crypto = require("crypto");
const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const { User, Membro } = require("../models");
const { ensureDefaultSubscription } = require("../services/access");

const enabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (enabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://127.0.0.1:3333/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = (profile.emails?.[0]?.value || "").toLowerCase();
          const googleId = profile.id;
          const nome = profile.displayName || email;

          // 1) já existe pelo googleId
          let user = await User.findOne({ where: { googleId } });
          // 2) senão, tenta casar pelo e-mail e vincula o Google à conta
          if (!user && email) {
            user = await User.findOne({ where: { email } });
            if (user) {
              user.googleId = googleId;
              await user.save();
            }
          }
          // 3) senão, cria uma conta nova (sem senha) + membro principal + assinatura padrão.
          if (!user) {
            user = await User.create({ nome, email, googleId, senhaHash: null });
            await Membro.create({ id: crypto.randomUUID(), userId: user.id, nome: user.nome, tipo: "principal", ordem: 0, ativo: true });
            await ensureDefaultSubscription(user.id);
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

module.exports = { passport, googleEnabled: enabled };
