FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
RUN npm run build && npm prune --omit=dev

VOLUME ["/app/.waba-session"]

EXPOSE 3000
CMD ["node", "dist/server.js"]
