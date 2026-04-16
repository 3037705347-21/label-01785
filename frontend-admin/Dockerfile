# 多阶段构建 - 支持 ARM64 和 AMD64
# 构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache python3 make g++

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm install --legacy-peer-deps

# 复制源代码
COPY . .

# 构建前端应用
RUN npm run build:web

# 生产镜像 - 跨平台支持 (node:20-alpine 支持 linux/amd64, linux/arm64)
FROM node:20-alpine AS production

# 安装运行时依赖 (Chromium 用于 Puppeteer)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl \
    && rm -rf /var/cache/apk/*

# 设置 Puppeteer 环境变量
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    PORT=8081

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# 复制构建产物和服务端代码
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./

# 只安装生产依赖
RUN npm install --only=production --legacy-peer-deps && \
    npm cache clean --force

# 创建截图目录并设置权限
RUN mkdir -p /app/screenshots && chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 8081

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

# 启动命令
CMD ["node", "server/index.js"]
