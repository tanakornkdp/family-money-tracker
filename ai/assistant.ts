import { Transaction } from "@/types";
import { buildFinanceSystemPrompt } from "./prompts";

export interface AssistantResponse {
  reply: string;
}

/**
 * STUB / REAL IMPLEMENTATION TOGGLE:
 * Uses OpenAI's chat completions API. Replace model/provider as needed.
 */
export async function getAssistantReply(
  userMessage: string,
  transactions: Transaction[]
): Promise<AssistantResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      reply:
        "AI assistant is not configured. Add OPENAI_API_KEY to your environment variables to enable real responses.",
    };
  }

  const systemPrompt = buildFinanceSystemPrompt(transactions);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI provider error: ${errText}`);
  }

  const data = await response.json();
  const reply =
    data.choices?.[0]?.message?.content ??
    "I could not generate a response right now.";

  return { reply };
}