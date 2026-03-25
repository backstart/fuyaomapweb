import type { Feature, Point } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { AreaFeatureCollection, AreaGeoJsonProperties } from '@/types/area';
import type { BoundaryFeatureCollection, BoundaryGeoJsonProperties } from '@/types/boundary';
import type { LayerVisibility } from '@/types/map';
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

const MANUAL_LABEL_SOURCE_ID = 'map-manual-labels';
const BUSINESS_LABEL_SOURCE_ID = 'map-business-labels';
const MANUAL_ROAD_LAYER_ID = 'map-manual-road-labels';
const MANUAL_BUILDING_LAYER_ID = 'map-manual-building-labels';
const MANUAL_BUSINESS_LAYER_ID = 'map-manual-business-labels';
const BUSINESS_POINT_LAYER_ID = 'map-business-point-labels';
const BUSINESS_SURFACE_LAYER_ID = 'map-business-surface-labels';
const FOCUS_FILL_LAYER_ID = 'business-focus-fill';

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
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, 11, 14, 12.6, 18, 14],
        'text-letter-spacing': 0.02,
        'text-max-width': 12,
        'text-padding': 3,
        'text-radial-offset': 0.15,
        'text-variable-anchor': ['center', 'top', 'bottom'],
        'text-optional': true,
        'text-allow-overlap': false,
        'symbol-sort-key': ['get', 'sortKey']
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
        'text-size': ['interpolate', ['linear'], ['zoom'], 15, 10.8, 18, 12.8],
        'text-max-width': 9,
        'text-padding': 5,
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.4,
        'text-optional': true,
        'text-allow-overlap': false,
        'symbol-sort-key': ['get', 'sortKey']
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
        'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11, 14, 12.2, 18, 13.4],
        'text-max-width': 10,
        'text-padding': 6,
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.55,
        'text-optional': true,
        'text-allow-overlap': false,
        'symbol-sort-key': ['get', 'sortKey']
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
        'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10.4, 16, 11.8],
        'text-padding': 6,
        'text-max-width': 10,
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.55,
        'text-optional': true,
        'text-allow-overlap': false,
        'symbol-sort-key': ['get', 'sortKey']
      },
      paint: {
        'text-color': '#364152',
        'text-halo-color': 'rgba(255, 255, 255, 0.96)',
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
        'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10.8, 15, 12.6],
        'text-padding': 5,
        'text-max-width': 9,
        'text-variable-anchor': ['center', 'top', 'bottom'],
        'text-radial-offset': 0.25,
        'text-optional': true,
        'text-allow-overlap': false,
        'symbol-sort-key': ['get', 'sortKey']
      },
      paint: {
        'text-color': '#4a5567',
        'text-halo-color': 'rgba(246, 244, 239, 0.94)',
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

function toManualLabelFeature(label: MapLabel): Feature<Point, MapLabelGeoJsonProperties> {
  return createPointFeature(
    [label.pointLongitude, label.pointLatitude],
    {
      labelId: String(label.id),
      displayName: label.displayName,
      featureType: label.featureType,
      labelType: label.labelType,
      sourceFeatureId: label.sourceFeatureId ?? null,
      sourceLayer: label.sourceLayer ?? null,
      priority: label.priority,
      sortKey: -label.priority,
      textColor: label.textColor ?? DEFAULT_TEXT_COLOR,
      haloColor: label.haloColor ?? DEFAULT_HALO_COLOR,
      minZoom: label.minZoom,
      maxZoom: label.maxZoom,
      status: label.status,
      source: label.source ?? 'manual',
      labelOrigin: 'manual'
    },
    label.id
  );
}

export function buildManualLabelFeatureCollection(labels: MapLabel[]): MapLabelFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: labels
      .filter((label) => label.status === 1)
      .map(toManualLabelFeature)
  };
}

interface BuildBusinessLabelOptions {
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
  featureType: string,
  sourceLayer: string,
  feature: Feature<any, TProperties>,
  manualKeys: Set<string>,
  zoom: number
): void {
  const minZoom = getDefaultMinZoom(featureType);
  if (zoom < minZoom) {
    return;
  }

  const displayName = getLabelTextFromFeatureProperties((feature.properties ?? {}) as Record<string, unknown>);
  if (!displayName) {
    return;
  }

  const position = getFeaturePosition(feature as Feature<any, any>);
  if (!position) {
    return;
  }

  const sourceFeatureId = getFeatureIdentifier((feature.properties ?? {}) as Record<string, unknown>, feature.id as string | number | undefined);
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
      sourceFeatureId,
      sourceLayer,
      priority: getDefaultPriority(featureType),
      sortKey: -getDefaultPriority(featureType),
      textColor: null,
      haloColor: null,
      minZoom,
      maxZoom: 24,
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
      appendBusinessLabelFeature(features, 'shop', sourceLayer, feature as Feature<Point, ShopGeoJsonProperties>, manualKeys, options.zoom);
    }
  }

  if (options.visibility.pois) {
    const sourceLayer = getBusinessLabelSourceLayer('poi') || 'pois';
    for (const feature of options.pois.features) {
      appendBusinessLabelFeature(features, 'poi', sourceLayer, feature as Feature<Point, PoiGeoJsonProperties>, manualKeys, options.zoom);
    }
  }

  if (options.visibility.places) {
    const sourceLayer = getBusinessLabelSourceLayer('place') || 'places';
    for (const feature of options.places.features) {
      appendBusinessLabelFeature(features, 'place', sourceLayer, feature as Feature<any, PlaceGeoJsonProperties>, manualKeys, options.zoom);
    }
  }

  if (options.visibility.areas) {
    const sourceLayer = getBusinessLabelSourceLayer('area') || 'areas';
    for (const feature of options.areas.features) {
      appendBusinessLabelFeature(features, 'area', sourceLayer, feature as Feature<any, AreaGeoJsonProperties>, manualKeys, options.zoom);
    }
  }

  if (options.visibility.boundaries) {
    const sourceLayer = getBusinessLabelSourceLayer('boundary') || 'boundaries';
    for (const feature of options.boundaries.features) {
      appendBusinessLabelFeature(features, 'boundary', sourceLayer, feature as Feature<any, BoundaryGeoJsonProperties>, manualKeys, options.zoom);
    }
  }

  return {
    type: 'FeatureCollection',
    features
  };
}
