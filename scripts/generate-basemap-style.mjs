import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileSource, PMTiles } from 'pmtiles';
import ts from 'typescript';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const MAP_RESOURCES_DIR = path.join(PUBLIC_DIR, 'map-resources');
const STYLE_OUTPUT_PATH = path.join(MAP_RESOURCES_DIR, 'styles', 'amap-like.json');
const MANIFEST_OUTPUT_PATH = path.join(MAP_RESOURCES_DIR, 'manifest.json');
const DEMO_OUTPUT_PATH = path.join(MAP_RESOURCES_DIR, 'examples', 'maplibre-demo.html');
const README_TEXT_OUTPUT_PATH = path.join(MAP_RESOURCES_DIR, 'README.txt');
const README_MARKDOWN_OUTPUT_PATH = path.join(MAP_RESOURCES_DIR, 'README.md');
const VENDOR_DIR = path.join(MAP_RESOURCES_DIR, 'vendor');

const DEFAULT_BASEMAP_PMTILES_FILE = path.join(PUBLIC_DIR, 'tiles', 'city.pmtiles');
const DEFAULT_BASEMAP_PMTILES_URL = '/tiles/city.pmtiles';
const STYLE_PUBLIC_PATH = '/map-resources/styles/amap-like.json';
const MANIFEST_PUBLIC_PATH = '/map-resources/manifest.json';
const DEMO_PUBLIC_PATH = '/map-resources/examples/maplibre-demo.html';
const EMBEDDED_PUBLIC_PATH = '/map-resources/embedded.html';
const EMBEDDED_DEMO_PUBLIC_PATH = '/map-resources/examples/embedded-demo.html';
const README_PUBLIC_PATH = '/map-resources/README.md';
const README_TEXT_PUBLIC_PATH = '/map-resources/README.txt';
const SEARCH_PUBLIC_PATH = '/api/map/search';
const DEFAULT_CENTER = [113.4445, 22.4915];
const DEFAULT_ZOOM = 10;

function normalizePublicOrigin(rawOrigin) {
  const normalized = rawOrigin?.trim();
  if (!normalized) {
    return '';
  }

  return normalized.replace(/\/+$/, '');
}

function buildPublicUrl(publicOrigin, publicPath) {
  if (!publicOrigin) {
    return publicPath;
  }

  return new URL(publicPath, `${publicOrigin}/`).toString();
}

function resolveBasemapPmtilesFile(rawFilePath) {
  const normalized = rawFilePath?.trim();
  if (!normalized) {
    return DEFAULT_BASEMAP_PMTILES_FILE;
  }

  return path.isAbsolute(normalized) ? normalized : path.resolve(ROOT_DIR, normalized);
}

function resolveBasemapPmtilesUrl(rawUrl) {
  const normalized = rawUrl?.trim();
  return normalized || DEFAULT_BASEMAP_PMTILES_URL;
}

function toFiniteNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeCenter(rawCenter) {
  if (!Array.isArray(rawCenter) || rawCenter.length < 2) {
    return null;
  }

  const lng = toFiniteNumber(rawCenter[0]);
  const lat = toFiniteNumber(rawCenter[1]);
  if (lng === null || lat === null) {
    return null;
  }

  return [lng, lat];
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, value, 'utf8');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists(filePath) {
  if (!(await fileExists(filePath))) {
    return null;
  }

  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    console.warn(`[generate-basemap-style] warning: failed to parse JSON template at ${filePath}, fallback to defaults.`, error);
    return null;
  }
}

async function copyVendorFile(sourcePath, targetPath) {
  await ensureDir(path.dirname(targetPath));
  await fs.copyFile(sourcePath, targetPath);
}

async function loadPackageVersion() {
  const packageJson = JSON.parse(await fs.readFile(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  return packageJson.version?.trim() || '0.0.0';
}

async function loadAmapStyleBuilder() {
  const sourcePath = path.join(ROOT_DIR, 'src', 'map', 'amapLikeStyle.ts');
  const sourceCode = await fs.readFile(sourcePath, 'utf8');
  const compiled = ts.transpileModule(sourceCode, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ES2020
    }
  });

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`;
  return import(moduleUrl);
}

async function readArchiveMetadata(archivePath) {
  const fileBuffer = await fs.readFile(archivePath);
  const file = new File([fileBuffer], path.basename(archivePath));
  const archive = new PMTiles(new FileSource(file));
  const [header, metadata] = await Promise.all([
    archive.getHeader(),
    archive.getMetadata()
  ]);

  return {
    header,
    metadata
  };
}

function getVectorLayerIds(metadata) {
  const layerIds = metadata?.vector_layers
    ?.map((layer) => layer.id?.trim())
    .filter((layerId) => Boolean(layerId)) ?? [];

  return Array.from(new Set(layerIds));
}

function buildFallbackHeader(manifestTemplate, styleTemplate) {
  const manifestCenter = normalizeCenter(manifestTemplate?.defaultCenter);
  const styleCenter = normalizeCenter(styleTemplate?.center);
  const center = manifestCenter || styleCenter || DEFAULT_CENTER;

  const zoom = toFiniteNumber(manifestTemplate?.defaultZoom)
    ?? toFiniteNumber(styleTemplate?.zoom)
    ?? DEFAULT_ZOOM;

  return {
    centerLon: center[0],
    centerLat: center[1],
    centerZoom: zoom
  };
}

function buildStyleOptions(header, attribution) {
  return {
    styleName: 'Fuyao Basemap AMap Like',
    sourceAttribution: typeof attribution === 'string' ? attribution : undefined,
    center: [header.centerLon, header.centerLat],
    zoom: header.centerZoom
  };
}

function buildMinimalStyle(basemapSourceId, tilesUrl, header, attribution) {
  const sources = {
    [basemapSourceId]: {
      type: 'vector',
      url: `pmtiles://${tilesUrl}`
    }
  };

  if (typeof attribution === 'string' && attribution.trim()) {
    sources[basemapSourceId].attribution = attribution.trim();
  }

  return {
    version: 8,
    name: 'Fuyao Basemap AMap Like',
    center: [header.centerLon, header.centerLat],
    zoom: header.centerZoom,
    sources,
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#f6f4ef'
        }
      }
    ]
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyRuntimeTilesUrl(styleTemplate, basemapSourceId, tilesUrl, header, attribution) {
  const style = cloneJson(styleTemplate);
  const sourceUrl = `pmtiles://${tilesUrl}`;

  style.version = 8;
  style.name = typeof style.name === 'string' && style.name.trim() ? style.name : 'Fuyao Basemap AMap Like';
  style.center = [header.centerLon, header.centerLat];
  style.zoom = header.centerZoom;
  style.sources = style.sources && typeof style.sources === 'object' ? style.sources : {};

  const sourceDefinition = style.sources[basemapSourceId] && typeof style.sources[basemapSourceId] === 'object'
    ? style.sources[basemapSourceId]
    : { type: 'vector' };

  sourceDefinition.type = sourceDefinition.type || 'vector';
  sourceDefinition.url = sourceUrl;

  if (typeof attribution === 'string' && attribution.trim()) {
    sourceDefinition.attribution = attribution.trim();
  } else {
    delete sourceDefinition.attribution;
  }

  style.sources[basemapSourceId] = sourceDefinition;

  if (!Array.isArray(style.layers) || style.layers.length === 0) {
    style.layers = [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#f6f4ef'
        }
      }
    ];
  }

  return style;
}

function buildManifest({
  packageVersion,
  styleUrl,
  tilesUrl,
  searchUrl,
  demoUrl,
  embeddedUrl,
  embeddedDemoUrl,
  readmeUrl,
  readmeTextUrl,
  header
}) {
  return {
    name: 'Fuyao Basemap',
    version: packageVersion,
    styleUrl,
    styles: {
      'amap-like': styleUrl
    },
    tilesUrl,
    searchUrl,
    demoUrl,
    embeddedUrl,
    embeddedDemoUrl,
    readmeUrl,
    readmeTextUrl,
    supportedClients: [
      'MapLibre GL JS',
      'Web/H5 clients compatible with MapLibre',
      'PMTiles-enabled basemap consumers',
      'uni-app web-view containers'
    ],
    defaultCenter: [header.centerLon, header.centerLat],
    defaultZoom: header.centerZoom,
    description: 'Fuyao 内网 PMTiles 底图标准资源出口，提供 AMap-like style、manifest、嵌入式地图页与接入示例。',
    embedded: {
      messageSource: 'fuyaomap-embedded',
      supportedModes: ['view', 'pick'],
      availableLayers: ['shops', 'areas', 'pois', 'places', 'boundaries'],
      defaultLayers: ['shops', 'areas'],
      inboundTypes: ['set-center', 'set-zoom', 'fly-to', 'set-marker', 'clear-marker', 'set-layers', 'show-layer', 'hide-layer', 'search', 'locate-feature', 'highlight-feature'],
      outboundTypes: ['map-ready', 'map-click', 'marker-updated', 'marker-click', 'viewport-change', 'layers-ready', 'layers-changed', 'search-result', 'search-results', 'search-empty', 'feature-located'],
      search: {
        keywordParam: 'keyword',
        autoSearchParam: 'autoSearch',
        searchUrl,
        defaultTypes: ['shops', 'areas', 'pois', 'places', 'boundaries']
      }
    }
  };
}

function buildDemoHtml({ manifestUrl, styleUrl, tilesUrl, readmeUrl }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fuyao Basemap Demo</title>
  <link rel="stylesheet" href="../vendor/maplibre-gl.css" />
  <style>
    :root {
      color-scheme: light;
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background: #f1f4f7;
      color: #243447;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at top left, rgba(110, 168, 254, 0.14), transparent 32%),
        linear-gradient(180deg, #f5f7fa 0%, #e9eef3 100%);
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(280px, 360px) 1fr;
      min-height: 100vh;
      gap: 18px;
      padding: 18px;
    }

    .panel,
    #map {
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(36, 52, 71, 0.12);
    }

    .panel {
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(14px);
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    h1 {
      margin: 0;
      font-size: 26px;
      line-height: 1.1;
    }

    p,
    li,
    code,
    pre {
      font-size: 14px;
      line-height: 1.6;
    }

    .meta {
      display: grid;
      gap: 10px;
    }

    .meta-item {
      background: #f7f9fc;
      border: 1px solid #dbe4ee;
      border-radius: 14px;
      padding: 12px;
    }

    .meta-label {
      display: block;
      margin-bottom: 6px;
      color: #55667a;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .meta-value {
      word-break: break-all;
      color: #243447;
    }

    .status {
      margin: 0;
      padding: 12px;
      border-radius: 14px;
      background: #13263a;
      color: #f4f7fa;
      white-space: pre-wrap;
    }

    .example {
      margin: 0;
      padding: 12px;
      border-radius: 14px;
      background: #f7f9fc;
      border: 1px solid #dbe4ee;
      overflow-x: auto;
    }

    #map {
      min-height: calc(100vh - 36px);
    }

    @media (max-width: 960px) {
      .layout {
        grid-template-columns: 1fr;
      }

      #map {
        min-height: 62vh;
      }
    }
  </style>
</head>
<body>
  <div class="layout">
    <section class="panel">
      <div>
        <h1>Fuyao Basemap</h1>
        <p>这个页面验证 <code>${styleUrl}</code>、<code>${manifestUrl}</code> 与 <code>${tilesUrl}</code> 是否能作为标准地图资源出口被直接接入。</p>
      </div>

      <div class="meta">
        <div class="meta-item">
          <span class="meta-label">Manifest</span>
          <div class="meta-value">${manifestUrl}</div>
        </div>
        <div class="meta-item">
          <span class="meta-label">Style</span>
          <div class="meta-value">${styleUrl}</div>
        </div>
        <div class="meta-item">
          <span class="meta-label">Tiles</span>
          <div class="meta-value">${tilesUrl}</div>
        </div>
        <div class="meta-item">
          <span class="meta-label">Docs</span>
          <div class="meta-value">${readmeUrl}</div>
        </div>
      </div>

      <pre id="status" class="status">Loading manifest...</pre>

      <pre class="example"><code>const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

new maplibregl.Map({
  container: 'map',
  style: '${styleUrl}',
  localIdeographFontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif'
});</code></pre>
    </section>

    <div id="map"></div>
  </div>

  <script src="../vendor/maplibre-gl.js"></script>
  <script src="../vendor/pmtiles.js"></script>
  <script>
    const statusEl = document.getElementById('status');

    function setStatus(value) {
      statusEl.textContent = value;
    }

    async function loadManifest() {
      const response = await fetch('${manifestUrl}');
      if (!response.ok) {
        throw new Error('Failed to load manifest: ' + response.status);
      }

      return response.json();
    }

    async function main() {
      const manifest = await loadManifest();
      const protocol = new pmtiles.Protocol({ metadata: true });
      maplibregl.addProtocol('pmtiles', protocol.tile);

      const map = new maplibregl.Map({
        container: 'map',
        style: manifest.styleUrl,
        center: manifest.defaultCenter,
        zoom: manifest.defaultZoom,
        attributionControl: true,
        localIdeographFontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
      map.on('load', () => {
        setStatus([
          'Manifest loaded.',
          'Style: ' + manifest.styleUrl,
          'Tiles: ' + manifest.tilesUrl,
          'Center: ' + manifest.defaultCenter.join(', '),
          'Zoom: ' + manifest.defaultZoom
        ].join('\\n'));
      });

      map.on('error', (event) => {
        const message = event?.error?.message || 'Unknown map error';
        setStatus('Map error: ' + message);
        console.error(event);
      });
    }

    main().catch((error) => {
      setStatus('Demo failed: ' + error.message);
      console.error(error);
    });
  </script>
</body>
</html>
`;
}

function buildReadmeText({
  manifestUrl,
  styleUrl,
  tilesUrl,
  searchUrl,
  demoUrl,
  embeddedUrl,
  embeddedDemoUrl,
  readmeUrl,
  readmeTextUrl,
  publicOrigin,
  basemapPmtilesFile,
  basemapPmtilesUrl,
  usedBuildTimeMetadata
}) {
  const originMode = publicOrigin
    ? `当前构建已写入绝对公网/内网 origin：${publicOrigin}`
    : `当前构建未设置 MAP_RESOURCES_PUBLIC_ORIGIN，style 内部 tiles 地址使用同源路径 ${basemapPmtilesUrl}。`;

  const metadataMode = usedBuildTimeMetadata
    ? `构建阶段已读取本地 PMTiles 文件：${basemapPmtilesFile}`
    : `构建阶段未读取到本地 PMTiles 文件，已降级为仅基于运行时 URL 生成资源：${basemapPmtilesUrl}`;

  return `Fuyao Basemap Map Resources
============================

资源清单
- Manifest: ${manifestUrl}
- Style: ${styleUrl}
- Tiles: ${tilesUrl}
- Search: ${searchUrl}
- Demo: ${demoUrl}
- Docs: ${readmeUrl}
- Docs Text: ${readmeTextUrl}
- Embedded: ${embeddedUrl}
- Embedded Demo: ${embeddedDemoUrl}

最小接入方法
1. 先注册 PMTiles 协议。
2. 再把 style URL 交给 MapLibre。

示例
-----
const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

new maplibregl.Map({
  container: 'map',
  style: '${styleUrl}',
  localIdeographFontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif'
});

嵌入式地图页
------------
- 嵌入页地址：${embeddedUrl}
- 适用场景：iframe、普通网页弹窗、uni-app web-view
- 主要 URL 参数：
  - center=lng,lat
  - zoom=number
  - bearing=number
  - pitch=number
  - marker=lng,lat
  - mode=view|pick
  - keyword=关键词
  - autoSearch=true|false
  - layers=shops,areas,pois,places,boundaries
  - style=amap-like
- pick 模式行为：
  - 点击地图后会在点击位置落一个默认 marker
  - 同时发送 map-click，payload 至少包含 lng / lat / zoom
  - marker 更新后会发送 marker-updated
- 业务图层行为：
  - 未传 layers 时默认启用 shops,areas
  - 可通过 layers 参数只显示部分业务图层
  - 地图页会发送 layers-ready / layers-changed 回传当前启用图层
- 对外消息格式：
  { source: 'fuyaomap-embedded', type: 'map-ready', payload: { ... } }
- 出站消息：
  map-ready / map-click / marker-updated / marker-click / viewport-change / layers-ready / layers-changed / search-result / search-results / search-empty / feature-located
- 入站控制消息：
  set-center / set-zoom / fly-to / set-marker / clear-marker / set-layers / show-layer / hide-layer / search / locate-feature / highlight-feature
- 页面内全局 API：
  window.__FUYAO_EMBEDDED_MAP__.setCenter / setZoom / flyTo / setMarker / clearMarker / setLayers / showLayer / hideLayer / search / locateFeature / highlightFeature / getViewport / getSelection / getLayers / getSearchState

统一搜索接口
------------
- 接口地址：${searchUrl}
- 主要参数：
  - q=关键词
  - types=shops,areas,pois,places,boundaries
  - limit=10
  - page=1
  - bbox=minLng,minLat,maxLng,maxLat
  - near=lng,lat
  - radius=number
- 统一结果字段：
  - id / type / name / displayName
  - lng / lat / bbox
  - address / source / score / aliasNames
  - geometryGeoJson（有几何时返回）

普通网页 iframe 接入示例
-----------------------
<iframe
  id="fuyaoMap"
  src="${embeddedUrl}?mode=pick&center=113.4445,22.4915&zoom=12&layers=shops,areas&keyword=Fuyao&autoSearch=true"
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
    type: 'search',
    payload: {
      keyword: 'Fuyao',
      types: ['shops', 'areas', 'pois'],
      limit: 8,
      autoLocate: true,
      highlight: true
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
      embeddedSrc: '${embeddedUrl}?mode=pick&center=113.4445,22.4915&zoom=12&layers=shops,areas&keyword=Fuyao&autoSearch=true'
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

        if (message.type === 'feature-located') {
          console.log('uni-app located feature:', message.payload);
        }
      });
    },
    setMarkerFromHost(lng, lat) {
      this.$refs.mapView?.evalJS?.(
        \`window.__FUYAO_EMBEDDED_MAP__ && window.__FUYAO_EMBEDDED_MAP__.setMarker({ lng: \${lng}, lat: \${lat} })\`
      );
    },
    showPoiLayer() {
      this.$refs.mapView?.evalJS?.(
        \`window.__FUYAO_EMBEDDED_MAP__ && window.__FUYAO_EMBEDDED_MAP__.showLayer('pois')\`
      );
    },
    searchNearby(keyword) {
      this.$refs.mapView?.evalJS?.(
        \`window.__FUYAO_EMBEDDED_MAP__ && window.__FUYAO_EMBEDDED_MAP__.search({ keyword: '\${keyword}', types: ['shops', 'pois'], autoLocate: true, highlight: true })\`
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
- ${metadataMode}
- ${originMode}
- uni-app 官方文档说明：web-view 页面对外发消息使用 uni.postMessage，H5 可直接使用 window.postMessage；宿主向 web-view 注入控制消息可通过 evalJS。
- 如果外部网页部署在不同 origin，建议在构建时设置环境变量 MAP_RESOURCES_PUBLIC_ORIGIN=https://your-map-host。
`;
}

async function copyVendorAssets() {
  await Promise.all([
    copyVendorFile(
      path.join(ROOT_DIR, 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl.js'),
      path.join(VENDOR_DIR, 'maplibre-gl.js')
    ),
    copyVendorFile(
      path.join(ROOT_DIR, 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl.css'),
      path.join(VENDOR_DIR, 'maplibre-gl.css')
    ),
    copyVendorFile(
      path.join(ROOT_DIR, 'node_modules', 'pmtiles', 'dist', 'pmtiles.js'),
      path.join(VENDOR_DIR, 'pmtiles.js')
    )
  ]);
}

async function main() {
  await ensureDir(MAP_RESOURCES_DIR);

  const publicOrigin = normalizePublicOrigin(
    process.env.MAP_RESOURCES_PUBLIC_ORIGIN ?? process.env.VITE_MAP_RESOURCES_PUBLIC_ORIGIN ?? ''
  );
  const basemapPmtilesFile = resolveBasemapPmtilesFile(
    process.env.BASEMAP_PMTILES_FILE ?? process.env.VITE_BASEMAP_PMTILES_FILE ?? ''
  );
  const basemapPmtilesUrl = resolveBasemapPmtilesUrl(
    process.env.BASEMAP_PMTILES_URL ?? process.env.VITE_BASEMAP_PMTILES_URL ?? ''
  );

  const packageVersion = await loadPackageVersion();
  const { BASEMAP_SOURCE_ID, buildAmapLikePmtilesStyle } = await loadAmapStyleBuilder();
  const styleUrl = buildPublicUrl(publicOrigin, STYLE_PUBLIC_PATH);
  const tilesUrl = buildPublicUrl(publicOrigin, basemapPmtilesUrl);
  const searchUrl = buildPublicUrl(publicOrigin, SEARCH_PUBLIC_PATH);
  const manifestUrl = buildPublicUrl(publicOrigin, MANIFEST_PUBLIC_PATH);
  const demoUrl = buildPublicUrl(publicOrigin, DEMO_PUBLIC_PATH);
  const embeddedUrl = buildPublicUrl(publicOrigin, EMBEDDED_PUBLIC_PATH);
  const embeddedDemoUrl = buildPublicUrl(publicOrigin, EMBEDDED_DEMO_PUBLIC_PATH);
  const readmeUrl = buildPublicUrl(publicOrigin, README_PUBLIC_PATH);
  const readmeTextUrl = buildPublicUrl(publicOrigin, README_TEXT_PUBLIC_PATH);
  const [styleTemplate, manifestTemplate] = await Promise.all([
    readJsonIfExists(STYLE_OUTPUT_PATH),
    readJsonIfExists(MANIFEST_OUTPUT_PATH)
  ]);

  const fallbackHeader = buildFallbackHeader(manifestTemplate, styleTemplate);

  let archiveHeader = null;
  let archiveMetadata = null;
  let usedBuildTimeMetadata = false;

  if (await fileExists(basemapPmtilesFile)) {
    console.log(`[generate-basemap-style] reading optional build-time PMTiles file: ${basemapPmtilesFile}`);

    try {
      const archiveData = await readArchiveMetadata(basemapPmtilesFile);
      archiveHeader = archiveData.header;
      archiveMetadata = archiveData.metadata;
      usedBuildTimeMetadata = true;
    } catch (error) {
      console.warn(
        `[generate-basemap-style] warning: failed to read PMTiles file at build time, fallback to runtime url only: ${basemapPmtilesFile}`,
        error
      );
    }
  } else {
    console.warn(
      `[generate-basemap-style] warning: pmtiles file not found at build time, fallback to runtime url only: ${basemapPmtilesFile}`
    );
  }

  console.log(`[generate-basemap-style] continue generating basemap resources with BASEMAP_PMTILES_URL=${basemapPmtilesUrl}`);

  const header = archiveHeader ?? fallbackHeader;
  const metadata = archiveMetadata ?? {};
  const styleOptions = buildStyleOptions(header, metadata.attribution);
  const sourceLayers = getVectorLayerIds(metadata);

  let style = null;

  if (sourceLayers.length > 0) {
    style = buildAmapLikePmtilesStyle(tilesUrl, sourceLayers, styleOptions);
  }

  if (!style && styleTemplate) {
    console.warn('[generate-basemap-style] warning: using existing style template fallback because PMTiles metadata is unavailable at build time.');
    style = applyRuntimeTilesUrl(styleTemplate, BASEMAP_SOURCE_ID, tilesUrl, header, metadata.attribution);
  }

  if (!style) {
    console.warn('[generate-basemap-style] warning: using minimal fallback style because no PMTiles metadata or style template is available.');
    style = buildMinimalStyle(BASEMAP_SOURCE_ID, tilesUrl, header, metadata.attribution);
  }

  style.metadata = {
    resourceType: 'fuyao-basemap',
    manifestUrl,
    tilesUrl,
    pmtilesUrl: basemapPmtilesUrl,
    buildTimePmtilesFile: basemapPmtilesFile,
    usedBuildTimeMetadata,
    vectorLayers: sourceLayers,
    generatedAt: new Date().toISOString()
  };

  const manifest = buildManifest({
    packageVersion,
    styleUrl,
    tilesUrl,
    searchUrl,
    demoUrl,
    embeddedUrl,
    embeddedDemoUrl,
    readmeUrl,
    readmeTextUrl,
    header
  });

  const readmeText = buildReadmeText({
    manifestUrl,
    styleUrl,
    tilesUrl,
    searchUrl,
    demoUrl,
    embeddedUrl,
    embeddedDemoUrl,
    readmeUrl,
    readmeTextUrl,
    publicOrigin,
    basemapPmtilesFile,
    basemapPmtilesUrl,
    usedBuildTimeMetadata
  });

  await Promise.all([
    writeJson(STYLE_OUTPUT_PATH, style),
    writeJson(MANIFEST_OUTPUT_PATH, manifest),
    writeText(DEMO_OUTPUT_PATH, buildDemoHtml({ manifestUrl, styleUrl, tilesUrl, readmeUrl })),
    writeText(README_TEXT_OUTPUT_PATH, readmeText),
    writeText(README_MARKDOWN_OUTPUT_PATH, readmeText),
    copyVendorAssets()
  ]);

  console.log(`Generated basemap resources:
  - ${path.relative(ROOT_DIR, MANIFEST_OUTPUT_PATH)}
  - ${path.relative(ROOT_DIR, STYLE_OUTPUT_PATH)}
  - ${path.relative(ROOT_DIR, DEMO_OUTPUT_PATH)}
  - ${path.relative(ROOT_DIR, README_MARKDOWN_OUTPUT_PATH)}
  - ${path.relative(ROOT_DIR, README_TEXT_OUTPUT_PATH)}`);
}

main().catch((error) => {
  console.error('[generate-basemap-style] failed', error);
  process.exitCode = 1;
});
