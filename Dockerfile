# Build stage
FROM node:20 AS builder
WORKDIR /app
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
COPY package*.json ./
RUN npm config set strict-ssl false && npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim
WORKDIR /app

# Install dependencies for better-sqlite3 (native modules)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
COPY package*.json ./
RUN npm config set strict-ssl false && npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
# We don't copy database.db here to avoid overwriting production data with dev data.
# The server.ts already has logic to create the DB and tables if they don't exist.

EXPOSE 3005
CMD ["npm", "start"]
