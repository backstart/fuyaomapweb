# Fuyao Map Web

`fuyaomapweb` 是地图服务平台 Web 端 V1，基于 Vue 3 + Vite + TypeScript，继续使用现有 `fuyaomap` 后端 API，以及 `MapLibre + PMTiles` 地图方案。

本项目当前必须严格适配的真实云效部署场景如下：

```bash
docker run -d \
  --name fuyao-map-web \
  --restart unless-stopped \
  -p 8002:8002 \
  -v /www/docker/fuyaomap/tiles:/data/tiles \
  -v /www/docker/fuyaomapweb/runtime:/usr/share/nginx/html/runtime \
  ${IMG}
```

并且健康检查使用：

```bash
curl -fsS http://127.0.0.1:8002/
```

这意味着：

- 容器内必须监听 `8002`
- 不能再假设容器内监听 `80`
- 底图挂载到容器内 `/data/tiles`
- 运行时配置挂载到容器内 `/usr/share/nginx/html/runtime`
- 浏览器外网访问地址是 `http://fuyaox.com:8002`

## 运行时配置

项目已采用运行时配置：

- [public/app-config.js](/d:/Code/Dev/fuyaomapweb/public/app-config.js)
- [src/config/appConfig.ts](/d:/Code/Dev/fuyaomapweb/src/config/appConfig.ts)

页面启动时固定请求 `/app-config.js`，Nginx 会把它映射到挂载目录中的：

```text
/usr/share/nginx/html/runtime/app-config.js
```

当前运行时配置内容：

```js
window.__APP_CONFIG__ = {
  API_BASE_URL: '/api',
  PMTILES_URL: '/tiles/city.pmtiles'
};
```

说明：

- API 地址统一走 `/api`
- PMTiles 地址统一走 `/tiles/city.pmtiles`
- 构建产物里不再依赖固定后端域名
- 生产上只需要改运行时配置或 Nginx，不需要重新 build 前端

## 路径映射

宿主机真实路径：

- 底图目录：`/www/docker/fuyaomap/tiles`
- 底图文件：`/www/docker/fuyaomap/tiles/city.pmtiles`
- runtime 目录：`/www/docker/fuyaomapweb/runtime`

容器内真实路径：

- PMTiles：`/data/tiles/city.pmtiles`
- runtime 目录：`/usr/share/nginx/html/runtime`
- runtime 配置文件：`/usr/share/nginx/html/runtime/app-config.js`

## Dockerfile

[Dockerfile](/d:/Code/Dev/fuyaomapweb/Dockerfile) 现在只保留一套 Nginx 配置来源，并且不再内联生成配置。最终内容如下：

```dockerfile
# 第一阶段：构建静态资源
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 第二阶段：提供 Nginx 服务
FROM nginx:1.27-alpine

# 复制构建产物和唯一的 Nginx 配置来源
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# 运行时配置和 PMTiles 都通过云效部署脚本挂载，不打进镜像。
RUN rm -f /usr/share/nginx/html/app-config.js \
    && mkdir -p /usr/share/nginx/html/runtime /data/tiles

# 暴露容器内端口 8002
EXPOSE 8002
CMD ["nginx", "-g", "daemon off;"]
```

关键点：

- 容器内监听 `8002`
- Dockerfile 不再 `RUN printf ... > default.conf`
- 只通过 `COPY nginx/default.conf /etc/nginx/conf.d/default.conf`
- 不把 `city.pmtiles` 打进镜像
- 不把 runtime 配置打进镜像

## Nginx 配置

[nginx/default.conf](/d:/Code/Dev/fuyaomapweb/nginx/default.conf) 最终内容如下：

```nginx
server {
    listen 8002;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location = /app-config.js {
        alias /usr/share/nginx/html/runtime/app-config.js;
        add_header Cache-Control "no-store";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://YOUR_BACKEND_HOST;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    location /tiles/ {
        alias /data/tiles/;

        types {
            application/octet-stream pmtiles;
        }

        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=86400";
        try_files $uri =404;
    }
}
```

关键点：

- `listen 8002;`
- `location /` 使用 `try_files` 兼容 Vue history 模式
- `/tiles/` 严格指向 `/data/tiles/`
- `/api/` 必须替换成真实后端地址，不能写成 `fuyaox.com:8002`
- `/app-config.js` 严格映射到 `/usr/share/nginx/html/runtime/app-config.js`

## 当前云效部署如何适配本项目

当前云效脚本不需要推翻，仍然可以继续：

1. 构建镜像
2. 推送镜像
3. 服务器拉取镜像
4. 删除旧容器
5. 用固定 `docker run` 启动

因为现在项目已经和这套真实运行方式对齐：

- 镜像内部监听 `8002`
- `/tiles/` 对齐到容器内 `/data/tiles/`
- `/app-config.js` 对齐到容器内 `/usr/share/nginx/html/runtime`
- `/api/` 留给 Nginx 转发真实后端

## 如何替换后端代理地址

修改 [nginx/default.conf](/d:/Code/Dev/fuyaomapweb/nginx/default.conf) 中这行：

```nginx
proxy_pass http://YOUR_BACKEND_HOST;
```

替换为真实后端地址，例如：

```nginx
proxy_pass http://api.example.com:7165;
```

注意：

- 不能写成 `http://fuyaox.com:8002/`
- 否则 `/api` 请求会再次打回前端自己，形成错误代理

## 如何保证 `/tiles/city.pmtiles` 可访问

满足下面两点即可：

1. 宿主机存在：

```text
/www/docker/fuyaomap/tiles/city.pmtiles
```

2. 云效运行容器时保持这条挂载：

```bash
-v /www/docker/fuyaomap/tiles:/data/tiles
```

因为 Nginx 中已经固定配置：

```nginx
location /tiles/ {
    alias /data/tiles/;
}
```

所以浏览器访问：

```text
http://fuyaox.com:8002/tiles/city.pmtiles
```

就会命中容器内：

```text
/data/tiles/city.pmtiles
```

## 验证

建议至少确认以下几点：

- `npm run build` 通过
- `dist` 中不包含 `city.pmtiles`
- 镜像中不包含 `city.pmtiles`
- 容器内服务监听 `8002`
- `curl -fsS http://127.0.0.1:8002/` 返回成功
- 浏览器访问 `http://fuyaox.com:8002` 可打开页面
- 浏览器访问 `http://fuyaox.com:8002/tiles/city.pmtiles` 可访问底图
- 浏览器请求 `/api/*` 时不会再错误代理回前端自己

## 导入管理页

当前前端已新增导入管理页面：

- 路由：`/imports`
- 能力：上传 `.osm.pbf`、指定服务器已有文件路径、创建并启动导入任务、轮询进度、查看任务详情、查看导入日志

该页面直接调用后端：

- `POST /api/map/imports/upload`
- `POST /api/map/imports`
- `POST /api/map/imports/{id}/start`
- `POST /api/map/imports/{id}/cancel`
- `GET /api/map/imports`
- `GET /api/map/imports/{id}`
- `GET /api/map/imports/{id}/logs`

