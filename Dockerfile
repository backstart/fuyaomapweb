# 第一阶段：构建静态资源
FROM crpi-sw0t0esja4aokp42.cn-guangzhou.personal.cr.aliyuncs.com/fuyaox/node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 第二阶段：提供 Nginx 服务
FROM crpi-sw0t0esja4aokp42.cn-guangzhou.personal.cr.aliyuncs.com/fuyaox/nginx:1.27-alpine

# 复制构建产物和唯一的 Nginx 配置来源
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# 运行时配置和 PMTiles 都通过云效部署脚本挂载，不打进镜像。
RUN rm -f /usr/share/nginx/html/app-config.js \
    && mkdir -p /usr/share/nginx/html/runtime /data/tiles

# 暴露容器内端口 8002
EXPOSE 8002
CMD ["nginx", "-g", "daemon off;"]
