# Finance tracker: React frontend + Express API, runs in Docker and connects to Postgres
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image: serve built frontend + API
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --from=builder /app/dist ./dist
COPY server ./server
COPY db ./db
COPY tsconfig.json tsconfig.server.json ./

ENV NODE_ENV=production
EXPOSE 3001

# Listen on all interfaces so container is reachable from host
ENV PORT=3001
CMD ["npx", "tsx", "server/index.ts"]
