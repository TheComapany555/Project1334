import OpenAI from "openai";

let client: OpenAI | null = null;

/**
 * Lazy server-side OpenAI client. Throws a clear error if OPENAI_API_KEY is
 * missing so the API route can return a useful message to the user.
 */
export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key is not configured. Set OPENAI_API_KEY in your environment."
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
