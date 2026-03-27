import type { Feature, Point } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { resolveFeatureRenderProperties, resolveLabelRenderProperties } from '@/map/semanticRenderConfig';
import type { AreaFeatureCollection, AreaGeoJsonProperties } from '@/types/area';
import type { BoundaryFeatureCollection, BoundaryGeoJsonProperties } from '@/types/boundary';
import type { LayerVisibility } from '@/types/map';
import type { MapFeatureSchema } from '@/types/mapFeatureType';
import type { MapLabel, MapLabelFeatureCollection, MapLabelGeoJsonProperties } from '@/types/mapLabel';
import type { PlaceFeatureCollection, PlaceGeoJsonProperties } from '@/types/place';
import type { PoiFeatureCollection, PoiGeoJsonProperties } from '@/types/poi';
import type { ShopFeatureCollection, ShopGeoJsonProperties } from '@/types/shop';
import {
  DEFAULT_HALO_COLOR,
  DEFAULT_TEXT_COLOR,
  buildLabelLookupKey,
  createPointFeature,
  getBusinessLabelSourceLayer,
  getDefaultMinZoom,
  getDefaultPriority,
  getFeatureIdentifier,
  getFeaturePosition,
  getLabelTextFromFeatureProperties
} from '@/utils/mapLabels';

export const MANUAL_LABEL_SOURCE_ID = 'map-manual-labels';
const BUSINESS_LABEL_SOURCE_ID = 'map-business-labels';
const MANUAL_ROAD_LAYER_ID = 'map-manual-road-labels';
const MANUAL_BUILDING_LAYER_ID = 'map-manual-building-labels';
const MANUAL_BUSINESS_LAYER_ID = 'map-manual-business-labels';
const BUSINESS_POINT_LAYER_ID = 'map-business-point-labels';
const BUSINESS_SURFACE_LAYER_ID = 'map-business-surface-labels';
const FOCUS_FILL_LAYER_ID = 'business-focus-fill';

export const MANUAL_LABEL_LAYER_IDS = [
  MANUAL_ROAD_LAYER_ID,
  MANUAL_BUILDING_LAYER_ID,
  MANUAL_BUSINESS_LAYER_ID
] as const;

const ROAD_FEATURE_TYPES = ['road'];
const BUILDING_FEATURE_TYPES = ['building', 'house', 'courtyard'];
const BUSINESS_POINT_FEATURE_TYPES = ['shop', 'poi'];
const BUSINESS_SURFACE_FEATURE_TYPES = ['place', 'area', 'boundary'];

function createEmptyPointFeatureCollection(): MapLabelFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

function cloneFeatureCollection(data: MapLabelFeatureCollection): MapLabelFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: data.features.map((feature) => ({
      type: 'Feature',
      id: feature.id,
      properties: { ...feature.properties },
      geometry: {
        type: 'Point',
        coordinates: [...feature.geometry.coordinates] as [number, number]
      }
    }))
  };
}

function setGeoJsonSourceData(map: MapLibreMap, sourceId: string, data: MapLabelFeatureCollection): void {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (!source) {
    return;
  }

  source.setData(cloneFeatureCollection(data));
}

function addGeoJsonSource(map: MapLibreMap, sourceId: string): void {
  if (map.getSource(sourceId)) {
    return;
  }

  map.addSource(sourceId, {
    type: 'geojson',
    data: createEmptyPointFeatureCollection()
  });
}

function addSymbolLayer(map: MapLibreMap, layer: Record<string, unknown>): void {
  const beforeId = map.getLayer(FOCUS_FILL_LAYER_ID) ? FOCUS_FILL_LAYER_ID : undefined;
  map.addLayer(layer as never, beforeId);
}

function buildTextSizeExpression(fallback: number): any {
  return ['coalesce', ['get', 'textSize'], fallback];
}

function buildTextLetterSpacingExpression(fallback: number): any {
  return ['coalesce', ['get', 'textLetterSpacing'], fallback];
}

function buildTextRadialOffsetExpression(fallback: number): any {
  return ['coalesce', ['get', 'textRadialOffset'], fallback];
}

function buildSortKeyExpression(fallback = -160): any {
  return ['coalesce', ['get', 'sortKey'], fallback];
}

export function ensureMapLabelLayers(map: MapLibreMap): void {
  addGeoJsonSource(map, MANUAL_LABEL_SOURCE_ID);
  addGeoJsonSource(map, BUSINESS_LABEL_SOURCE_ID);

  if (!map.getLayer(MANUAL_ROAD_LAYER_ID)) {
    addSymbolLayer(map, {
      id: MANUAL_ROAD_LAYER_ID,
      type: 'symbol',
      source: MANUAL_LABEL_SOURCE_ID,
      filter: ['match', ['get', 'featureType'], ROAD_FEATURE_TYPES, true, false],
      layout: {
        'text-field': ['get', 'displayName'],
        'text-size': buildTextSizeExpression(11.2),
        'text-letter-spacing': buildTextLetterSpacingExpression(0.02),
        'text-max-width': 12,
        'text-padding': 3,
        'text-radial-offset': buildTextRadialOffsetExpression(0.15),
        'text-variable-anchor': ['center', 'top', 'bottom'],
        'text-optional': true,
        'text-allow-overlap': false,
        'symbol-sort-key': buildSortKeyExpression(-220)
      },
      paint: {
        'text-color': ['coalesce', ['get', 'textColor'], '#5b6778'],
        'text-halo-color': ['coalesce', ['get', 'haloColor'], 'rgba(255, 255, 255, 0.96)'],
        'text-halo-width': 1.45,
        'text-halo-blur': 0.45
      }
    });
  }

  if (!map.getLayer(MANUAL_BUILDING_LAYER_ID)) {
    addSymbolLayer(map, {
      id: MANUAL_BUILDING_LAYER_ID,
      type: 'symbol',
      source: MANUAL_LABEL_SOURCE_ID,
      filter: ['match', ['get', 'featureType'], BUILDING_FEATURE_TYPES, true, false],
      layout: {
        'text-field': ['get', 'displayName'],
        'text-size': buildTextSizeExpression(11.6),
        'text-letter-spacing': buildTextLetterSpacingExpression(0.01),
        'text-max-width': 9,
        'text-padding': 5,
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': buildTextRadialOffsetExpression(0.4),
        'text-optional': true,
        'text-allow-overlap': false,
        'symbol-sort-key': buildSortKeyExpression(-240)
      },
      paint: {
        'text-color': ['coalesce', ['get', 'textColor'], '#3f4b57'],
        'text-halo-color': ['coalesce', ['get', 'haloColor'], 'rgba(246, 244, 239, 0.96)'],
        'text-halo-width': 1.5,
        'text-halo-blur': 0.5
      }
    });
  }

  if (!map.getLayer(MANUAL_BUSINESS_LAYER_ID)) {
    addSymbolLayer(map, {
      id: MANUAL_BUSINESS_LAYER_ID,
      type: 'symbol',
      source: MANUAL_LABEL_SOURCE_ID,
      filter: [
        'all',
        ['!', ['match', ['get', 'featureType'], ROAD_FEATURE_TYPES, true, false]],
        ['!', ['match', ['get', 'featureType'], BUILDING_FEATURE_TYPES, true, false]]
      ],
      layout: {
        'text-field': ['get', 'displayName'],
        'text-size': buildTextSizeExpression(11.4),
        'text-letter-spacing': buildTextLetterSpacingExpression(0),
        'text-max-width': 10,
        'text-padding': 6,
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': buildTextRadialOffsetExpression(0.55),
        'text-optional': true,
        'text-allow-overlap': false,
        'symbol-sort-key': buildSortKeyExpression(-180)
      },
      paint: {
        'text-color': ['coalesce', ['get', 'textColor'], DEFAULT_TEXT_COLOR],
        'text-halo-color': ['coalesce', ['get', 'haloColor'], DEFAULT_HALO_COLOR],
        'text-halo-width': 1.5,
        'text-halo-blur': 0.5
      }
    });
  }

  if (!map.getLayer(BUSINESS_POINT_LAYER_ID)) {
    addSymbolLayer(map, {
      id: BUSINESS_POINT_LAYER_ID,
      type: 'symbol',
      source: BUSINESS_LABEL_SOURCE_ID,
      filter: ['match', ['get', 'featureType'], BUSINESS_POINT_FEATURE_TYPES, true, false],
      layout: {
        'text-field': ['get', 'displayName'],
        'text-size': buildTextSizeExpression(11.2),
        'text-letter-spacing': buildTextLetterSpacingExpression(0),
        'text-padding': 6,
        'text-max-width': 10,
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': buildTextRadialOffsetExpression(0.55),
        'text-optional': true,
        'text-allow-overlap': false,
        'symbol-sort-key': buildSortKeyExpression(-180)
      },
      paint: {
        'text-color': ['coalesce', ['get', 'textColor'], '#364152'],
        'text-halo-color': ['coalesce', ['get', 'haloColor'], 'rgba(255, 255, 255, 0.96)'],
        'text-halo-width': 1.35,
        'text-halo-blur': 0.5
      }
    });
  }

  if (!map.getLayer(BUSINESS_SURFACE_LAYER_ID)) {
    addSymbolLayer(map, {
      id: BUSINESS_SURFACE_LAYER_ID,
      type: 'symbol',
      source: BUSINESS_LABEL_SOURCE_ID,
      filter: ['match', ['get', 'featureType'], BUSINESS_SURFACE_FEATURE_TYPES, true, false],
      layout: {
        'text-field': ['get', 'displayName'],
        'text-size': buildTextSizeExpression(12.2),
        'text-letter-spacing': buildTextLetterSpacingExpression(0.015),
        'text-padding': 5,
        'text-max-width': 9,
        'text-variable-anchor': ['center', 'top', 'bottom'],
        'text-radial-offset': buildTextRadialOffsetExpression(0.25),
        'text-optional': true,
        'text-allow-overlap': false,
        'symbol-sort-key': buildSortKeyExpression(-160)
      },
      paint: {
        'text-color': ['coalesce', ['get', 'textColor'], '#4a5567'],
        'text-halo-color': ['coalesce', ['get', 'haloColor'], 'rgba(246, 244, 239, 0.94)'],
        'text-halo-width': 1.35,
        'text-halo-blur': 0.5
      }
    });
  }
}

export function updateMapLabelSources(
  map: MapLibreMap,
  manualLabels: MapLabelFeatureCollection,
  businessLabels: MapLabelFeatureCollection
): void {
  setGeoJsonSourceData(map, MANUAL_LABEL_SOURCE_ID, manualLabels);
  setGeoJsonSourceData(map, BUSINESS_LABEL_SOURCE_ID, businessLabels);
}

function toManualLabelFeature(
  label: MapLabel,
  schema?: MapFeatureSchema | null,
  editingLabelId?: string | null
): Feature<Point, MapLabelGeoJsonProperties> {
  const hints = resolveLabelRenderProperties(schema, label, {
    state: editingLabelId === String(label.id) ? 'editing' : 'default'
  });

  return createPointFeature(
    [label.pointLongitude, label.pointLatitude],
    {
      labelId: String(label.id),
      displayName: label.displayName,
      featureType: label.featureType,
      labelType: label.labelType,
      categoryCode: label.categoryCode ?? null,
      categoryName: label.categoryName ?? null,
      typeCode: label.typeCode ?? null,
      typeName: label.typeName ?? null,
      renderType: label.renderType ?? null,
      geometryType: label.geometryType ?? 'point',
      sourceFeatureId: label.sourceFeatureId ?? null,
      sourceLayer: label.sourceLayer ?? null,
      priority: label.priority,
      sortKey: -(hints.semanticPriority ?? label.priority),
      textColor: label.textColor?.trim() && label.textColor.trim() !== DEFAULT_TEXT_COLOR
        ? label.textColor
        : hints.textColor ?? DEFAULT_TEXT_COLOR,
      haloColor: label.haloColor?.trim() && label.haloColor.trim() !== DEFAULT_HALO_COLOR
        ? label.haloColor
        : hints.haloColor ?? DEFAULT_HALO_COLOR,
      textStyleKey: hints.textStyleKey ?? null,
      textSize: hints.textSize ?? null,
      textRadialOffset: hints.textRadialOffset ?? null,
      textLetterSpacing: hints.textLetterSpacing ?? null,
      semanticMinZoom: hints.semanticMinZoom ?? label.minZoom,
      semanticMaxZoom: hints.semanticMaxZoom ?? label.maxZoom,
      semanticPriority: hints.semanticPriority ?? label.priority,
      isEditing: hints.isEditing ?? false,
      minZoom: label.minZoom,
      maxZoom: label.maxZoom,
      status: label.status,
      source: label.source ?? 'manual',
      labelOrigin: 'manual'
    },
    label.id
  );
}

export function buildManualLabelFeatureCollection(
  labels: MapLabel[],
  options?: {
    schema?: MapFeatureSchema | null;
    editingLabelId?: string | null;
    zoom?: number;
  }
): MapLabelFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: labels
      .filter((label) => {
        if (label.status !== 1) {
          return false;
        }

        if (typeof options?.zoom !== 'number') {
          return true;
        }

        return options.zoom >= label.minZoom && options.zoom <= label.maxZoom;
      })
      .map((label) => toManualLabelFeature(label, options?.schema, options?.editingLabelId))
  };
}

interface BuildBusinessLabelOptions {
  schema?: MapFeatureSchema | null;
  shops: ShopFeatureCollection;
  areas: AreaFeatureCollection;
  pois: PoiFeatureCollection;
  places: PlaceFeatureCollection;
  boundaries: BoundaryFeatureCollection;
  visibility: LayerVisibility;
  manualLabels: MapLabel[];
  zoom: number;
}

function appendBusinessLabelFeature<TProperties>(
  result: Array<Feature<Point, MapLabelGeoJsonProperties>>,
  schema: MapFeatureSchema | null | undefined,
  featureType: string,
  sourceLayer: string,
  feature: Feature<any, TProperties>,
  manualKeys: Set<string>,
  zoom: number
): void {
  const properties = (feature.properties ?? {}) as Record<string, unknown>;
  const hints = resolveFeatureRenderProperties(schema, {
    sourceType: featureType,
    categoryCode: typeof properties.categoryCode === 'string' ? properties.categoryCode : null,
    typeCode: typeof properties.typeCode === 'string' ? properties.typeCode : null,
    renderType: typeof properties.renderType === 'string' ? properties.renderType : null,
    geometryType: typeof properties.geometryType === 'string' ? properties.geometryType : feature.geometry.type
  });
  const minZoom = typeof hints.semanticMinZoom === 'number' && hints.semanticMinZoom > 0
    ? hints.semanticMinZoom
    : getDefaultMinZoom(featureType);
  const maxZoom = typeof hints.semanticMaxZoom === 'number' && hints.semanticMaxZoom > 0
    ? hints.semanticMaxZoom
    : 24;
  if (zoom < minZoom) {
    return;
  }
  if (zoom > maxZoom) {
    return;
  }

  const displayName = getLabelTextFromFeatureProperties(properties);
  if (!displayName) {
    return;
  }

  const position = getFeaturePosition(feature as Feature<any, any>);
  if (!position) {
    return;
  }

  const sourceFeatureId = getFeatureIdentifier(properties, feature.id as string | number | undefined);
  const lookupKey = buildLabelLookupKey(featureType, sourceFeatureId, sourceLayer);
  if (lookupKey && manualKeys.has(lookupKey)) {
    return;
  }

  result.push(createPointFeature(
    position,
    {
      displayName,
      featureType,
      labelType: 'business',
      categoryCode: typeof properties.categoryCode === 'string' ? properties.categoryCode : null,
      categoryName: typeof properties.categoryName === 'string' ? properties.categoryName : null,
      typeCode: typeof properties.typeCode === 'string' ? properties.typeCode : null,
      typeName: typeof properties.typeName === 'string' ? properties.typeName : null,
      renderType: typeof properties.renderType === 'string' ? properties.renderType : hints.textStyleKey ?? 'point-label',
      geometryType: typeof properties.geometryType === 'string' ? properties.geometryType : feature.geometry.type,
      sourceFeatureId,
      sourceLayer,
      priority: hints.semanticPriority ?? getDefaultPriority(featureType),
      sortKey: -(hints.semanticPriority ?? getDefaultPriority(featureType)),
      textColor: hints.textColor ?? null,
      haloColor: hints.haloColor ?? null,
      textStyleKey: hints.textStyleKey ?? null,
      textSize: hints.textSize ?? null,
      textRadialOffset: hints.textRadialOffset ?? null,
      textLetterSpacing: hints.textLetterSpacing ?? null,
      semanticMinZoom: hints.semanticMinZoom ?? minZoom,
      semanticMaxZoom: hints.semanticMaxZoom ?? maxZoom,
      semanticPriority: hints.semanticPriority ?? getDefaultPriority(featureType),
      minZoom,
      maxZoom,
      status: 1,
      source: 'business',
      labelOrigin: 'business'
    },
    sourceFeatureId ?? `${featureType}-${position[0]}-${position[1]}`
  ));
}

export function buildBusinessLabelFeatureCollection(options: BuildBusinessLabelOptions): MapLabelFeatureCollection {
  const features: Array<Feature<Point, MapLabelGeoJsonProperties>> = [];
  const manualKeys = new Set(
    options.manualLabels
      .map((label) => buildLabelLookupKey(label.featureType, label.sourceFeatureId, label.sourceLayer))
      .filter((item): item is string => Boolean(item))
  );

  if (options.visibility.shops) {
    const sourceLayer = getBusinessLabelSourceLayer('shop') || 'shops';
    for (const feature of options.shops.features) {
      appendBusinessLabelFeature(features, options.schema, 'shop', sourceLayer, feature as Feature<Point, ShopGeoJsonProperties>, manualKeys, options.zoom);
    }
  }

  if (options.visibility.pois) {
    const sourceLayer = getBusinessLabelSourceLayer('poi') || 'pois';
    for (const feature of options.pois.features) {
      appendBusinessLabelFeature(features, options.schema, 'poi', sourceLayer, feature as Feature<Point, PoiGeoJsonProperties>, manualKeys, options.zoom);
    }
  }

  if (options.visibility.places) {
    const sourceLayer = getBusinessLabelSourceLayer('place') || 'places';
    for (const feature of options.places.features) {
      appendBusinessLabelFeature(features, options.schema, 'place', sourceLayer, feature as Feature<any, PlaceGeoJsonProperties>, manualKeys, options.zoom);
    }
  }

  if (options.visibility.areas) {
    const sourceLayer = getBusinessLabelSourceLayer('area') || 'areas';
    for (const feature of options.areas.features) {
      appendBusinessLabelFeature(features, options.schema, 'area', sourceLayer, feature as Feature<any, AreaGeoJsonProperties>, manualKeys, options.zoom);
    }
  }

  if (options.visibility.boundaries) {
    const sourceLayer = getBusinessLabelSourceLayer('boundary') || 'boundaries';
    for (const feature of options.boundaries.features) {
      appendBusinessLabelFeature(features, options.schema, 'boundary', sourceLayer, feature as Feature<any, BoundaryGeoJsonProperties>, manualKeys, options.zoom);
    }
  }

  return {
    type: 'FeatureCollection',
    features
  };
}
