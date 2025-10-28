import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(4001),

  // Tokens obrigatórios
  SPTRANS_TOKEN: z.string().min(10, 'SPTRANS_TOKEN é obrigatório'),
  GEMINI_API_KEY: z.string().min(10, 'GEMINI_API_KEY é obrigatório'),

  // Opcional
  GOOGLE_MAPS_API_KEY: z.string().optional().or(z.literal('')),
  LOG_LEVEL: z.string().default('info'),

  // WhatsApp
  WA_SESSION_DIR: z.string().default('.waba-session'),

  // HTTP cliente
  HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  HTTP_RETRY_MAX: z.coerce.number().int().min(0).default(2),

  // Rate limit (API REST)
  RATE_LIMIT_RPS: z.coerce.number().int().min(1).default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[CONFIG] Erros de configuração:');
  for (const issue of parsed.error.issues) {
    console.error(` - ${issue.path.join('.') || '<root>'}: ${issue.message}`);
  }
  process.exit(1);
}

const raw = parsed.data;

// Maps habilita somente se existir chave E for diferente da de Gemini
const mapsEnabled = !!raw.GOOGLE_MAPS_API_KEY && raw.GOOGLE_MAPS_API_KEY !== '' && raw.GOOGLE_MAPS_API_KEY !== raw.GEMINI_API_KEY;

// Log avisos sobre Maps DEPOIS do parse bem-sucedido
if (raw.GOOGLE_MAPS_API_KEY && 
    raw.GOOGLE_MAPS_API_KEY !== '' && 
    raw.GOOGLE_MAPS_API_KEY === raw.GEMINI_API_KEY) {
  console.warn('[CONFIG] ⚠️ GOOGLE_MAPS_API_KEY igual à GEMINI_API_KEY — Maps desabilitado por segurança.');
}

export const config = {
  isProduction: raw.NODE_ENV === 'production',
  env: raw.NODE_ENV,
  port: raw.PORT,
  logLevel: raw.LOG_LEVEL,

  ai: {
    geminiApiKey: raw.GEMINI_API_KEY,
  },

  sptrans: {
    token: raw.SPTRANS_TOKEN,
  },

  maps: {
    apiKey: mapsEnabled ? raw.GOOGLE_MAPS_API_KEY : undefined,
    enabled: mapsEnabled,
  },

  http: {
    timeoutMs: raw.HTTP_TIMEOUT_MS,
    retryMax: raw.HTTP_RETRY_MAX,
  },

  rateLimit: {
    rps: raw.RATE_LIMIT_RPS,
  },

  whatsapp: {
    sessionDir: raw.WA_SESSION_DIR,
  },

  // Back-compat: flags simples
  mapsEnabled,
};
