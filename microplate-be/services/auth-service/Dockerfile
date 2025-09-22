###########
# BUILDER #
###########
FROM node:20-alpine AS builder
WORKDIR /app

# System deps
RUN apk add --no-cache openssl libc6-compat ca-certificates

# 1) ติดตั้ง deps (dev+prod)
COPY package.json yarn.lock ./
RUN yarn config set network-timeout 300000 \
 && yarn install --frozen-lockfile --network-timeout 300000

# 2) Prisma generate ก่อน build
COPY prisma ./prisma
RUN npx prisma generate

# 3) คัดลอกซอร์สและ build
COPY . .
RUN yarn build \
 && node -v \
 && echo "=== BUILDER ls dist ===" \
 && ls -la dist || true \
 && echo "=== BUILDER ls dist/src ===" \
 && ls -la dist/src || true

###########
# RUNTIME #
###########
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat ca-certificates

# 4) ติดตั้งเฉพาะ prod deps (postinstall ของ @prisma/client จะ gen client)
COPY package.json yarn.lock ./
COPY prisma ./prisma
RUN yarn config set network-timeout 300000 \
 && yarn install --frozen-lockfile --production --network-timeout 300000

# 5) คัดลอกไฟล์ build จาก builder
COPY --from=builder /app/dist ./dist

# non-root
RUN addgroup -g 1001 -S nodejs \
 && adduser -S auth-service -u 1001 \
 && chown -R auth-service:nodejs /app
USER auth-service

EXPOSE 6401

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:6401/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 6) รันไฟล์ entry ให้ตรงกับตำแหน่งจริง
CMD ["node", "dist/server.js"]
# ถ้าหลัง build ได้เป็น dist/src/server.js ให้เปลี่ยนเป็น:
# CMD ["node", "dist/src/server.js"]
