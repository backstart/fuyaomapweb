# Fuyao Map Web

`fuyaomapweb` 是基于 Vue 3 + Vite + TypeScript 实现的地图服务平台 Web 端 V1，直接对接现有 `D:\Code\Dev\fuyaomap` 后端，不改动后端业务逻辑。

当前版本已完成：

- 地图主页 `/map`
- 店铺列表页 `/shops`
- 区域列表页 `/areas`
- MapLibre 底图接入
- 店铺点位 GeoJSON 渲染
- 区域面 GeoJSON 渲染
- 统一搜索并联动地图定位
- 图层开关、要素点击弹窗、列表跳转地图

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

## 已分析并适配的后端契约

本项目已先分析 `D:\Code\Dev\fuyaomap` 的控制器、DTO、AppService、Repository，并实际启动 API 拉取 Swagger 与真实响应样本。

确认结果如下：

- API 根前缀：`/api/v1`
- 后端 Host：默认 `http://localhost:7165`
- Swagger：`http://localhost:7165/swagger`
- 成功响应：控制器返回 `Ok(result.Data)`，前端拿到的是业务数据本身，不是完整 `Result<T>`
- 错误响应：`BadRequest(result)` / `NotFound(result)`，此时才会返回 `Result<T>` 结构
- 分页结构：`{ items, total, page, pageSize }`
- 店铺列表接口：`GET /api/v1/map/shops`
- 店铺详情接口：`GET /api/v1/map/shops/{id}`
- 店铺 GeoJSON 接口：`GET /api/v1/map/shops/geojson`
- 区域列表接口：`GET /api/v1/map/areas`
- 区域详情接口：`GET /api/v1/map/areas/{id}`
- 区域 GeoJSON 接口：`GET /api/v1/map/areas/geojson`
- 统一搜索接口：`GET /api/v1/map/search`
- 三类查询接口都支持 `bbox=minLon,minLat,maxLon,maxLat`

### 真实 DTO 字段

店铺详情：

- `id`
- `name`
- `category`
- `remark`
- `icon`
- `status`
- `longitude`
- `latitude`
- `createTime`
- `updateTime`
- `createBy`
- `updateBy`

区域详情：

- `id`
- `name`
- `type`
- `remark`
- `styleJson`
- `status`
- `geometryGeoJson`
- `createTime`
- `updateTime`
- `createBy`
- `updateBy`

统一搜索项：

- `id`
- `name`
- `itemType`，值为 `shop | area`
- `classification`
- `status`
- `longitude`
- `latitude`
- `geometryGeoJson`
- `updateTime`

### GeoJSON 返回格式

店铺 GeoJSON：

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 1,
      "geometry": { "type": "Point", "coordinates": [121.47, 31.23] },
      "properties": {
        "name": "xx",
        "category": "retail",
        "remark": "xx",
        "icon": "shop",
        "status": 1
      }
    }
  ]
}
```

区域 GeoJSON：

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 1,
      "geometry": { "type": "Polygon", "coordinates": [] },
      "properties": {
        "name": "xx",
        "type": "business",
        "remark": "xx",
        "styleJson": "{\"fill\":\"#0ea5e9\"}",
        "status": 1
      }
    }
  ]
}
```

## 项目结构

```text
fuyaomapweb/
  src/
    api/
    components/
      common/
      map/
      search/
    composables/
    layouts/
    router/
    stores/
    styles/
    types/
    utils/
    views/
      map/
      shops/
      areas/
    App.vue
    main.ts
  public/
  .env.development
  .env.production
  .env.example
  package.json
  vite.config.ts
  README.md
```

## 安装与启动

### 1. 安装依赖

```bash
npm install
```

如果当前环境对默认 npm cache 目录有限制，可使用：

```bash
npm install --cache .npm-cache --ignore-scripts
```

### 2. 启动开发环境

```bash
npm run dev
```

默认前端地址：

- `http://localhost:5173`

### 3. 生产构建

```bash
npm run build
```

## 环境变量

### `.env.development`

```env
VITE_API_BASE_URL=http://localhost:7165/api/v1
VITE_MAP_BASE_URL=
```

### 变量说明

- `VITE_API_BASE_URL`
  指向 fuyaomap 的 API 根路径，建议直接写到 `/api/v1`
- `VITE_MAP_BASE_URL`
  指向现有底图服务地址，支持两种方式：
  - MapLibre Style JSON URL
  - `.pmtiles` 文件地址

如果未配置 `VITE_MAP_BASE_URL`，页面会使用空白底图，但业务图层仍可正常渲染。

## 如何连接现有后端 API

1. 启动后端：

```bash
cd D:\Code\Dev\fuyaomap
dotnet run --project src/Fuyao.Map.ApiHost/Fuyao.Map.ApiHost.csproj
```

2. 保持前端 `.env.development` 为：

```env
VITE_API_BASE_URL=http://localhost:7165/api/v1
```

3. 启动前端：

```bash
cd D:\Code\Dev\fuyaomapweb
npm run dev
```

## 如何配置地图底图服务

如果你的现有地图平台暴露的是 MapLibre style：

```env
VITE_MAP_BASE_URL=https://your-map-host/styles/basic/style.json
```

如果暴露的是 PMTiles 文件：

```env
VITE_MAP_BASE_URL=https://your-map-host/data/basemap.pmtiles
```

前端会自动：

- 初始化 MapLibre 地图
- 尝试注册 `pmtiles://` 协议
- 在 `.pmtiles` 地址场景下自动生成基础 style

## 页面说明

### `/map`

- 加载底图
- 拉取店铺 GeoJSON
- 拉取区域 GeoJSON
- 地图点位/面图层渲染
- 点击要素弹窗
- 图层开关
- 搜索结果定位
- 列表页跳转后的地图定位

### `/shops`

- 店铺分页列表
- 关键字筛选
- 分类筛选
- 状态筛选
- 跳转地图定位

### `/areas`

- 区域分页列表
- 关键字筛选
- 类型筛选
- 状态筛选
- 跳转地图定位

## 前端实现要点

- Axios 统一实例在 `src/api/http.ts`
- 已兼容成功响应直接返回数据、失败响应返回 `Result<T>` 的情况
- Map 初始化逻辑集中在 `src/composables/useMapLibre.ts`
- 业务图层逻辑集中在 `src/composables/useMapLayers.ts`
- 地图状态集中在 `src/stores/mapStore.ts`
- 店铺/区域列表与 GeoJSON 数据分别在 `shopStore` / `areaStore`

## 后续扩展建议

- 新增/编辑/删除店铺与区域表单
- 区域绘制与几何编辑
- 图层样式配置面板
- 地图联动 bbox 查询节流
- 登录鉴权与权限控制
- 更细粒度的按需加载，继续优化打包体积

## 当前验证结果

已在本地执行：

- 后端 Swagger 抓取与接口样本验证
- `npm run build`

构建通过，说明当前工程可以安装依赖后直接运行。若地图底图不显示，优先检查 `VITE_MAP_BASE_URL` 是否已配置为真实可访问地址。
