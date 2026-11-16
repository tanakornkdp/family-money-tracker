type Message = { role: 'system' | 'user' | 'assistant'; content: string };
type Input = { messages: Message[]; json?: boolean; image?: { mimeType: string; data: string }; maxTokens?: number };
export class FreeAIUnavailableError extends Error {}

/** Server callers only. Revoke tier confirmations when account billing changes. */
export async function completeFreeAI(input: Input, dependencies: { env?: Record<string, string | undefined>; fetcher?: typeof fetch } = {}) {
  const env = dependencies.env ?? process.env;
  const fetcher = dependencies.fetcher ?? fetch;
  const providers: Array<'Groq' | 'Gemini' | 'OpenRouter'> = input.image ? ['Gemini', 'OpenRouter'] : ['Groq', 'Gemini', 'OpenRouter'];
  let quota = false;
  for (const provider of providers) {
    const key = env[provider === 'Groq' ? 'GROQ_API_KEY' : provider === 'Gemini' ? 'GEMINI_API_KEY' : 'OPENROUTER_API_KEY'];
    if (!key || (provider !== 'OpenRouter' && env[provider === 'Groq' ? 'AI_GROQ_FREE_TIER' : 'AI_GEMINI_FREE_TIER'] !== 'true')) continue;
    const model = provider === 'Groq' ? 'qwen/qwen3.8-27b' : provider === 'Gemini' ? 'gemini-3.5-flash-lite' : env.OPENROUTER_FREE_MODEL || 'openrouter/free';
    if (provider === 'OpenRouter' && model !== 'openrouter/free' && !model.endsWith(':free')) continue;
    if (provider === 'OpenRouter' && input.image && !['image/jpeg', 'image/png', 'image/webp'].includes(input.image.mimeType)) continue;
    const gemini = provider === 'Gemini';
    const url = gemini ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` : provider === 'Groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
    const messages = input.messages.map((m, index) => input.image && index === input.messages.length - 1 ? { ...m, content: [{ type: 'text', text: m.content }, { type: 'image_url', image_url: { url: `data:${input.image.mimeType};base64,${input.image.data}` } }] } : m);
    const contents = input.messages.filter(m => m.role !== 'system').map((m, index, all) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }, ...(input.image && index === all.length - 1 ? [{ inlineData: input.image }] : [])] }));
    const body = gemini ? {
      systemInstruction: { parts: [{ text: input.messages.filter(m => m.role === 'system').map(m => m.content).join('\n') || 'You are a helpful assistant.' }] }, contents,
      generationConfig: { temperature: input.json ? 0 : 0.7, maxOutputTokens: input.maxTokens ?? 8192, ...(input.json ? { responseMimeType: 'application/json' } : {}) },
    } : {
      model, messages, max_tokens: input.maxTokens ?? (input.json ? 8192 : 600), temperature: input.json ? 0 : 0.7,
      ...(input.json ? { response_format: { type: 'json_object' } } : {}),
      ...(provider === 'OpenRouter' ? { provider: { max_price: { prompt: 0, completion: 0 } } } : {}),
    };
    try {
      const response = await fetcher(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(gemini ? { 'x-goog-api-key': key } : { Authorization: `Bearer ${key}` }) }, body: JSON.stringify(body), signal: AbortSignal.timeout(25_000) });
      if (!response.ok) { quota ||= response.status === 429; continue; }
      const result = await response.json();
      const candidate = result.candidates?.[0];
      const choice = result.choices?.[0];
      if (candidate?.finishReason === 'SAFETY' || result.promptFeedback?.blockReason || choice?.finish_reason === 'content_filter' || choice?.message?.refusal) throw new FreeAIUnavailableError('AI ไม่สามารถตอบคำขอนี้ได้');
      if (gemini ? candidate?.finishReason !== 'STOP' : choice?.finish_reason !== 'stop') continue;
      const text = gemini ? candidate.content?.parts?.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('') : choice.message?.content;
      if (typeof text !== 'string' || !text.trim()) continue;
      if (input.json) JSON.parse(text);
      return { text, provider, model: typeof result.model === 'string' ? result.model : model };
    } catch (error) {
      if (error instanceof FreeAIUnavailableError) throw error;
      // Never log upstream payloads, credentials, or receipt images.
    }
  }
  throw new FreeAIUnavailableError(quota ? 'โควตา AI ฟรีเต็ม กรุณาลองใหม่ภายหลัง' : 'AI ฟรีไม่พร้อมใช้งาน กรุณาตรวจการตั้งค่าหรือลองใหม่ภายหลัง');
}
