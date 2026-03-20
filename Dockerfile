# 第一阶段：构建静态资源
FROM crpi-sw0t0esja4aokp42-vpc.cn-guangzhou.personal.cr.aliyuncs.com/fuyaox/node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 第二阶段：提供 Nginx 服务
FROM crpi-sw0t0esja4aokp42-vpc.cn-guangzhou.personal.cr.aliyuncs.com/fuyaox/nginx:1.27-alpine

# 创建挂载目录（可选）
RUN mkdir -p /data/fuyaomap/tiles /data/fuyaomapweb/runtime

# 写入 Nginx 配置（监听 8002，并支持 SPA 和瓦片代理）
RUN printf "server {\n  listen 8002;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n\n  location / {\n    try_files \$uri \$uri/ /index.html;\n  }\n\n  location /tiles/ {\n    alias /data/tiles/;\n    try_files \$uri \$uri/ =404;\n  }\n}\n" > /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露容器内端口 8002
EXPOSE 8002

CMD ["nginx", "-g", "daemon off;"]