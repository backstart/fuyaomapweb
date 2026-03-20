import type { FilterSpecification, LayerSpecification, StyleSpecification } from 'maplibre-gl';
import maplibregl from 'maplibre-gl';
import { PMTiles, Protocol } from 'pmtiles';

interface VectorLayerMetadata {
  id: string;
}

interface PmtilesMetadata {
  vector_layers?: VectorLayerMetadata[];
}

const PMTILES_PATTERN = /\.pmtiles(\?.*)?$/i;
const SOURCE_ID = 'pmtiles-basemap';

let protocolRegistered = false;
let protocolInstance: Protocol | null = null;

function buildBlankStyle(): StyleSpecification {
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

  protocolInstance = new Protocol();
  if (!protocolRegistered) {
    maplibregl.addProtocol('pmtiles', protocolInstance.tile);
    protocolRegistered = true;
  }

  return protocolInstance;
}

function buildPmtilesVectorStyle(url: string, sourceLayers: string[]): StyleSpecification {
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
        source: SOURCE_ID,
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
        source: SOURCE_ID,
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
        source: SOURCE_ID,
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
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      [SOURCE_ID]: {
        type: 'vector',
        url: `pmtiles://${url}`
      }
    },
    layers
  };
}

function buildPmtilesRasterStyle(url: string): StyleSpecification {
  return {
    version: 8,
    name: 'Fuyao PMTiles Raster',
    sources: {
      [SOURCE_ID]: {
        type: 'raster',
        url: `pmtiles://${url}`,
        tileSize: 256
      }
    },
    layers: [
      {
        id: 'basemap-raster',
        type: 'raster',
        source: SOURCE_ID
      }
    ]
  };
}

export async function resolveMapStyle(baseUrl: string): Promise<string | StyleSpecification> {
  const normalizedUrl = baseUrl.trim();

  if (!normalizedUrl) {
    return buildBlankStyle();
  }

  if (!PMTILES_PATTERN.test(normalizedUrl)) {
    return normalizedUrl;
  }

  const protocol = ensureProtocol();
  const archive = new PMTiles(normalizedUrl);
  protocol.add(archive);

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
