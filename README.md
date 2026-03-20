# Fuyao Map Web

`fuyaomapweb` 是地图服务平台 Web 端 V1，基于 Vue 3 + Vite + TypeScript，继续使用现有 `fuyaomap` 后端 API，以及 `MapLibre + PMTiles` 地图方案。

当前部署目标：

- 外网访问地址：`http://fuyaox.com:8002`
- 前端页面由 Nginx 提供
- 浏览器通过 `/api` 调用后端
- 浏览器通过 `/tiles/city.pmtiles` 读取底图
- `city.pmtiles` 放在服务器本地目录，不进入仓库、不进入 `dist`、不进入 Docker 镜像
- 前端继续支持运行时配置

## 技术栈

- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Axios
- Element Plus
- MapLibre GL JS
- pmtiles
- nginx:alpine

## 运行时配置

项目已采用运行时配置：

- [public/app-config.js](/d:/Code/Dev/fuyaomapweb/public/app-config.js)
- [src/config/appConfig.ts](/d:/Code/Dev/fuyaomapweb/src/config/appConfig.ts)

页面启动时先加载 `/app-config.js`，然后前端统一按以下优先级读取配置：

1. `window.__APP_CONFIG__`
2. `import.meta.env`
3. 项目默认值

当前默认内容：

```js
window.__APP_CONFIG__ = {
  API_BASE_URL: '/api',
  PMTILES_URL: '/tiles/city.pmtiles'
};
```

说明：

- API 地址优先使用 `/api`
- PMTiles 地址优先使用 `/tiles/city.pmtiles`
- 如果以后地址变化，只改 `app-config.js` 或 Nginx，不需要重新 build 前端

## 服务器目录约定

生产环境使用以下目录：

- 前端 `dist`：`/www/docker/fuyaomapweb/dist`
- 前端 Nginx 配置：`/www/docker/fuyaomapweb/nginx/default.conf`
- 前端运行时配置：`/www/docker/fuyaomapweb/runtime/app-config.js`
- 地图底图目录：`/www/docker/fuyaomap/tiles`
- 最终底图文件：`/www/docker/fuyaomap/tiles/city.pmtiles`

## 如何打包前端

```bash
cd D:\Code\Dev\fuyaomapweb
npm install
npm run build
```

构建完成后，将 `dist` 上传到：

```text
/www/docker/fuyaomapweb/dist
```

## 需要放到服务器上的文件

### 1. 前端静态资源

将本地构建产物上传到：

```text
/www/docker/fuyaomapweb/dist
```

### 2. Nginx 配置

将项目中的：

- [nginx/default.conf](/d:/Code/Dev/fuyaomapweb/nginx/default.conf)

上传到：

```text
/www/docker/fuyaomapweb/nginx/default.conf
```

### 3. 运行时配置

将项目中的：

- [public/app-config.js](/d:/Code/Dev/fuyaomapweb/public/app-config.js)

上传到：

```text
/www/docker/fuyaomapweb/runtime/app-config.js
```

### 4. 地图底图

将 `city.pmtiles` 放到：

```text
/www/docker/fuyaomap/tiles/city.pmtiles
```

说明：

- `city.pmtiles` 不放入前端仓库
- `city.pmtiles` 不放入 `dist`
- `city.pmtiles` 不打进 Docker 镜像

## Nginx 配置说明

生产配置文件：

- [nginx/default.conf](/d:/Code/Dev/fuyaomapweb/nginx/default.conf)

完整内容如下：

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location = /app-config.js {
        alias /data/fuyaomapweb/runtime/app-config.js;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://YOUR_BACKEND_HOST/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    location /tiles/ {
        alias /data/fuyaomap/tiles/;

        types {
            application/octet-stream pmtiles;
        }

        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=86400";
        try_files $uri =404;
    }
}
```

说明：

- 容器内固定监听 `80`
- 对外通过 Docker 端口映射 `8002:80`
- `/api/` 要把 `YOUR_BACKEND_HOST` 替换成真实后端域名或地址
- `/tiles/` 直接指向容器内 `/data/fuyaomap/tiles/`
- `/app-config.js` 直接指向容器内 `/data/fuyaomapweb/runtime/app-config.js`

## Dockerfile

[Dockerfile](/d:/Code/Dev/fuyaomapweb/Dockerfile) 完整内容如下：

```dockerfile
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
```

说明：

- 镜像只包含 `dist` 和 Nginx 配置
- 不复制 `city.pmtiles`
- 不复制 `tiles` 目录
- `city.pmtiles` 通过 volume 挂载进入容器

## docker run 示例

先构建镜像：

```bash
docker build -t fuyaomapweb:latest .
```

运行示例：

```bash
docker run -d \
  --name fuyaomapweb \
  -p 8002:80 \
  -v /www/docker/fuyaomapweb/dist:/usr/share/nginx/html:ro \
  -v /www/docker/fuyaomapweb/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro \
  -v /www/docker/fuyaomapweb/runtime/app-config.js:/data/fuyaomapweb/runtime/app-config.js:ro \
  -v /www/docker/fuyaomap/tiles:/data/fuyaomap/tiles:ro \
  fuyaomapweb:latest
```

启动后访问：

```text
http://fuyaox.com:8002
```

## 如何替换后端代理地址

只需要修改服务器上的：

```text
/www/docker/fuyaomapweb/nginx/default.conf
```

把：

```nginx
proxy_pass http://YOUR_BACKEND_HOST/api/v1/;
```

改成真实后端地址，例如：

```nginx
proxy_pass http://api.example.com:7165/api/v1/;
```

然后重启容器即可，不需要重新 build 前端。

## 验证

建议至少确认以下几点：

- `npm run build` 通过
- `dist` 中不存在 `city.pmtiles`
- Docker 镜像中不包含 `city.pmtiles`
- 服务器本地存在 `/www/docker/fuyaomap/tiles/city.pmtiles`
- 浏览器可访问 `http://fuyaox.com:8002/tiles/city.pmtiles`
- 浏览器访问 `http://fuyaox.com:8002` 可打开前端页面
- 浏览器请求 `/api/*` 时由前端服务器 Nginx 转发到真实后端
