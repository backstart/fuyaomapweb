# 第一阶段只负责构建静态页面和前端资源。
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# 第二阶段仅提供 dist 和 nginx 配置，不包含 PMTiles 文件。
FROM nginx:1.27-alpine

RUN mkdir -p /data/fuyaomap/tiles /data/fuyaomapweb/runtime

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
