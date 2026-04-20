import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  if (!client) {
    client = new OpenAI({ apiKey: key });
  }
  return client;
}

export function defaultChatModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}
