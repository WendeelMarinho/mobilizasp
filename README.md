# MobilizaSP

Bot de WhatsApp para consulta de transporte público em São Paulo usando a API da SPTrans e Google Maps.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [API REST](#api-rest)
- [Arquitetura](#arquitetura)
- [Desenvolvimento](#desenvolvimento)
- [Docker](#docker)

## 🎯 Visão Geral

MobilizaSP é um bot de WhatsApp que permite consultar informações sobre transporte público em São Paulo, incluindo:
- Linhas de ônibus
- Posição da frota
- Previsão de chegada
- Rotas de transporte público

O bot utiliza IA (Google Gemini) para entender as mensagens dos usuários e responde automaticamente com informações relevantes.

## ✨ Funcionalidades

### WhatsApp Bot

O bot entende as seguintes intenções:

1. **Buscar Linha**: "qual ônibus passa na paulista?"
2. **Posição da Frota**: "posição 701U-10"
3. **Previsão**: "quando chega 701U-10 no ponto 340015345?"
4. **Rota**: "rota Av Paulista 1000 até Terminal Jabaquara"
5. **Ajuda**: "ajuda" - mostra os comandos disponíveis

### API REST

Disponibiliza endpoints para:
- `/api/v1/sptrans` - Consultas SPTrans
- `/api/v1/whatsapp` - Integração WhatsApp
- `/api/v1/maps` - Rotas com Google Maps (opcional)
- `/docs` - Documentação Swagger
- `/healthz` - Health check
- `/metrics` - Métricas do sistema

## 🛠 Tecnologias

- **Node.js 20** com TypeScript
- **Baileys** - Conecta ao WhatsApp Web
- **Express** - API REST
- **Google Gemini AI** - Classificação de intenções
- **SPTrans API** - Dados de transporte público
- **Google Maps API** - Rotas (opcional)
- **Axios** - HTTP client com retry
- **Pino** - Logging estruturado
- **Helmet** - Segurança
- **Express Rate Limit** - Rate limiting
- **Swagger** - Documentação API

## 📦 Pré-requisitos

- Node.js 20+
- npm ou yarn
- Token da SPTrans API ([obter aqui](https://www.sptrans.com.br/desenvolvedores/))
- API Key do Google Gemini ([obter aqui](https://makersuite.google.com/app/apikey))
- API Key do Google Maps (opcional) ([obter aqui](https://console.cloud.google.com/))

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone <repo-url>
cd mobilizasp
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o template e crie o arquivo `.env`:

```bash
cp env-template.txt .env
```

Edite o arquivo `.env` com suas credenciais:

```env
PORT=4001
SPTRANS_TOKEN=seu_token_aqui
GEMINI_API_KEY=sua_api_key_aqui
GOOGLE_MAPS_API_KEY=sua_api_key_aqui  # Opcional
WA_SESSION_DIR=.waba-session
LOG_LEVEL=info
HTTP_TIMEOUT_MS=10000
HTTP_RETRY_MAX=2
RATE_LIMIT_RPS=5
```

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `SPTRANS_TOKEN` | Token da API SPTrans | ✅ |
| `GEMINI_API_KEY` | API Key do Google Gemini | ✅ |
| `GOOGLE_MAPS_API_KEY` | API Key do Google Maps | ❌ |
| `PORT` | Porta do servidor (padrão: 4001) | ❌ |
| `WA_SESSION_DIR` | Diretório de sessão WhatsApp | ❌ |
| `LOG_LEVEL` | Nível de log (info, debug, etc) | ❌ |

### APIs Necessárias

#### SPTrans API
1. Acesse https://www.sptrans.com.br/desenvolvedores/
2. Cadastre-se e obtenha seu token
3. Cole o token em `SPTRANS_TOKEN`

#### Google Gemini API
1. Acesse https://makersuite.google.com/app/apikey
2. Crie uma API key
3. Cole a key em `GEMINI_API_KEY`

#### Google Maps API (opcional)
1. Acesse Google Cloud Console
2. Crie projeto ou selecione existente
3. Habilite as APIs:
   - Maps JavaScript API
   - Geocoding API
   - Directions API
   - Transit API
4. Crie uma API Key
5. Cole em `GOOGLE_MAPS_API_KEY`

## 🎮 Uso

### Modo Desenvolvimento

```bash
npm run dev
```

O servidor inicia em `http://localhost:4001` e você verá um QR Code no terminal para conectar o WhatsApp.

### Modo Produção

```bash
npm run build
npm start
```

### Conectar WhatsApp

1. Inicie o servidor
2. Um QR Code aparecerá no terminal
3. Abra o WhatsApp no celular
4. Vá em **Menu > Dispositivos conectados > Conectar um dispositivo**
5. Escaneie o QR Code
6. Pronto! O bot está conectado

### Enviar Mensagens

Envie mensagens para o número conectado:

- "ajuda" - Mostra comandos
- "701U-10" - Informações da linha
- "posição 701U-10" - Onde está a linha
- "previsão 340015345" - Quando chega no ponto
- "rota Av Paulista até Bairro Zona Sul" - Como chegar

## 🔌 API REST

### Endpoints

#### `POST /api/v1/whatsapp`
Simula uma mensagem do WhatsApp via API.

**Request:**
```json
{
  "mensagem": "quando chega 701U-10 no ponto 340015345?"
}
```

**Response:**
```json
{
  "intent": {
    "type": "previsao",
    "parada": "340015345",
    "linha": "701U-10"
  },
  "data": { ... }
}
```

#### `GET /api/v1/sptrans/linhas/:termo`
Buscar linhas.

#### `GET /api/v1/sptrans/linhas/:codigo/posicao`
Posição da frota.

#### `GET /api/v1/sptrans/paradas/:codigo/previsao`
Previsão de chegada.

#### `GET /healthz`
Health check do servidor.

#### `GET /docs`
Documentação Swagger.

#### `GET /metrics`
Métricas do sistema.

## 🏗 Arquitetura

```
src/
├── app.ts                    # Configuração Express
├── server.ts                 # Bootstrap da aplicação
├── config.ts                 # Configurações e variáveis de ambiente
├── logger.ts                 # Configuração Pino
├── middlewares/
│   ├── error.ts             # Tratamento de erros
│   └── security.ts          # Middlewares de segurança
├── routes/
│   ├── sptrans.routes.ts    # Rotas SPTrans
│   ├── whatsapp.routes.ts  # Rotas WhatsApp
│   └── maps.routes.ts       # Rotas Google Maps
├── services/
│   ├── whatsapp.service.ts  # Cliente WhatsApp (Baileys)
│   ├── sptrans.service.ts   # Cliente SPTrans API
│   ├── gemini.service.ts    # Cliente Gemini AI
│   ├── google.service.ts    # Cliente Google Maps
│   ├── intent.service.ts    # Classificação de intenções
│   └── formatters.service.ts # Formatação de respostas
└── utils/
    ├── http.ts              # Helpers HTTP
    ├── text.ts              # Helpers de texto
    └── metrics.ts           # Métricas
```

### Fluxo de Mensagem

1. **Usuário** envia mensagem no WhatsApp
2. **Baileys** captura a mensagem
3. **Intent Service** classifica com Gemini AI
4. **SPTrans Service** busca dados
5. **Formatter Service** formata resposta
6. **Baileys** envia mensagem de volta

## 💻 Desenvolvimento

### Scripts Disponíveis

```bash
npm run dev      # Desenvolvimento com watch
npm run build    # Build TypeScript
npm start        # Inicia em produção
npm test         # Rodar testes
npm test:watch   # Testes em watch mode
```

### Estrutura de Código

- **TypeScript** com tipagem estrita
- **ES Modules** (import/export)
- **Separação de responsabilidades** por services
- **Middleware pattern** no Express
- **Error handling** centralizado
- **Logging estruturado** com Pino

### Testes

Os testes estão em `tests/` usando Vitest:

```bash
npm test
```

### Linting

```bash
npm run lint  # Se configurado
```

## 🐳 Docker

### Build da Imagem

```bash
docker build -t mobilizasp .
```

### Docker Compose

```bash
docker-compose up -d
```

O Docker Compose já inclui:
- Build automático
- Volume para sessão WhatsApp (`.waba-session`)
- Health check
- Porta 4001 exposta

### Arquivos Docker

- `Dockerfile` - Multi-stage build otimizado
- `docker-compose.yml` - Orquestração

### Persistência

A sessão do WhatsApp é salva em `.waba-session/` e mantida via volume no Docker.

## 📊 Monitore

### Logs

Logs em formato JSON estruturado (Pino):

```bash
npm run dev | pino-pretty
```

Ou exporte logs:

```bash
LOG_LEVEL=debug npm run dev
```

### Métricas

Acesse `/metrics` para ver:
- Total de requisições
- Status codes
- Tempo de resposta

### Health Check

```bash
curl http://localhost:4001/healthz
```

## 🔒 Segurança

- **Helmet** - Headers de segurança
- **CORS** configurado
- **Rate limiting** - Limita requisições
- **Validação** com Zod
- **Sanitização** de inputs
- **Timeout** em requisições HTTP

## 🐛 Troubleshooting

### WhatsApp não conecta

1. Delete `.waba-session/` e reconecte
2. Verifique se o QR Code não expirou
3. Tente novamente

### API SPTrans retorna erro

1. Verifique se o token está correto
2. A API pode estar temporariamente indisponível
3. Veja logs com `LOG_LEVEL=debug`

### Gemini retorna erro

1. Verifique se a API key está válida
2. Verifique quotas da API
3. Veja logs detalhados

## 📝 Licença

MIT

## 🤝 Contribuindo

Pull requests são bem-vindos! Para mudanças maiores, abra uma issue primeiro.

## 📧 Suporte

Para questões sobre o projeto, abra uma issue no GitHub.
