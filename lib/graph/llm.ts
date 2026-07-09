import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

/**
 * Calls Groq's OpenAI-compatible endpoint directly via fetch.
 * Groq is 100% free (14,400 req/day) — no billing needed.
 * Implements .invoke() shape compatible with LangChain models.
 */
function makeGroqModel(role: string, maxTokens: number) {
  const apiKey = process.env.GROQ_API_KEY!;
  return {
    async invoke(messages: any[], _options?: any) {
      const body = {
        model: "llama-3.3-70b-versatile",
        messages: messages.map((m: any) => {
          const role =
            m._getType?.() === "system" ? "system"
            : m._getType?.() === "human" ? "user"
            : m.role ?? "user";
          const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
          return { role, content };
        }),
        temperature: role === "judge" ? 0.15 : 0.3,
        max_tokens: maxTokens,
      };

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq API error ${res.status}: ${err.slice(0, 200)}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      return { content: text };
    },
  };
}

export function getModel(role: "bull" | "bear" | "judge" | "resolver"): BaseChatModel {
  const hasGroq   = !!process.env.GROQ_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasGroq && !hasGemini && !hasOpenAI) {
    throw new Error("No LLM credentials found. Set GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.");
  }

  const maxTokens = role === "judge" ? 8192 : 1024;

  const groqModel   = hasGroq   ? makeGroqModel(role, maxTokens)  : null;

  const geminiModel = hasGemini ? new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: role === "judge" ? 0.15 : 0.3,
    maxOutputTokens: maxTokens,
    apiKey: process.env.GEMINI_API_KEY,
    maxRetries: 0,
  }) : null;

  const openaiModel = hasOpenAI ? new ChatOpenAI({
    model: "gpt-4o",
    temperature: role === "judge" ? 0.15 : 0.3,
    maxTokens: maxTokens,
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
  }) : null;

  const models = [groqModel, geminiModel, openaiModel].filter(Boolean);

  return {
    async invoke(messages: any[], options?: any) {
      let lastErr: any;
      for (const m of models) {
        try {
          return await (m as any).invoke(messages, options);
        } catch (err: any) {
          console.warn(`[llm] Model failed: ${err.message?.slice(0, 150)}. Trying next...`);
          lastErr = err;
        }
      }
      throw lastErr ?? new Error("All LLM models failed.");
    }
  } as any;
}
