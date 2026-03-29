import type { FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import {
  resolveDrawnBuildingAreaRenderProperties,
  resolveDrawnBuildingLabelRenderProperties
} from '@/map/semanticRenderConfig';
import type { MapFeatureSchema } from '@/types/mapFeatureType';
import type {
  DrawnBuildingArea,
  DrawnBuildingAreaFeatureCollection,
  DrawnBuildingDraftFeatureCollection,
  DrawnBuildingDraftProperties,
  DrawnBuildingLabelFeatureCollection
} from '@/types/drawnBuilding';
import {
  createAreaGeometryFeature,
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

function createEmptyAreaCollection<TProperties>(): FeatureCollection<Polygon | MultiPolygon, TProperties> {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

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
    data: type === 'point' ? createEmptyPointCollection() : createEmptyAreaCollection()
  });
}

function buildDashArrayExpression(): any {
  return [
    'match',
    ['get', 'lineDashKey'],
    'boundary',
    ['literal', [3.2, 1.8]],
    'boundary-light',
    ['literal', [2.2, 1.4]],
    ['literal', [1, 0]]
  ];
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
        'fill-color': ['coalesce', ['get', 'fillColorHint'], ['get', 'fillColor'], '#9d9085'],
        'fill-opacity': [
          'case',
          ['boolean', ['get', 'isEditing'], false],
          0.42,
          ['boolean', ['get', 'isSelected'], false],
          0.34,
          ['coalesce', ['get', 'fillOpacityHint'], 0.28]
        ]
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
        'line-color': ['coalesce', ['get', 'lineColorHint'], ['get', 'lineColor'], '#7b6f65'],
        'line-width': [
          'case',
          ['boolean', ['get', 'isEditing'], false],
          ['+', ['coalesce', ['get', 'lineWidthHint'], ['get', 'lineWidth'], 1.9], 1.2],
          ['boolean', ['get', 'isSelected'], false],
          ['+', ['coalesce', ['get', 'lineWidthHint'], ['get', 'lineWidth'], 1.9], 0.7],
          ['coalesce', ['get', 'lineWidthHint'], ['get', 'lineWidth'], 1.9]
        ],
        'line-opacity': ['coalesce', ['get', 'lineOpacityHint'], 0.92],
        'line-dasharray': buildDashArrayExpression()
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
        'text-size': ['coalesce', ['get', 'textSize'], 12],
        'text-padding': 4,
        'text-max-width': 8,
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': ['coalesce', ['get', 'textRadialOffset'], 0.35],
        'text-letter-spacing': ['coalesce', ['get', 'textLetterSpacing'], 0.01],
        'text-optional': true,
        'symbol-sort-key': ['coalesce', ['get', 'semanticPriority'], 1]
      },
      paint: {
        'text-color': ['coalesce', ['get', 'textColor'], '#304256'],
        'text-halo-color': ['coalesce', ['get', 'haloColor'], 'rgba(255,255,255,0.98)'],
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
        'fill-color': '#9d9085',
        'fill-opacity': 0.24
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
        'line-color': '#7b6f65',
        'line-width': 1.8,
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
  schema: MapFeatureSchema | null | undefined,
  selectedAreaId: string | null,
  editingAreaId: string | null
): DrawnBuildingAreaFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: areas
      .map((area) => {
        const geometry = parseGeometryGeoJson(area.geometryGeoJson);
        if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) {
          return null;
        }

        const state = editingAreaId === String(area.id) ? 'editing' : selectedAreaId === String(area.id) ? 'selected' : 'default';
        const hints = resolveDrawnBuildingAreaRenderProperties(schema, area, { state });

        return createAreaGeometryFeature(geometry, {
          areaId: String(area.id),
          name: area.name,
          buildingType: area.buildingType ?? null,
          categoryCode: area.categoryCode ?? null,
          categoryName: area.categoryName ?? null,
          typeCode: area.typeCode ?? null,
          typeName: area.typeName ?? null,
          renderType: area.renderType ?? null,
          buildingCode: area.buildingCode ?? null,
          fillColor: area.fillColor,
          lineColor: area.lineColor,
          lineWidth: area.lineWidth,
          fillColorHint: hints.fillColorHint ?? area.fillColor,
          fillOpacityHint: hints.fillOpacityHint ?? null,
          lineColorHint: hints.lineColorHint ?? area.lineColor,
          lineWidthHint: hints.lineWidthHint ?? area.lineWidth,
          lineOpacityHint: hints.lineOpacityHint ?? null,
          lineDashKey: hints.lineDashKey ?? null,
          status: area.status,
          isSelected: selectedAreaId === String(area.id),
          isEditing: editingAreaId === String(area.id)
        }, String(area.id));
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  };
}

export function buildDrawnBuildingLabelFeatureCollection(
  areas: DrawnBuildingArea[],
  schema: MapFeatureSchema | null | undefined,
  selectedAreaId: string | null,
  editingAreaId: string | null
): DrawnBuildingLabelFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: areas.map((area) => {
      const state = editingAreaId === String(area.id) ? 'editing' : selectedAreaId === String(area.id) ? 'selected' : 'default';
      const hints = resolveDrawnBuildingLabelRenderProperties(schema, area, { state });

      return {
        type: 'Feature',
        id: String(area.id),
        properties: {
          areaId: String(area.id),
          labelText: getDrawnBuildingLabelText(area),
          name: area.name,
          buildingType: area.buildingType ?? null,
          categoryCode: area.categoryCode ?? null,
          categoryName: area.categoryName ?? null,
          typeCode: area.typeCode ?? null,
          typeName: area.typeName ?? null,
          renderType: area.renderType ?? null,
          buildingCode: area.buildingCode ?? null,
          textStyleKey: hints.textStyleKey ?? null,
          textColor: hints.textColor ?? null,
          haloColor: hints.haloColor ?? null,
          textSize: hints.textSize ?? null,
          textRadialOffset: hints.textRadialOffset ?? null,
          textLetterSpacing: hints.textLetterSpacing ?? null,
          semanticPriority: hints.semanticPriority ?? null,
          isSelected: selectedAreaId === String(area.id),
          isEditing: editingAreaId === String(area.id)
        },
        geometry: {
          type: 'Point',
          coordinates: [area.labelLongitude, area.labelLatitude]
        }
      };
    })
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
      createAreaGeometryFeature(geometry, { mode }, `${mode}-draft`)
    ]
  };
}
