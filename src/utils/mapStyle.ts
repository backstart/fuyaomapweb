import type { FilterSpecification, LayerSpecification, StyleSpecification } from 'maplibre-gl';
import maplibregl from 'maplibre-gl';
import { PMTiles, Protocol } from 'pmtiles';
import { BASEMAP_SOURCE_ID, buildAmapLikePmtilesStyle } from '@/map/amapLikeStyle';

// 这里只关心前端构造 style 需要的最小 PMTiles 元数据。
interface VectorLayerMetadata {
  id: string;
}

interface PmtilesMetadata {
  vector_layers?: VectorLayerMetadata[];
}

const PMTILES_PATTERN = /\.pmtiles(\?.*)?$/i;

let protocolRegistered = false;
let protocolInstance: Protocol | null = null;

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

function ensureProtocol(): Protocol {
  if (protocolInstance) {
    return protocolInstance;
  }

  // pmtiles:// 协议是全局注册的，同一页面生命周期内只做一次。
  protocolInstance = new Protocol();
  if (!protocolRegistered) {
    maplibregl.addProtocol('pmtiles', protocolInstance.tile);
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

function buildPmtilesVectorStyle(url: string, sourceLayers: string[]): StyleSpecification {
  const amapLikeStyle = buildAmapLikePmtilesStyle(url, sourceLayers);
  if (amapLikeStyle) {
    return amapLikeStyle;
  }

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

export async function resolveMapStyle(baseUrl: string): Promise<string | StyleSpecification> {
  const normalizedUrl = baseUrl.trim();

  if (!normalizedUrl) {
    return buildBlankStyle();
  }

  // 非 pmtiles 地址按“现成 style url”处理，便于以后切换外部底图服务。
  if (!PMTILES_PATTERN.test(normalizedUrl)) {
    return normalizedUrl;
  }

  const archive = loadArchive(normalizedUrl);

  try {
    const metadata = (await archive.getMetadata()) as PmtilesMetadata;
    const sourceLayers = metadata.vector_layers?.map((layer) => layer.id).filter(Boolean) ?? [];
    if (sourceLayers.length > 0) {
      return buildPmtilesVectorStyle(normalizedUrl, sourceLayers);
    }
  } catch (error) {
    console.warn('Failed to inspect PMTiles metadata, fallback to raster style.', error);
  }

  return buildPmtilesRasterStyle(normalizedUrl);
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
