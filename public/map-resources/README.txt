Fuyao Basemap Map Resources
============================

资源清单
- Manifest: /map-resources/manifest.json
- Style: /map-resources/styles/amap-like.json
- Tiles: /tiles/city.pmtiles
- Demo: /map-resources/examples/maplibre-demo.html
- Embedded: /map-resources/embedded.html
- Embedded Demo: /map-resources/examples/embedded-demo.html

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

嵌入式地图页
------------
- 嵌入页地址：/map-resources/embedded.html
- 适用场景：iframe、普通网页弹窗、uni-app web-view
- 主要 URL 参数：
  - center=lng,lat
  - zoom=number
  - bearing=number
  - pitch=number
  - marker=lng,lat
  - mode=view|pick
  - style=amap-like
- pick 模式行为：
  - 点击地图后会在点击位置落一个默认 marker
  - 同时发送 map-click，payload 至少包含 lng / lat / zoom
  - marker 更新后会发送 marker-updated
- 对外消息格式：
  { source: 'fuyaomap-embedded', type: 'map-ready', payload: { ... } }
- 出站消息：
  map-ready / map-click / marker-updated / marker-click / viewport-change
- 入站控制消息：
  set-center / set-zoom / fly-to / set-marker / clear-marker

普通网页 iframe 接入示例
-----------------------
<iframe
  id="fuyaoMap"
  src="/map-resources/embedded.html?mode=pick&center=113.4445,22.4915&zoom=12"
  style="width:100%;height:480px;border:0"
></iframe>

<script>
  const iframe = document.getElementById('fuyaoMap');
  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message?.source !== 'fuyaomap-embedded') {
      return;
    }

    if (message.type === 'map-click') {
      console.log('picked point:', message.payload);
    }

    if (message.type === 'marker-updated') {
      console.log('marker state:', message.payload);
    }
  });

  iframe.contentWindow?.postMessage({
    type: 'fly-to',
    payload: {
      center: [113.472, 22.507],
      zoom: 14
    }
  }, '*');
</script>

uni-app web-view 接入示例
-------------------------
<template>
  <web-view
    ref="mapView"
    class="map-webview"
    :src="embeddedSrc"
    @message="handleMapMessage"
    @onPostMessage="handleMapMessage"
  />
</template>

<script>
export default {
  data() {
    return {
      embeddedSrc: '/map-resources/embedded.html?mode=pick&center=113.4445,22.4915&zoom=12'
    };
  },
  methods: {
    handleMapMessage(event) {
      const rawList = Array.isArray(event?.detail?.data) ? event.detail.data : [event?.detail?.data];
      rawList.forEach((item) => {
        const message = item?.data ?? item;
        if (message?.source !== 'fuyaomap-embedded') {
          return;
        }

        if (message.type === 'map-click') {
          console.log('uni-app picked point:', message.payload);
        }

        if (message.type === 'marker-updated') {
          console.log('uni-app marker state:', message.payload);
        }
      });
    },
    setMarkerFromHost(lng, lat) {
      const command = JSON.stringify({
        type: 'set-marker',
        payload: { lng, lat }
      });
      this.$refs.mapView?.evalJS?.(
        `window.__FUYAO_EMBEDDED_MAP__ && window.__FUYAO_EMBEDDED_MAP__.receiveHostMessage(${command})`
      );
    }
  }
};
</script>

说明
----
- 这套 style 与后台地图页面共用 src/map/amapLikeStyle.ts 的核心样式构造逻辑。
- manifest.json 提供推荐 style URL、tiles URL、默认视角和支持客户端说明。
- examples/maplibre-demo.html 可直接验证资源是否正常。
- embedded.html 可直接作为地图嵌入页使用，embedded-demo.html 用于验证 URL 参数与 postMessage 控制。
- 嵌入页会优先走 window.parent.postMessage；若运行环境暴露 uni.postMessage，也会同步向 uni-app web-view 发送消息。
- 构建阶段已读取本地 PMTiles 文件：D:\Code\Dev\fuyaomapweb\public\tiles\city.pmtiles
- 当前构建未设置 MAP_RESOURCES_PUBLIC_ORIGIN，style 内部 tiles 地址使用同源路径 /tiles/city.pmtiles。
- uni-app 官方文档说明：web-view 页面对外发消息使用 uni.postMessage，H5 可直接使用 window.postMessage；宿主向 web-view 注入控制消息可通过 evalJS。
- 如果外部网页部署在不同 origin，建议在构建时设置环境变量 MAP_RESOURCES_PUBLIC_ORIGIN=https://your-map-host。
