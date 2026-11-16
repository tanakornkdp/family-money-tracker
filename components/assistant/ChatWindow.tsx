"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Send, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
}


export default function ChatWindow({ mobileLayout = false }: { mobileLayout?: boolean }) {
  const { t, locale } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: t.assistant.welcome,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mobileLayout && messages.length === 1) return;
    const messageContainer = messagesRef.current;
    if (messageContainer) {
      messageContainer.scrollTo({ top: messageContainer.scrollHeight, behavior: "smooth" });
    }
  }, [messages, mobileLayout]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
          locale,
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.ok ? data.message ?? t.assistant.errorMessage : data.code === "FREE_AI_UNAVAILABLE" ? (locale === "th" ? data.error : "Free AI is unavailable or its quota is exhausted. Please try again later.") : t.assistant.errorMessage, provider: res.ok ? data.provider : undefined, model: res.ok ? data.model : undefined }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t.assistant.connectionError }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = messages.length <= 1 && (
    <div className={`grid grid-cols-2 gap-2 ${mobileLayout ? "min-[580px]:grid-cols-4" : "mb-3 shrink-0"}`}>
      {t.assistant.quickPrompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => sendMessage(prompt)}
          className="break-words rounded-xl border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-indigo-950/30"
        >
          {prompt}
        </button>
      ))}
    </div>
  );

  return (
    <div className={`flex min-h-0 flex-col overflow-hidden ${mobileLayout ? "flex-1" : "h-full"}`}>
      <div ref={messagesRef} className={`assistant-messages min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-4 ${mobileLayout ? "flex flex-col gap-4 pt-3 [&>*]:shrink-0" : "space-y-4"}`}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "assistant"
                  ? "bg-indigo-500 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div
              className={`min-w-0 max-w-[80%] break-words rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  : "bg-indigo-500 text-white"
              }`}
            >
              {msg.content}
              {msg.provider && <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400" title={msg.model}>{msg.provider}</span>}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        {mobileLayout && quickPrompts && <div className="mobile-assistant-prompts mt-auto">{quickPrompts}</div>}
      </div>

      {!mobileLayout && quickPrompts}

      <div className={`flex shrink-0 gap-2 border-t border-slate-200 dark:border-slate-800 ${mobileLayout ? "mobile-assistant-composer py-2" : "pt-3"}`}>
        <input
          type="text"
          maxLength={2000}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder={t.assistant.placeholder}
          aria-label={t.assistant.placeholder}
          disabled={loading}
          className={`min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${mobileLayout ? "text-base" : "text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"}`}
        />
        <button
          type="button"
          aria-label={locale === "th" ? "ส่งข้อความ" : "Send message"}
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
