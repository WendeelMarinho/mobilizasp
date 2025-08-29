import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

if (!config.gemini.apiKey) throw new Error('GEMINI_API_KEY ausente');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

export async function generate(model: string, prompt: string) {
  const m = genAI.getGenerativeModel({ model });
  const result = await m.generateContent(prompt);
  return result.response.text();
}
