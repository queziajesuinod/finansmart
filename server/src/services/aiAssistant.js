// Assistente financeiro: responde perguntas do usuário usando um resumo dos
// PRÓPRIOS dados dele (calculado no frontend e enviado como contexto). Usa a
// Groq (mesma infra do importador). Nunca inventa números fora do resumo.
const { groqCompletion } = require("./aiImport");

const SYSTEM = `Você é o assistente financeiro do app "José Planeja". Responda SEMPRE em português do Brasil, de forma direta, prática e acolhedora.

REGRAS:
- Use SOMENTE os dados do "Resumo financeiro" abaixo. NÃO invente valores nem suponha dados que não estão ali.
- Se faltar informação para responder, diga o que falta (ex: "cadastre sua renda para eu calcular isso").
- Valores sempre em reais (R$). Seja conciso: no máximo 4 parágrafos curtos.
- Quando fizer sentido, dê 1 sugestão prática e acionável.
- Pode usar poucos emojis, com moderação.`;

async function responderAssistente({ pergunta, contexto, historico }) {
  const messages = [
    { role: "system", content: `${SYSTEM}\n\n=== Resumo financeiro do usuário ===\n${contexto || "(sem dados)"}` },
  ];
  // Histórico curto para dar continuidade à conversa.
  (Array.isArray(historico) ? historico : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-6)
    .forEach((m) => messages.push({ role: m.role, content: m.content.slice(0, 1500) }));
  messages.push({ role: "user", content: pergunta });

  const texto = await groqCompletion(messages, { json: false, maxTokens: 900, temperature: 0.4 });
  return { resposta: (texto || "").trim() || "Não consegui responder agora. Tente reformular a pergunta." };
}

module.exports = { responderAssistente };
