/**
 * OpenAI — script/hook generation. Wire OPENAI_API_KEY and model calls here.
 */
export async function generateScriptStub(prompt: string): Promise<{ text: string }> {
  void prompt;
  if (!process.env.OPENAI_API_KEY) {
    return { text: "[stub] OpenAI not configured. Set OPENAI_API_KEY." };
  }
  // TODO: openai.chat.completions.create(...)
  return { text: "[stub] Model output placeholder." };
}
