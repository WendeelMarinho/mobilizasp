import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

if (!config.ai.geminiApiKey) throw new Error('GEMINI_API_KEY ausente');

const genAI = new GoogleGenerativeAI(config.ai.geminiApiKey);

export async function generate(model: string, prompt: string) {
  const m = genAI.getGenerativeModel({ model });
  const result = await m.generateContent(prompt);
  return result.response.text();
}
