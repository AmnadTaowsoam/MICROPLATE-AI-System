FROM node:20-alpine AS base
WORKDIR /app

# Install deps and generate lockfile
COPY package.json tsconfig.json ./
RUN npm install --ignore-scripts --no-audit --fund=false && npm ci --ignore-scripts

COPY src ./src

RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install only production deps
COPY package.json ./package.json
RUN npm install --omit=dev --ignore-scripts --no-audit --fund=false

COPY --from=base /app/dist ./dist
EXPOSE 6402
CMD ["node", "dist/server.js"]

