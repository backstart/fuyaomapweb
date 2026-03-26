import type { FeatureCollection, Point, Polygon } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type {
  DrawnBuildingArea,
  DrawnBuildingAreaFeatureCollection,
  DrawnBuildingDraftFeatureCollection,
  DrawnBuildingDraftProperties,
  DrawnBuildingLabelFeatureCollection
} from '@/types/drawnBuilding';
import {
  createPolygonFeature,
  getDrawnBuildingLabelText
} from '@/utils/drawnBuildings';
import { parseGeometryGeoJson } from '@/utils/geometry';

export const DRAWN_BUILDING_AREA_SOURCE_ID = 'drawn-building-areas';
export const DRAWN_BUILDING_LABEL_SOURCE_ID = 'drawn-building-labels';
export const DRAWN_BUILDING_DRAFT_SOURCE_ID = 'drawn-building-draft';
export const DRAWN_BUILDING_FILL_LAYER_ID = 'drawn-building-fill';
export const DRAWN_BUILDING_LINE_LAYER_ID = 'drawn-building-line';
export const DRAWN_BUILDING_LABEL_LAYER_ID = 'drawn-building-label';
const DRAWN_BUILDING_DRAFT_FILL_LAYER_ID = 'drawn-building-draft-fill';
const DRAWN_BUILDING_DRAFT_LINE_LAYER_ID = 'drawn-building-draft-line';

function createEmptyPolygonCollection<TProperties>(): FeatureCollection<Polygon, TProperties> {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

function createEmptyPointCollection<TProperties>(): FeatureCollection<Point, TProperties> {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

function setSourceData(map: MapLibreMap, sourceId: string, data: FeatureCollection): void {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  source?.setData(JSON.parse(JSON.stringify(data)) as FeatureCollection);
}

function ensureSource(map: MapLibreMap, sourceId: string, type: 'polygon' | 'point'): void {
  if (map.getSource(sourceId)) {
    return;
  }

  map.addSource(sourceId, {
    type: 'geojson',
    data: type === 'point' ? createEmptyPointCollection() : createEmptyPolygonCollection()
  });
}

export function ensureDrawnBuildingLayers(map: MapLibreMap): void {
  ensureSource(map, DRAWN_BUILDING_AREA_SOURCE_ID, 'polygon');
  ensureSource(map, DRAWN_BUILDING_LABEL_SOURCE_ID, 'point');
  ensureSource(map, DRAWN_BUILDING_DRAFT_SOURCE_ID, 'polygon');

  if (!map.getLayer(DRAWN_BUILDING_FILL_LAYER_ID)) {
    map.addLayer({
      id: DRAWN_BUILDING_FILL_LAYER_ID,
      type: 'fill',
      source: DRAWN_BUILDING_AREA_SOURCE_ID,
      paint: {
        'fill-color': ['coalesce', ['get', 'fillColor'], 'rgba(70, 141, 247, 0.18)'],
        'fill-opacity': ['case', ['boolean', ['get', 'isSelected'], false], 0.26, 0.16]
      }
    });
  }

  if (!map.getLayer(DRAWN_BUILDING_LINE_LAYER_ID)) {
    map.addLayer({
      id: DRAWN_BUILDING_LINE_LAYER_ID,
      type: 'line',
      source: DRAWN_BUILDING_AREA_SOURCE_ID,
      layout: {
        'line-join': 'round'
      },
      paint: {
        'line-color': ['coalesce', ['get', 'lineColor'], '#2f7df6'],
        'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 3.2, ['coalesce', ['get', 'lineWidth'], 2.2]],
        'line-opacity': 0.96
      }
    });
  }

  if (!map.getLayer(DRAWN_BUILDING_LABEL_LAYER_ID)) {
    map.addLayer({
      id: DRAWN_BUILDING_LABEL_LAYER_ID,
      type: 'symbol',
      source: DRAWN_BUILDING_LABEL_SOURCE_ID,
      layout: {
        'text-field': ['get', 'labelText'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 14, 11.5, 18, 13.5],
        'text-padding': 4,
        'text-max-width': 8,
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.35,
        'text-optional': true,
        'symbol-sort-key': ['case', ['boolean', ['get', 'isSelected'], false], -1, 1]
      },
      paint: {
        'text-color': '#304256',
        'text-halo-color': 'rgba(255,255,255,0.98)',
        'text-halo-width': 1.6,
        'text-halo-blur': 0.4
      }
    });
  }

  if (!map.getLayer(DRAWN_BUILDING_DRAFT_FILL_LAYER_ID)) {
    map.addLayer({
      id: DRAWN_BUILDING_DRAFT_FILL_LAYER_ID,
      type: 'fill',
      source: DRAWN_BUILDING_DRAFT_SOURCE_ID,
      paint: {
        'fill-color': '#2f7df6',
        'fill-opacity': 0.12
      }
    });
  }

  if (!map.getLayer(DRAWN_BUILDING_DRAFT_LINE_LAYER_ID)) {
    map.addLayer({
      id: DRAWN_BUILDING_DRAFT_LINE_LAYER_ID,
      type: 'line',
      source: DRAWN_BUILDING_DRAFT_SOURCE_ID,
      layout: {
        'line-join': 'round'
      },
      paint: {
        'line-color': '#2f7df6',
        'line-width': 2,
        'line-dasharray': [2, 1.5],
        'line-opacity': 0.9
      }
    });
  }
}

export function updateDrawnBuildingSources(
  map: MapLibreMap,
  areaData: DrawnBuildingAreaFeatureCollection,
  labelData: DrawnBuildingLabelFeatureCollection,
  draftData: DrawnBuildingDraftFeatureCollection
): void {
  setSourceData(map, DRAWN_BUILDING_AREA_SOURCE_ID, areaData);
  setSourceData(map, DRAWN_BUILDING_LABEL_SOURCE_ID, labelData);
  setSourceData(map, DRAWN_BUILDING_DRAFT_SOURCE_ID, draftData);
}

export function buildDrawnBuildingAreaFeatureCollection(
  areas: DrawnBuildingArea[],
  selectedAreaId: string | null
): DrawnBuildingAreaFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: areas
      .map((area) => {
        const geometry = parseGeometryGeoJson(area.geometryGeoJson);
        if (!geometry || geometry.type !== 'Polygon') {
          return null;
        }

        return createPolygonFeature(geometry, {
          areaId: String(area.id),
          name: area.name,
          buildingType: area.buildingType ?? null,
          buildingCode: area.buildingCode ?? null,
          fillColor: area.fillColor,
          lineColor: area.lineColor,
          lineWidth: area.lineWidth,
          status: area.status,
          isSelected: selectedAreaId === String(area.id)
        }, String(area.id));
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  };
}

export function buildDrawnBuildingLabelFeatureCollection(
  areas: DrawnBuildingArea[],
  selectedAreaId: string | null
): DrawnBuildingLabelFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: areas.map((area) => ({
      type: 'Feature',
      id: String(area.id),
      properties: {
        areaId: String(area.id),
        labelText: getDrawnBuildingLabelText(area),
        name: area.name,
        buildingType: area.buildingType ?? null,
        buildingCode: area.buildingCode ?? null,
        isSelected: selectedAreaId === String(area.id)
      },
      geometry: {
        type: 'Point',
        coordinates: [area.labelLongitude, area.labelLatitude]
      }
    }))
  };
}

export function buildDrawnBuildingDraftFeatureCollection(
  geometryGeoJson: string | null,
  mode: DrawnBuildingDraftProperties['mode'] | null
): DrawnBuildingDraftFeatureCollection {
  const geometry = geometryGeoJson ? parseGeometryGeoJson(geometryGeoJson) : null;
  if (!geometry || geometry.type !== 'Polygon' || !mode) {
    return createEmptyPolygonCollection<DrawnBuildingDraftProperties>();
  }

  return {
    type: 'FeatureCollection',
    features: [
      createPolygonFeature(geometry, { mode }, `${mode}-draft`)
    ]
  };
}
