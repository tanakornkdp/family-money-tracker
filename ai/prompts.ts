import { Transaction } from "@/types";

export function buildFinanceSystemPrompt(transactions: Transaction[]): string {
  const summary = transactions
    .slice(0, 50)
    .map(
      (t) =>
        `${t.date} | ${t.type.toUpperCase()} | ${t.category} | ${t.title} | $${t.amount}`
    )
    .join("\n");

  return `You are a helpful personal finance assistant.
Analyze the user's recent transactions and provide concise, actionable insights.
Be specific with numbers, identify spending patterns, and suggest improvements.
Do not provide tax, legal, or regulated investment advice; give general informational guidance only.

Recent transactions:
${summary || "No transactions available."}
`;
}