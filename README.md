# Fuyao Map Web

`fuyaomapweb` 是地图服务平台 Web 端，基于 `Vue 3 + Vite + TypeScript + MapLibre`，当前已经按最终架构接入后端正式服务层与导入治理层。

docker run --rm -v //d/mapdata:/data -e JAVA_TOOL_OPTIONS="-Xmx8g" ghcr.io/onthegomap/planetiler:0.8.4 --osm-path=/data/wuguishan.pbf --output=/data/city.pmtiles --download --force --maxzoom=15 --minzoom=5 --languages=zh,zh-Hans,en --fetch-wikidata=false --building-merge-z13=false

docker run --rm -v //d/mapdata:/data -e JAVA_TOOL_OPTIONS="-Xmx8g" ghcr.io/onthegomap/planetiler:latest --osm-path=/data/city.osm.pbf --output=/data/city.pmtiles --download --maxzoom=15 --minzoom=0 --languages=zh,zh-Hans,en --fetch-wikidata=false --building-merge-z13=false

项目路径：`D:\Code\Dev\fuyaomapweb`

后端项目：`D:\Code\Dev\fuyaomap`

## 最终前端能力

### 登录与认证
- 登录页：`/login`
- JWT 登录
- 未登录访问业务页自动跳转登录页

### 正式服务层业务页面
- 地图总览：`/map`
- 店铺管理：`/shops`
- 区域管理：`/areas`
- POI 管理：`/pois`
- 地名管理：`/places`
- 边界管理：`/boundaries`

### 导入治理页面
- 导入管理：`/imports`

## 对接的后端表分层

### 前端直接消费的正式服务层
- `map_shops`
- `map_areas`
- `map_pois`
- `map_places`
- `map_boundaries`

### 前端只在后台管理页使用的导入治理层
- `map_import_tasks`
- `map_import_task_logs`
- `map_import_records`

### 前端不直接消费
- `osm_features_raw`
- `sys_users` 仅通过认证接口间接使用

## 技术栈

- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Axios
- Element Plus
- MapLibre GL JS
- PMTiles

## 本地开发

安装：

```bash
npm install
```

启动：

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

构建：

```bash
npm run build
```

## 开发环境 API 访问

本地开发默认走 Vite 代理，避免浏览器 CORS：

- 前端请求：`/api`
- Vite 代理目标：`DEV_API_PROXY_TARGET`
- 默认后端：`http://localhost:7165`

相关文件：
- [vite.config.ts](D:\Code\Dev\fuyaomapweb\vite.config.ts)
- [src/config/appConfig.ts](D:\Code\Dev\fuyaomapweb\src\config\appConfig.ts)
- [public/app-config.js](D:\Code\Dev\fuyaomapweb\public\app-config.js)

### 环境变量

[.env.development](D:\Code\Dev\fuyaomapweb\.env.development)
```env
VITE_API_BASE_URL=/api
DEV_API_PROXY_TARGET=http://localhost:7165
VITE_PMTILES_URL=/tiles/city.pmtiles
```

[.env.production](D:\Code\Dev\fuyaomapweb\.env.production)
```env
VITE_API_BASE_URL=/api
VITE_PMTILES_URL=/tiles/city.pmtiles
```

## 运行时配置

生产环境优先使用：
- [public/app-config.js](D:\Code\Dev\fuyaomapweb\public\app-config.js)

默认内容：

```js
window.__APP_CONFIG__ = {
  API_BASE_URL: '/api',
  PMTILES_URL: '/tiles/city.pmtiles'
};
```

说明：
- 开发环境优先 `.env`
- 生产环境优先 `window.__APP_CONFIG__`

## 地图与图层

地图总览页当前支持五类正式服务层图层：

- 店铺点位
- 区域面
- POI 点位
- 地名点/聚落
- 边界面/边界线

能力：
- 独立图层开关
- 要素点击弹窗
- 搜索结果定位与高亮
- 基于 bbox 的后端 GeoJSON 查询

## 菜单与页面

当前菜单已统一为：

- 地图总览
- 店铺管理
- 区域管理
- POI 管理
- 地名管理
- 边界管理
- 导入管理

## 统一搜索

前端统一搜索已适配五类实体：

- `shop`
- `area`
- `poi`
- `place`
- `boundary`

搜索行为：
- 展示实体类型标识
- 点击结果后地图定位
- 右侧详情面板按实体类型展示

## 导入管理

导入管理页当前面向后台治理链路：

- 上传 `.osm.pbf`
- 服务器路径导入
- 创建任务
- 启动/取消
- 查看任务详情与日志

页面展示统计已适配最终导入体系：
- 原始要素
- 店铺
- 区域
- POI
- 地名
- 边界
- 映射关系

## 部署

### Docker 运行方式

当前前端镜像已与真实云效运行方式对齐：

```bash
docker run -d \
  --name fuyao-map-web \
  --restart unless-stopped \
  -p 8002:8002 \
  -v /www/docker/fuyaomap/tiles:/data/tiles \
  -v /www/docker/fuyaomapweb/runtime:/usr/share/nginx/html/runtime \
  ${IMG}
```

### 容器内路径

- PMTiles：`/data/tiles/city.pmtiles`
- runtime 配置：`/usr/share/nginx/html/runtime/app-config.js`

### Nginx

关键文件：
- [nginx/default.conf](D:\Code\Dev\fuyaomapweb\nginx\default.conf)
- [Dockerfile](D:\Code\Dev\fuyaomapweb\Dockerfile)

关键约定：
- 容器监听 `8002`
- `/tiles/` 指向 `/data/tiles/`
- `/api/` 代理真实后端
- `/app-config.js` 指向 runtime 挂载目录

## 最终系统数据流

```text
登录认证
-> /api/auth/*

地图服务查询
-> /api/map/shops
-> /api/map/areas
-> /api/map/pois
-> /api/map/places
-> /api/map/boundaries
-> /api/map/search

导入治理
-> /api/map/imports/*
```

## 最终验收结论

### 已完成
- 五类正式服务层页面已接入
- 地图总览已支持五类业务图层
- 统一搜索已支持五类实体
- 导入管理已适配最终导入链路展示
- 登录、JWT 与路由守卫已接入
- API 地址、PMTiles 地址、运行时配置已统一

### 仍保留但不对外暴露的数据层
- `osm_features_raw`
- `map_import_*`

### 部署注意事项
- 开发环境优先使用 Vite `/api` 代理
- 生产环境优先使用 `app-config.js`
- `city.pmtiles` 不打进前端镜像
- `/tiles/` 必须由前端服务器本地目录挂载提供
- `/api/` 必须代理到后端，不要回指前端自己
