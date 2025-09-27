###########
# DEPS    #
###########
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat ca-certificates

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile   # ลงทั้ง dev+prod (มี typescript, tsc-alias)

###########
# BUILDER #
###########
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat ca-certificates

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# กันหลง build เก่า
RUN rm -rf dist && yarn build && (echo "=== ls dist ===" && ls -la dist || true)

###########
# RUNTIME #
###########
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat ca-certificates

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 6405
# ✅ รัน Express อันเดียว (ไม่ fallback ไปไฟล์เก่าอีก)
CMD ["node","dist/server.js"]
