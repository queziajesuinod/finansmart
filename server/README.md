# FinançaSmart — API (backend)

Backend em **Node + Express + Sequelize + PostgreSQL** para o FinançaSmart, com:

- Cadastro **manual** (e-mail + senha) e **login com Google** (OAuth 2.0)
- **JWT** para autenticação da SPA
- **Controle de acesso por módulos** (RBAC): cada aba é um módulo, liberado conforme o plano
- **Gate de assinatura**: o usuário só acessa o sistema com pagamento recorrente em dia
- Stripe (integração real na Fase 2 — os modelos e gates já estão prontos)

## Pré-requisitos

- Node 18+
- PostgreSQL rodando localmente (ou uma `DATABASE_URL` de nuvem, ex: Neon/Supabase)

## Setup

```bash
cd server
npm install
cp .env.example .env        # edite os valores (banco, JWT_SECRET, Google…)
npm run db:setup            # cria o banco, roda migrations e seeders
npm run dev                 # sobe a API em http://127.0.0.1:3333
```

> Sem Postgres local? Use Docker rapidamente:
> `docker run --name finansmart-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=finansmart -p 5432:5432 -d postgres:16`

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | API com auto-reload |
| `npm run db:setup` | create + migrate + seed |
| `npm run db:reset` | drop + create + migrate + seed |
| `npm run db:migrate` | roda migrations pendentes |
| `npm run db:seed` | roda seeders (módulos + planos) |
| `npm run grant -- <email> <slug\|admin> [dias]` | libera um usuário sem Stripe (dev) |

## Liberando um usuário em dev (sem Stripe)

Como o pagamento real entra na Fase 2, use o script para liberar acesso:

```bash
npm run grant -- cliente@teste.com completo      # plano completo por 30 dias
npm run grant -- cliente@teste.com basico 90      # plano básico por 90 dias
npm run grant -- voce@teste.com admin             # promove a admin (acesso total)
```

## Endpoints (Fase 1)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Healthcheck |
| `GET` | `/auth/config` | Diz se o login com Google está habilitado |
| `POST` | `/auth/register` | Cadastro manual `{ nome, email, senha, cpf, telefone }` |
| `POST` | `/auth/login` | Login `{ email, senha }` → `{ token, user, access }` |
| `GET` | `/auth/google` | Inicia o OAuth do Google |
| `GET` | `/auth/google/callback` | Callback → redireciona a `FRONTEND_URL/auth/callback?token=…` |
| `GET` | `/auth/me` | Usuário logado + estado de acesso (requer `Authorization: Bearer <token>`) |
| `GET` | `/plans` | Lista planos e seus módulos (público) |
| `GET` | `/app/ping` | Exemplo: exige login **+ assinatura ativa** (402 se bloqueado) |
| `GET` | `/app/modulo/:chave` | Exemplo: exige o módulo `:chave` (403 se o plano não inclui) |

### Como o acesso é decidido

`GET /auth/me` retorna:

```json
{
  "user": { "id": "...", "nome": "...", "email": "...", "role": "cliente" },
  "access": {
    "liberado": true,
    "admin": false,
    "subscription": { "status": "active", "currentPeriodEnd": "..." },
    "plano": { "slug": "completo", "nome": "Completo" },
    "modulos": ["dashboard", "cartoes", "emprestimos", "..."]
  }
}
```

O frontend usa `access.liberado` para liberar/bloquear o app e `access.modulos` para mostrar/esconder cada aba.

## Módulos (chaves)

`dashboard`, `lancamentos`, `extrato`, `importar`, `cartoes`, `emprestimos`, `parcelados`, `metas`, `historico`, `assistente`

## Planos (seed inicial)

- **basico** (R$ 19,90/mês): dashboard, lancamentos, extrato, metas, historico
- **completo** (R$ 39,90/mês): todos os módulos

## Próximas fases

- **Fase 2**: integração Stripe (checkout de assinatura + webhooks atualizando `Subscription`/`Payment`)
- **Fase 3**: rotas CRUD de domínio e religar o frontend React (trocar `localStorage` pela API, tela de assinatura, abas gated por módulo, botão "Entrar com Google")
