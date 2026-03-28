import type { FilterSpecification, LayerSpecification, StyleSpecification } from 'maplibre-gl';
import { PMTiles, Protocol } from 'pmtiles';
import { BASEMAP_SOURCE_ID, buildAmapLikePmtilesStyle } from '@/map/amapLikeStyle';
import { ensureMapLibreRuntime, registerMapLibreProtocol } from '@/utils/maplibreRuntime';

// 这里只关心前端构造 style 需要的最小 PMTiles 元数据。
interface VectorLayerMetadata {
  id: string;
  fields?: Record<string, string>;
}

interface PmtilesMetadata {
  vector_layers?: VectorLayerMetadata[];
}

interface ResolveMapStyleOptions {
  staticStyleUrl?: string;
}

interface StaticStyleValidationResult {
  referencedSourceLayers: string[];
  missingSourceLayers: string[];
}

const PMTILES_PATTERN = /\.pmtiles(\?.*)?$/i;

let protocolRegistered = false;
let protocolInstance: Protocol | null = null;
let lastBasemapIssueMessage = '';

function logBasemapIssue(message: string, detail?: unknown): void {
  console.warn(`[Basemap] ${message}`, detail);
}

function setLastBasemapIssue(message: string, detail?: unknown): void {
  lastBasemapIssueMessage = message;
  logBasemapIssue(message, detail);
}

function clearLastBasemapIssue(): void {
  lastBasemapIssueMessage = '';
}

export function getLastBasemapIssueMessage(): string {
  return lastBasemapIssueMessage;
}

function buildBlankStyle(): StyleSpecification {
  // 未配置底图时仍给地图一个合法 style，方便业务图层正常工作。
  return {
    version: 8,
    name: 'Fuyao Blank',
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#eef3f8'
        }
      }
    ]
  };
}

function getVectorLayerIds(metadata: PmtilesMetadata): string[] {
  const ids = metadata.vector_layers
    ?.map((layer) => layer.id?.trim())
    .filter((layerId): layerId is string => Boolean(layerId)) ?? [];

  return Array.from(new Set(ids));
}

function ensureProtocol(): Protocol {
  ensureMapLibreRuntime();

  if (protocolInstance) {
    return protocolInstance;
  }

  // pmtiles:// 协议是全局注册的，同一页面生命周期内只做一次。
  protocolInstance = new Protocol();
  if (!protocolRegistered) {
    registerMapLibreProtocol('pmtiles', protocolInstance.tile);
    protocolRegistered = true;
  }

  return protocolInstance;
}

function loadArchive(url: string): PMTiles {
  // 同时把 archive 注册进 protocol，后续 MapLibre 才能通过 pmtiles:// 访问。
  const protocol = ensureProtocol();
  const archive = new PMTiles(url);
  protocol.add(archive);
  return archive;
}

function isPmtilesSourceUrl(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toLowerCase().startsWith('pmtiles://');
}

function getStyleSourceLayers(style: StyleSpecification): string[] {
  const sourceLayers = style.layers
    .map((layer) => {
      if (!layer || typeof layer !== 'object' || !('source' in layer) || !('source-layer' in layer)) {
        return null;
      }

      if (layer.source !== BASEMAP_SOURCE_ID) {
        return null;
      }

      const sourceLayer = layer['source-layer'];
      return typeof sourceLayer === 'string' && sourceLayer.trim() ? sourceLayer.trim() : null;
    })
    .filter((sourceLayer): sourceLayer is string => Boolean(sourceLayer));

  return Array.from(new Set(sourceLayers));
}

function validateStaticStyle(style: StyleSpecification, sourceLayers: string[]): StaticStyleValidationResult {
  const referencedSourceLayers = getStyleSourceLayers(style);
  const sourceLayerSet = new Set(sourceLayers);
  const missingSourceLayers = referencedSourceLayers.filter((sourceLayer) => !sourceLayerSet.has(sourceLayer));

  return {
    referencedSourceLayers,
    missingSourceLayers
  };
}

function buildPmtilesVectorStyle(url: string, sourceLayers: string[]): StyleSpecification {
  // 后台运行时样式与 /map-resources/styles/amap-like.json 共用同一套 builder，
  // 避免内部地图与对外导出底图逐步演化成两套视觉配置。
  const amapLikeStyle = buildAmapLikePmtilesStyle(url, sourceLayers);
  if (amapLikeStyle) {
    return amapLikeStyle;
  }

  logBasemapIssue('dynamic AMap-like style builder did not match current vector_layers, fallback to generic vector style', {
    pmtilesUrl: url,
    vectorLayers: sourceLayers
  });

  // 如果 PMTiles 自带矢量图层，就即时生成一个轻量 style，而不是依赖额外 style.json。
  const layers: LayerSpecification[] = [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#f8fafc'
      }
    }
  ];

  for (const sourceLayer of sourceLayers) {
    layers.push(
      {
        id: `${sourceLayer}-fill`,
        type: 'fill',
        source: BASEMAP_SOURCE_ID,
        'source-layer': sourceLayer,
        filter: ['==', ['geometry-type'], 'Polygon'] as unknown as FilterSpecification,
        paint: {
          'fill-color': '#d9e5f4',
          'fill-opacity': 0.75
        }
      },
      {
        id: `${sourceLayer}-line`,
        type: 'line',
        source: BASEMAP_SOURCE_ID,
        'source-layer': sourceLayer,
        filter: ['==', ['geometry-type'], 'LineString'] as unknown as FilterSpecification,
        paint: {
          'line-color': '#9aa8bc',
          'line-width': 1.2
        }
      },
      {
        id: `${sourceLayer}-circle`,
        type: 'circle',
        source: BASEMAP_SOURCE_ID,
        'source-layer': sourceLayer,
        filter: ['==', ['geometry-type'], 'Point'] as unknown as FilterSpecification,
        paint: {
          'circle-color': '#4361ee',
          'circle-radius': 2.6,
          'circle-opacity': 0.8
        }
      }
    );
  }

  return {
    version: 8,
    name: 'Fuyao PMTiles',
    sources: {
      [BASEMAP_SOURCE_ID]: {
        type: 'vector',
        url: `pmtiles://${url}`
      }
    },
    layers
  };
}

function buildPmtilesRasterStyle(url: string): StyleSpecification {
  // 如果拿不到 vector_layers，则按栅格瓦片方式兜底。
  return {
    version: 8,
    name: 'Fuyao PMTiles Raster',
    sources: {
      [BASEMAP_SOURCE_ID]: {
        type: 'raster',
        url: `pmtiles://${url}`,
        tileSize: 256
      }
    },
    layers: [
      {
        id: 'basemap-raster',
        type: 'raster',
        source: BASEMAP_SOURCE_ID
      }
    ]
  };
}

function cloneStyleSpecification(style: StyleSpecification): StyleSpecification {
  return JSON.parse(JSON.stringify(style)) as StyleSpecification;
}

function rewritePmtilesSourceUrl(style: StyleSpecification, pmtilesUrl: string): StyleSpecification {
  const clonedStyle = cloneStyleSpecification(style);
  const rewrittenUrl = `pmtiles://${pmtilesUrl}`;

  for (const source of Object.values(clonedStyle.sources ?? {})) {
    if (!source || typeof source !== 'object' || !('url' in source)) {
      continue;
    }

    if (isPmtilesSourceUrl(source.url) || source === clonedStyle.sources?.[BASEMAP_SOURCE_ID]) {
      source.url = rewrittenUrl;
    }
  }

  return clonedStyle;
}

function styleContainsPmtilesSource(style: StyleSpecification): boolean {
  return Object.values(style.sources ?? {}).some((source) => {
    if (!source || typeof source !== 'object' || !('url' in source)) {
      return false;
    }

    return isPmtilesSourceUrl(source.url);
  });
}

function stripBasemapSymbolLayers(style: StyleSpecification): StyleSpecification {
  const clonedStyle = cloneStyleSpecification(style);
  clonedStyle.layers = clonedStyle.layers.filter((layer) => {
    if (!layer || typeof layer !== 'object') {
      return true;
    }

    if (!('type' in layer) || layer.type !== 'symbol') {
      return true;
    }

    if (!('source' in layer) || layer.source !== BASEMAP_SOURCE_ID) {
      return true;
    }

    return false;
  });

  return clonedStyle;
}

function ensurePmtilesArchiveRegistered(pmtilesUrl: string, reason: string): PMTiles {
  try {
    return loadArchive(pmtilesUrl);
  } catch (error) {
    logBasemapIssue(`failed to prepare PMTiles runtime for ${reason}`, {
      pmtilesUrl,
      error
    });
    throw error;
  }
}

async function tryLoadStaticStyle(styleUrl: string, pmtilesUrl: string, sourceLayers: string[]): Promise<StyleSpecification | null> {
  const normalizedStyleUrl = styleUrl.trim();
  if (!normalizedStyleUrl) {
    return null;
  }

  try {
    const response = await fetch(normalizedStyleUrl, {
      credentials: 'same-origin'
    });
    if (!response.ok) {
      return null;
    }

    const style = await response.json() as StyleSpecification;
    if (!style || typeof style !== 'object' || style.version !== 8 || !style.sources || !Array.isArray(style.layers)) {
      return null;
    }

    const rewrittenStyle = rewritePmtilesSourceUrl(style, pmtilesUrl);
    if (styleContainsPmtilesSource(rewrittenStyle)) {
      ensurePmtilesArchiveRegistered(pmtilesUrl, 'static-style');
    }

    const validation = validateStaticStyle(rewrittenStyle, sourceLayers);
    if (validation.missingSourceLayers.length > 0) {
      logBasemapIssue('static basemap style does not match current PMTiles vector_layers, fallback to runtime style builder', {
        styleUrl: normalizedStyleUrl,
        styleSourceLayers: validation.referencedSourceLayers,
        pmtilesVectorLayers: sourceLayers,
        missingSourceLayers: validation.missingSourceLayers
      });
      return null;
    }

    return stripBasemapSymbolLayers(rewrittenStyle);
  } catch (error) {
    logBasemapIssue('failed to load static basemap style, fallback to runtime style builder', {
      styleUrl: normalizedStyleUrl,
      error
    });
    return null;
  }
}

export async function resolveMapStyle(baseUrl: string, options: ResolveMapStyleOptions = {}): Promise<string | StyleSpecification> {
  clearLastBasemapIssue();
  const normalizedUrl = baseUrl.trim();

  if (!normalizedUrl) {
    return buildBlankStyle();
  }

  // 非 pmtiles 地址按“现成 style url”处理，便于以后切换外部底图服务。
  if (!PMTILES_PATTERN.test(normalizedUrl)) {
    return normalizedUrl;
  }

  let archive: PMTiles;
  try {
    archive = ensurePmtilesArchiveRegistered(normalizedUrl, 'runtime-style');
  } catch (error) {
    setLastBasemapIssue('PMTiles 协议注册或档案加载失败，请检查 /tiles/city.pmtiles 是否存在以及 pmtiles 协议是否已注册。', error);
    return buildBlankStyle();
  }

  try {
    const metadata = (await archive.getMetadata()) as PmtilesMetadata;
    // 当前底图样式只依赖 source-layer 列表；即使 metadata 没有字段定义，
    // 标签层也会按常见名称字段 name:zh / name / name_en / ref 做前端兜底。
    const sourceLayers = getVectorLayerIds(metadata);
    if (sourceLayers.length > 0) {
      const staticStyle = await tryLoadStaticStyle(options.staticStyleUrl ?? '', normalizedUrl, sourceLayers);
      if (staticStyle) {
        return staticStyle;
      }

      return stripBasemapSymbolLayers(buildPmtilesVectorStyle(normalizedUrl, sourceLayers));
    }

    logBasemapIssue('PMTiles metadata did not expose vector_layers, fallback to raster style', {
      pmtilesUrl: normalizedUrl,
      metadata
    });
  } catch (error) {
    setLastBasemapIssue('PMTiles metadata 读取失败，无法判断当前底图图层结构，请检查 PMTiles 文件完整性。', {
      pmtilesUrl: normalizedUrl,
      error
    });
  }

  return stripBasemapSymbolLayers(buildPmtilesRasterStyle(normalizedUrl));
}

export async function getPmtilesInitialView(baseUrl: string): Promise<{ center: [number, number]; zoom: number } | null> {
  const normalizedUrl = baseUrl.trim();

  if (!normalizedUrl || !PMTILES_PATTERN.test(normalizedUrl)) {
    return null;
  }

  try {
    // PMTiles 头信息里已经包含推荐中心点和缩放，优先拿来做首屏视角。
    const header = await loadArchive(normalizedUrl).getHeader();
    return {
      center: [header.centerLon, header.centerLat],
      zoom: header.centerZoom
    };
  } catch (error) {
    console.warn('Failed to read PMTiles header, fallback to default center.', error);
    return null;
  }
}
