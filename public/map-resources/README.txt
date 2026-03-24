Fuyao Basemap Map Resources
============================

资源清单
- Manifest: /map-resources/manifest.json
- Style: /map-resources/styles/amap-like.json
- Tiles: /tiles/city.pmtiles
- Demo: /map-resources/examples/maplibre-demo.html

最小接入方法
1. 先注册 PMTiles 协议。
2. 再把 style URL 交给 MapLibre。

示例
-----
const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

new maplibregl.Map({
  container: 'map',
  style: '/map-resources/styles/amap-like.json',
  localIdeographFontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif'
});

说明
----
- 这套 style 与后台地图页面共用 src/map/amapLikeStyle.ts 的核心样式构造逻辑。
- manifest.json 提供推荐 style URL、tiles URL、默认视角和支持客户端说明。
- examples/maplibre-demo.html 可直接验证资源是否正常。
- 当前构建未设置 MAP_RESOURCES_PUBLIC_ORIGIN，style 内部 tiles 地址使用同源路径 /tiles/city.pmtiles。
- 如果外部网页部署在不同 origin，建议在构建时设置环境变量 MAP_RESOURCES_PUBLIC_ORIGIN=https://your-map-host。
