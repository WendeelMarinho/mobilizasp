// src/config.ts
import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 3000),
  logLevel: process.env.LOG_LEVEL || 'info',
  whatsapp: {
    sessionDir: process.env.WA_SESSION_DIR || '.waba-session'
  },
  sptrans: {
    token: process.env.SPTRANS_TOKEN || ''
  },
  google: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || ''
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || ''
  }
} as const;

export type AppConfig = typeof config;
