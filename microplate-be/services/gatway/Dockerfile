# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json yarn.lock tsconfig.json ./
RUN yarn config set network-timeout 300000
RUN yarn install
COPY src ./src
RUN yarn build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
EXPOSE 6400
CMD ["node", "dist/server.js"]


