# Fuyao Map Web

`fuyaomapweb` 是地图服务平台 Web 端 V1，基于 Vue 3 + Vite + TypeScript，继续使用现有 `fuyaomap` 后端 API，以及 `MapLibre + PMTiles` 地图方案。

当前版本已补充最小可用登录能力：

- 登录页：`/login`
- 认证方式：JWT Bearer
- 登录成功后进入现有地图管理系统
- 未登录访问业务页会自动跳转到登录页
- 登录页标题固定为：`地图服务`
- 登录页背景内置类流体动态效果，并提供 WebGL 不可用时的渐变降级背景

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

认证相关接口同样走运行时配置中的 `API_BASE_URL`，默认即 `/api`。

## 登录页与认证

新增核心文件：

- [src/views/auth/LoginView.vue](/d:/Code/Dev/fuyaomapweb/src/views/auth/LoginView.vue)
- [src/components/auth/FluidBackground.vue](/d:/Code/Dev/fuyaomapweb/src/components/auth/FluidBackground.vue)
- [src/api/authApi.ts](/d:/Code/Dev/fuyaomapweb/src/api/authApi.ts)
- [src/stores/authStore.ts](/d:/Code/Dev/fuyaomapweb/src/stores/authStore.ts)

登录页能力：

- 标题固定为 `地图服务`
- 用户名、密码、记住我
- 默认跳转 `/map`
- 若 URL 中带 `redirect`，登录成功后优先跳转到该路径

默认管理员联调用于本地初始化：

- 用户名：`admin`
- 密码：`admin123456`

说明：

- 该默认账号来自后端初始化脚本，仅适用于首次部署和开发联调
- 上线后应立即修改默认密码

### 路由守卫

前端路由守卫规则：

- 未登录访问 `/map`、`/shops`、`/areas`、`/imports` 等业务页时，跳转到 `/login`
- 已登录再访问 `/login` 时，自动跳转到 `redirect` 或 `/map`
- 登录态通过 `Pinia + localStorage/sessionStorage` 持久化

### JWT 使用方式

前端登录后会保存：

- `token`
- `expiresIn`
- `userInfo`

后续 API 请求通过统一 axios 实例自动附加：

```text
Authorization: Bearer {token}
```

当后端返回 `401` 时，前端会自动清理本地登录态并跳回 `/login`。

### 流体背景实现

登录页背景没有依赖外部在线脚本，直接集成在项目内部。

实现方式：

- 优先使用原生 `WebGL + Canvas`
- 通过多组粒子、叠加混色、缓慢衰减和指针扰动，模拟近似流体扩散与拖尾感
- 鼠标移动时会对背景产生轻微扰动
- WebGL 不可用时自动降级为柔和渐变 + 模糊色团动画背景

这不是对参考站点源码的复制，但在视觉体验上尽量接近 `Fluid Simulation` 风格，同时保持企业后台登录页可读性。

## 路径映射

宿主机真实路径：

- 底图目录：`/www/docker/fuyaomap/tiles`
- 底图文件：`/www/docker/fuyaomap/tiles/city.pmtiles`
- runtime 目录：`/www/docker/fuyaomapweb/runtime`

容器内真实路径：

- PMTiles：`/data/tiles/city.pmtiles`
- runtime 目录：`/usr/share/nginx/html/runtime`
- runtime 配置文件：`/usr/share/nginx/html/runtime/app-config.js`

## 页面路由

- `/login`
  - 登录页
- `/map`
  - 地图主页
- `/shops`
  - 店铺管理
- `/areas`
  - 区域管理
- `/imports`
  - OSM 导入管理

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
    client_max_body_size 1024m;

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
        proxy_request_buffering off;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
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
- `client_max_body_size 1024m;`
- `location /` 使用 `try_files` 兼容 Vue history 模式
- `/tiles/` 严格指向 `/data/tiles/`
- `/api/` 对上传请求关闭 request buffering，并放宽超时
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

大文件上传说明：

- 前端 Nginx 已设置 `client_max_body_size 1024m`
- 浏览器上传链路适合中小文件，当前按 1GB 上限放开
- 100MB 以上的大文件更推荐使用“服务器已有文件”方式
- 推荐先把 OSM 文件放到服务器目录，例如 `/data/fuyaomap/imports/`
- 再在 `/imports` 页面填写服务器文件路径创建导入任务

## 后端登录接口

前端登录页依赖以下后端接口：

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

如果后端已启用 JWT 鉴权，登录成功后即可访问现有地图、店铺、区域、导入管理页面，无需修改现有业务页面逻辑。

