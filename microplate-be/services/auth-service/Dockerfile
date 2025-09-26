###########
# DEPS    #
###########
FROM node:20-alpine AS deps
WORKDIR /app

# system deps
RUN apk add --no-cache openssl libc6-compat ca-certificates

# 1) ติดตั้ง deps (รวม dev) ด้วย yarn
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

###########
# BUILDER #
###########
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat ca-certificates

# 2) เอา node_modules ที่ลงครบ (มี devDeps) มาใช้ build
COPY --from=deps /app/node_modules ./node_modules

# 3) คัดลอกซอร์สทั้งหมด (ต้องแน่ใจว่า .dockerignore ไม่บล็อก src/, tsconfig.json, prisma/)
COPY . .

# 4) Prisma generate ก่อน build (เพื่อให้ types/@prisma/client พร้อม)
RUN yarn prisma generate --schema=./prisma/schema.prisma

# 5) build -> dist
RUN yarn build \
 && node -v \
 && echo "=== BUILDER ls dist ===" && ls -la dist || true \
 && echo "=== BUILDER ls dist/src ===" && ls -la dist/src || true

###########
# RUNTIME #
###########
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat ca-certificates

# 6) ติดตั้งเฉพาะ prod deps ใน runtime
COPY package.json yarn.lock ./
COPY prisma ./prisma
RUN yarn install --frozen-lockfile --production && yarn cache clean

# 7) คัดลอก Prisma client ที่ generate แล้วจาก builder เข้ามา (สำคัญ: ทำหลัง install)
#    ตรงนี้จะเอาไฟล์ใน node_modules/.prisma (รวม binary engines) มาไว้ที่ runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# 8) คัดลอกไฟล์ build จาก builder
COPY --from=builder /app/dist ./dist

# non-root
RUN addgroup -g 1001 -S nodejs \
 && adduser -S auth-service -u 1001 \
 && chown -R auth-service:nodejs /app
USER auth-service

EXPOSE 6401

# healthcheck (ปรับ path ถ้าต่าง)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:6401/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 9) จุดเข้าใช้งาน — ตรวจว่าออกเป็น dist/server.js หรือ dist/src/server.js
CMD ["node", "dist/server.js"]
# ถ้า build ได้เป็น dist/src/server.js ให้เปลี่ยนเป็น:
# CMD ["node", "dist/src/server.js"]
