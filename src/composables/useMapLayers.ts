import type { Feature, FeatureCollection, Geometry, Point } from 'geojson';
import type { FilterSpecification, GeoJSONSource, Map as MapLibreMap, MapGeoJSONFeature, MapLayerMouseEvent } from 'maplibre-gl';
import { toRaw } from 'vue';
import type { AreaFeatureCollection, AreaGeoJsonProperties } from '@/types/area';
import type { BoundaryFeatureCollection, BoundaryGeoJsonProperties } from '@/types/boundary';
import type { EntityId } from '@/types/entity';
import type {
  AreaFocusTarget,
  BoundaryFocusTarget,
  LayerVisibility,
  MapFocusTarget,
  PlaceFocusTarget,
  PoiFocusTarget,
  ShopFocusTarget
} from '@/types/map';
import type { PlaceFeatureCollection, PlaceGeoJsonProperties } from '@/types/place';
import type { PoiFeatureCollection, PoiGeoJsonProperties } from '@/types/poi';
import type { ShopFeatureCollection, ShopGeoJsonProperties } from '@/types/shop';
import { getGeometryBounds, parseGeometryGeoJson } from '@/utils/geometry';

const SHOP_SOURCE_ID = 'business-shops';
const SHOP_LAYER_ID = 'business-shops-circle';
const SHOP_SYMBOL_LAYER_ID = 'business-shops-symbol';
const AREA_SOURCE_ID = 'business-areas';
const AREA_FILL_LAYER_ID = 'business-areas-fill';
const AREA_LINE_LAYER_ID = 'business-areas-line';
const POI_SOURCE_ID = 'business-pois';
const POI_LAYER_ID = 'business-pois-circle';
const POI_SYMBOL_LAYER_ID = 'business-pois-symbol';
const PLACE_SOURCE_ID = 'business-places';
const PLACE_FILL_LAYER_ID = 'business-places-fill';
const PLACE_LINE_LAYER_ID = 'business-places-line';
const PLACE_CIRCLE_LAYER_ID = 'business-places-circle';
const BOUNDARY_SOURCE_ID = 'business-boundaries';
const BOUNDARY_FILL_LAYER_ID = 'business-boundaries-fill';
const BOUNDARY_LINE_LAYER_ID = 'business-boundaries-line';
const FOCUS_SOURCE_ID = 'business-focus';
const FOCUS_FILL_LAYER_ID = 'business-focus-fill';
const FOCUS_LINE_LAYER_ID = 'business-focus-line';
const FOCUS_HALO_LAYER_ID = 'business-focus-halo';
const FOCUS_RING_LAYER_ID = 'business-focus-ring';
const FOCUS_CIRCLE_LAYER_ID = 'business-focus-circle';

const registeredMaps = new WeakSet<MapLibreMap>();
const lastInteractionSignature = new WeakMap<MapLibreMap, string>();
const sourceFeatureIndex = new WeakMap<MapLibreMap, Record<string, Map<string, Feature<Geometry>>>>();

interface SourceFeatureProperties {
  businessId?: string | number | null;
  sourceId?: string | null;
  geometryGeoJson?: string | null;
}

interface BusinessLayerHandlers {
  onShopClick?: (target: ShopFocusTarget, event: MapLayerMouseEvent) => void;
  onAreaClick?: (target: AreaFocusTarget, event: MapLayerMouseEvent) => void;
  onPoiClick?: (target: PoiFocusTarget, event: MapLayerMouseEvent) => void;
  onPlaceClick?: (target: PlaceFocusTarget, event: MapLayerMouseEvent) => void;
  onBoundaryClick?: (target: BoundaryFocusTarget, event: MapLayerMouseEvent) => void;
}

function createEmptyPointFeatureCollection<TProperties>(): FeatureCollection<Point, TProperties> {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

function createEmptyGeometryFeatureCollection<TProperties>(): FeatureCollection<Geometry, TProperties> {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

function getGeoJsonSource(map: MapLibreMap, sourceId: string): GeoJSONSource {
  return map.getSource(sourceId) as GeoJSONSource;
}

function getGeometryTypeFilter(type: 'Point' | 'LineString' | 'Polygon'): FilterSpecification {
  return ['==', ['geometry-type'], type] as FilterSpecification;
}

function getLineOrPolygonFilter(): FilterSpecification {
  return ['match', ['geometry-type'], ['LineString', 'Polygon'], true, false] as FilterSpecification;
}

function getCoalesceExpression(property: string, fallback: string | number): any {
  return ['coalesce', ['get', property], fallback];
}

function getLineDashArrayExpression(): any {
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

function getFeatureLookupKey(id: unknown, properties?: SourceFeatureProperties | null): string | null {
  const sourceId = properties?.sourceId;
  if (typeof sourceId === 'string' && sourceId.trim()) {
    return sourceId.trim();
  }

  if (typeof id === 'string' && id.trim()) {
    return id.trim();
  }

  if (typeof id === 'number' && Number.isFinite(id)) {
    return String(id);
  }

  return null;
}

function getBusinessEntityId(id: unknown, properties?: SourceFeatureProperties | null): EntityId {
  const businessId = properties?.businessId;
  if (typeof businessId === 'string' && businessId.trim()) {
    return businessId.trim();
  }

  if (typeof businessId === 'number' && Number.isFinite(businessId)) {
    return String(businessId);
  }

  if (typeof id === 'string' && id.trim()) {
    return id.trim();
  }

  if (typeof id === 'number' && Number.isFinite(id)) {
    return String(id);
  }

  return '';
}

function cloneGeoJsonData<TData extends FeatureCollection<Geometry>>(data: TData): TData {
  // MapLibre worker 对 Vue 响应式对象和超大整数 id 都比较敏感，这里统一
  // 规范成普通对象，并将 sourceId 作为地图侧 feature.id，业务主键保留在 properties.businessId。
  const raw = toRaw(data);

  return {
    type: raw.type,
    features: raw.features.map((feature) => {
      const rawProperties = (feature.properties ?? {}) as SourceFeatureProperties;
      const properties = JSON.parse(JSON.stringify(rawProperties)) as SourceFeatureProperties;
      const normalizedId = getFeatureLookupKey(feature.id, properties);
      const businessId = getBusinessEntityId(feature.id, properties);
      const geometryGeoJson = JSON.stringify(feature.geometry);

      if (!properties.sourceId && normalizedId) {
        properties.sourceId = normalizedId;
      }

      if (
        !properties.businessId &&
        ((typeof businessId === 'string' && businessId.trim()) ||
          (typeof businessId === 'number' && Number.isFinite(businessId)))
      ) {
        properties.businessId = String(businessId);
      }

      if (!properties.geometryGeoJson) {
        properties.geometryGeoJson = geometryGeoJson;
      }

      return {
        type: feature.type,
        id: normalizedId ?? undefined,
        properties,
        geometry: JSON.parse(geometryGeoJson)
      };
    })
  } as TData;
}

function indexSourceFeatures<TProperties>(
  map: MapLibreMap,
  sourceId: string,
  data: FeatureCollection<Geometry, TProperties>
): void {
  let bucket = sourceFeatureIndex.get(map);
  if (!bucket) {
    bucket = {};
    sourceFeatureIndex.set(map, bucket);
  }

  const featureMap = new Map<string, Feature<Geometry>>();
  for (const feature of data.features) {
    const featureKey = getFeatureLookupKey(feature.id, feature.properties as SourceFeatureProperties | null);
    if (!featureKey) {
      continue;
    }

    featureMap.set(featureKey, feature as Feature<Geometry>);
  }

  bucket[sourceId] = featureMap;
}

function resolveGeometryGeoJson(
  map: MapLibreMap,
  sourceId: string,
  feature: MapGeoJSONFeature,
  inlineGeometry?: string | null
): string {
  if (inlineGeometry) {
    return inlineGeometry;
  }

  const bucket = sourceFeatureIndex.get(map);
  const featureKey = getFeatureLookupKey(feature.id, feature.properties as SourceFeatureProperties | null);
  const cachedFeature = featureKey ? bucket?.[sourceId]?.get(featureKey) : undefined;
  if (cachedFeature) {
    return JSON.stringify(cachedFeature.geometry);
  }

  return JSON.stringify(feature.geometry);
}

function getResolvedGeometry(map: MapLibreMap, sourceId: string, feature: MapGeoJSONFeature): Geometry | null {
  const geometryGeoJson = resolveGeometryGeoJson(
    map,
    sourceId,
    feature,
    (feature.properties as SourceFeatureProperties | null | undefined)?.geometryGeoJson
  );

  return parseGeometryGeoJson(geometryGeoJson);
}

function getApproxGeometryBoundsArea(geometry: Geometry | null): number {
  if (!geometry) {
    return Number.POSITIVE_INFINITY;
  }

  const bounds = getGeometryBounds(geometry);
  if (!bounds) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(bounds[1][0] - bounds[0][0]) * Math.abs(bounds[1][1] - bounds[0][1]);
}

function getNumericProperty(properties: unknown, key: string): number | null {
  if (!properties || typeof properties !== 'object') {
    return null;
  }

  const value = (properties as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function selectMostSpecificFeature(
  map: MapLibreMap,
  sourceId: string,
  features: MapGeoJSONFeature[],
  options?: {
    preferHigherAdminLevel?: boolean;
    preferSmallerGeometry?: boolean;
  }
): MapGeoJSONFeature | null {
  if (!features.length) {
    return null;
  }

  const ranked = features.map((feature) => {
    const geometry = getResolvedGeometry(map, sourceId, feature);
    const properties = feature.properties as Record<string, unknown> | undefined;

    return {
      feature,
      adminLevel: getNumericProperty(properties, 'adminLevel') ?? -1,
      area: getApproxGeometryBoundsArea(geometry)
    };
  });

  ranked.sort((left, right) => {
    if (options?.preferHigherAdminLevel && left.adminLevel !== right.adminLevel) {
      return right.adminLevel - left.adminLevel;
    }

    if (options?.preferSmallerGeometry && left.area !== right.area) {
      return left.area - right.area;
    }

    return 0;
  });

  return ranked[0]?.feature ?? null;
}

function setGeoJsonSourceData<TData extends FeatureCollection<Geometry>>(map: MapLibreMap, sourceId: string, data: TData): void {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (!source) {
    if (import.meta.env.DEV) {
      console.warn(`[MapLayers] source not found: ${sourceId}`);
    }
    return;
  }

  try {
    source.setData(cloneGeoJsonData(data));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[MapLayers] setData failed', {
        sourceId,
        featureCount: Array.isArray(data.features) ? data.features.length : 0,
        error
      });
    }

    throw error;
  }
}

function toEntityId(value: unknown): EntityId {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  return '';
}

function toShopTarget(feature: MapGeoJSONFeature): ShopFocusTarget | null {
  if (feature.geometry.type !== 'Point') {
    return null;
  }

  const properties = feature.properties as Partial<ShopGeoJsonProperties>;
  const [longitude, latitude] = feature.geometry.coordinates;

  return {
    entityType: 'shop',
    id: getBusinessEntityId(feature.id, properties),
    name: properties.name ?? '未命名店铺',
    category: properties.category,
    categoryCode: properties.categoryCode,
    categoryName: properties.categoryName,
    typeCode: properties.typeCode,
    typeName: properties.typeName,
    renderType: properties.renderType,
    geometryType: properties.geometryType,
    remark: properties.remark,
    icon: properties.icon,
    status: typeof properties.status === 'number' ? properties.status : 0,
    longitude,
    latitude
  };
}

function toPoiTarget(feature: MapGeoJSONFeature): PoiFocusTarget | null {
  if (feature.geometry.type !== 'Point') {
    return null;
  }

  const properties = feature.properties as Partial<PoiGeoJsonProperties>;
  const [longitude, latitude] = feature.geometry.coordinates;

  return {
    entityType: 'poi',
    id: getBusinessEntityId(feature.id, properties),
    name: properties.name ?? '未命名 POI',
    category: properties.category,
    subcategory: properties.subcategory,
    categoryCode: properties.categoryCode,
    categoryName: properties.categoryName,
    typeCode: properties.typeCode,
    typeName: properties.typeName,
    renderType: properties.renderType,
    geometryType: properties.geometryType,
    remark: properties.remark,
    icon: properties.icon,
    address: properties.address,
    phone: properties.phone,
    status: typeof properties.status === 'number' ? properties.status : 0,
    longitude,
    latitude
  };
}

function toAreaTarget(map: MapLibreMap, feature: MapGeoJSONFeature): AreaFocusTarget {
  const properties = feature.properties as Partial<AreaGeoJsonProperties>;

  return {
    entityType: 'area',
    id: getBusinessEntityId(feature.id, properties),
    name: properties.name ?? '未命名区域',
    type: properties.type,
    categoryCode: properties.categoryCode,
    categoryName: properties.categoryName,
    typeCode: properties.typeCode,
    typeName: properties.typeName,
    renderType: properties.renderType,
    geometryType: properties.geometryType,
    remark: properties.remark,
    styleJson: properties.styleJson,
    status: typeof properties.status === 'number' ? properties.status : 0,
    geometryGeoJson: resolveGeometryGeoJson(map, AREA_SOURCE_ID, feature, properties.geometryGeoJson)
  };
}

function toPlaceTarget(map: MapLibreMap, feature: MapGeoJSONFeature): PlaceFocusTarget {
  const properties = feature.properties as Partial<PlaceGeoJsonProperties>;

  return {
    entityType: 'place',
    id: getBusinessEntityId(feature.id, properties),
    name: properties.name ?? '未命名地名',
    placeType: properties.placeType,
    adminLevel: typeof properties.adminLevel === 'number' ? properties.adminLevel : undefined,
    categoryCode: properties.categoryCode,
    categoryName: properties.categoryName,
    typeCode: properties.typeCode,
    typeName: properties.typeName,
    renderType: properties.renderType,
    geometryType: properties.geometryType,
    remark: properties.remark,
    status: typeof properties.status === 'number' ? properties.status : 0,
    geometryGeoJson: resolveGeometryGeoJson(map, PLACE_SOURCE_ID, feature, properties.geometryGeoJson),
    centerLongitude: typeof properties.centerLongitude === 'number' ? properties.centerLongitude : undefined,
    centerLatitude: typeof properties.centerLatitude === 'number' ? properties.centerLatitude : undefined
  };
}

function toBoundaryTarget(map: MapLibreMap, feature: MapGeoJSONFeature): BoundaryFocusTarget {
  const properties = feature.properties as Partial<BoundaryGeoJsonProperties>;

  return {
    entityType: 'boundary',
    id: getBusinessEntityId(feature.id, properties),
    name: properties.name ?? '未命名边界',
    boundaryType: properties.boundaryType,
    adminLevel: typeof properties.adminLevel === 'number' ? properties.adminLevel : undefined,
    categoryCode: properties.categoryCode,
    categoryName: properties.categoryName,
    typeCode: properties.typeCode,
    typeName: properties.typeName,
    renderType: properties.renderType,
    geometryType: properties.geometryType,
    remark: properties.remark,
    styleJson: properties.styleJson,
    status: typeof properties.status === 'number' ? properties.status : 0,
    geometryGeoJson: resolveGeometryGeoJson(map, BOUNDARY_SOURCE_ID, feature, properties.geometryGeoJson)
  };
}

function createFocusFeatureCollection(target: MapFocusTarget | null | undefined): FeatureCollection<Geometry> {
  if (!target) {
    return createEmptyGeometryFeatureCollection();
  }

  if (target.entityType === 'shop' || target.entityType === 'poi' || target.entityType === 'label') {
    const feature: Feature<Point> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [target.longitude, target.latitude]
      }
    };

    return {
      type: 'FeatureCollection',
      features: [feature]
    };
  }

  const geometry = parseGeometryGeoJson(target.geometryGeoJson);
  if (geometry) {
    const features: Feature<Geometry>[] = [
      {
        type: 'Feature',
        properties: {},
        geometry
      }
    ];

    if (target.entityType === 'place' && typeof target.centerLongitude === 'number' && typeof target.centerLatitude === 'number') {
      features.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [target.centerLongitude, target.centerLatitude]
        }
      });
    }

    return {
      type: 'FeatureCollection',
      features
    };
  }

  if (target.entityType === 'place' && typeof target.centerLongitude === 'number' && typeof target.centerLatitude === 'number') {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [target.centerLongitude, target.centerLatitude]
          }
        }
      ]
    };
  }

  return createEmptyGeometryFeatureCollection();
}

export function ensureBusinessLayers(map: MapLibreMap): void {
  if (!map.getSource(AREA_SOURCE_ID)) {
    map.addSource(AREA_SOURCE_ID, {
      type: 'geojson',
      data: createEmptyGeometryFeatureCollection<AreaGeoJsonProperties>()
    });
  }

  if (!map.getSource(BOUNDARY_SOURCE_ID)) {
    map.addSource(BOUNDARY_SOURCE_ID, {
      type: 'geojson',
      data: createEmptyGeometryFeatureCollection<BoundaryGeoJsonProperties>()
    });
  }

  if (!map.getSource(PLACE_SOURCE_ID)) {
    map.addSource(PLACE_SOURCE_ID, {
      type: 'geojson',
      data: createEmptyGeometryFeatureCollection<PlaceGeoJsonProperties>()
    });
  }

  if (!map.getSource(SHOP_SOURCE_ID)) {
    map.addSource(SHOP_SOURCE_ID, {
      type: 'geojson',
      data: createEmptyPointFeatureCollection<ShopGeoJsonProperties>()
    });
  }

  if (!map.getSource(POI_SOURCE_ID)) {
    map.addSource(POI_SOURCE_ID, {
      type: 'geojson',
      data: createEmptyPointFeatureCollection<PoiGeoJsonProperties>()
    });
  }

  if (!map.getSource(FOCUS_SOURCE_ID)) {
    map.addSource(FOCUS_SOURCE_ID, {
      type: 'geojson',
      data: createEmptyGeometryFeatureCollection<Record<string, never>>()
    });
  }

  if (!map.getLayer(AREA_FILL_LAYER_ID)) {
    map.addLayer({
      id: AREA_FILL_LAYER_ID,
      type: 'fill',
      source: AREA_SOURCE_ID,
      filter: getGeometryTypeFilter('Polygon'),
      paint: {
        'fill-color': getCoalesceExpression('fillColorHint', 'rgba(90, 142, 230, 0.14)'),
        'fill-opacity': getCoalesceExpression('fillOpacityHint', 0.12)
      }
    });
  }

  if (!map.getLayer(AREA_LINE_LAYER_ID)) {
    map.addLayer({
      id: AREA_LINE_LAYER_ID,
      type: 'line',
      source: AREA_SOURCE_ID,
      filter: getGeometryTypeFilter('Polygon'),
      layout: {
        'line-join': 'round'
      },
      paint: {
        'line-color': getCoalesceExpression('lineColorHint', '#4478d6'),
        'line-opacity': getCoalesceExpression('lineOpacityHint', 0.9),
        'line-width': getCoalesceExpression('lineWidthHint', 1.8),
        'line-dasharray': getLineDashArrayExpression()
      }
    });
  }

  if (!map.getLayer(BOUNDARY_FILL_LAYER_ID)) {
    map.addLayer({
      id: BOUNDARY_FILL_LAYER_ID,
      type: 'fill',
      source: BOUNDARY_SOURCE_ID,
      filter: getGeometryTypeFilter('Polygon'),
      paint: {
        'fill-color': getCoalesceExpression('fillColorHint', 'rgba(141, 106, 74, 0.06)'),
        'fill-opacity': getCoalesceExpression('fillOpacityHint', 0.06)
      }
    });
  }

  if (!map.getLayer(BOUNDARY_LINE_LAYER_ID)) {
    map.addLayer({
      id: BOUNDARY_LINE_LAYER_ID,
      type: 'line',
      source: BOUNDARY_SOURCE_ID,
      filter: getLineOrPolygonFilter(),
      layout: {
        'line-join': 'round'
      },
      paint: {
        'line-color': getCoalesceExpression('lineColorHint', '#8d6a4a'),
        'line-opacity': getCoalesceExpression('lineOpacityHint', 0.88),
        'line-dasharray': getLineDashArrayExpression(),
        'line-width': getCoalesceExpression('lineWidthHint', 1.8)
      }
    });
  }

  if (!map.getLayer(PLACE_FILL_LAYER_ID)) {
    map.addLayer({
      id: PLACE_FILL_LAYER_ID,
      type: 'fill',
      source: PLACE_SOURCE_ID,
      filter: getGeometryTypeFilter('Polygon'),
      paint: {
        'fill-color': getCoalesceExpression('fillColorHint', 'rgba(123, 120, 214, 0.08)'),
        'fill-opacity': getCoalesceExpression('fillOpacityHint', 0.08)
      }
    });
  }

  if (!map.getLayer(PLACE_LINE_LAYER_ID)) {
    map.addLayer({
      id: PLACE_LINE_LAYER_ID,
      type: 'line',
      source: PLACE_SOURCE_ID,
      filter: getGeometryTypeFilter('Polygon'),
      layout: {
        'line-join': 'round'
      },
      paint: {
        'line-color': getCoalesceExpression('lineColorHint', '#6f6ad2'),
        'line-opacity': getCoalesceExpression('lineOpacityHint', 0.8),
        'line-width': getCoalesceExpression('lineWidthHint', 1.6),
        'line-dasharray': getLineDashArrayExpression()
      }
    });
  }

  if (!map.getLayer(PLACE_CIRCLE_LAYER_ID)) {
    map.addLayer({
      id: PLACE_CIRCLE_LAYER_ID,
      type: 'circle',
      source: PLACE_SOURCE_ID,
      filter: getGeometryTypeFilter('Point'),
      paint: {
        'circle-radius': getCoalesceExpression('markerRadius', 5.4),
        'circle-color': getCoalesceExpression('markerColor', '#6f6ad2'),
        'circle-opacity': getCoalesceExpression('markerOpacity', 0.92),
        'circle-stroke-width': ['case', ['boolean', ['get', 'isSelected'], false], 2.2, 1.4],
        'circle-stroke-color': getCoalesceExpression('markerStrokeColor', '#ffffff')
      }
    });
  }

  if (!map.getLayer(SHOP_LAYER_ID)) {
    map.addLayer({
      id: SHOP_LAYER_ID,
      type: 'circle',
      source: SHOP_SOURCE_ID,
      filter: getGeometryTypeFilter('Point'),
      paint: {
        'circle-radius': getCoalesceExpression('markerRadius', 6.2),
        'circle-color': getCoalesceExpression('markerColor', '#3e7fe0'),
        'circle-opacity': getCoalesceExpression('markerOpacity', 0.95),
        'circle-stroke-width': ['case', ['boolean', ['get', 'isSelected'], false], 2.6, 1.6],
        'circle-stroke-color': getCoalesceExpression('markerStrokeColor', '#ffffff')
      }
    });
  }

  if (!map.getLayer(SHOP_SYMBOL_LAYER_ID)) {
    map.addLayer({
      id: SHOP_SYMBOL_LAYER_ID,
      type: 'symbol',
      source: SHOP_SOURCE_ID,
      filter: getGeometryTypeFilter('Point'),
      layout: {
        'text-field': ['coalesce', ['get', 'markerGlyph'], ''],
        'text-size': 10.5,
        'text-font': ['Open Sans Semibold'],
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': getCoalesceExpression('markerGlyphColor', '#ffffff')
      }
    });
  }

  if (!map.getLayer(POI_LAYER_ID)) {
    map.addLayer({
      id: POI_LAYER_ID,
      type: 'circle',
      source: POI_SOURCE_ID,
      filter: getGeometryTypeFilter('Point'),
      paint: {
        'circle-radius': getCoalesceExpression('markerRadius', 5.9),
        'circle-color': getCoalesceExpression('markerColor', '#1d9ab0'),
        'circle-opacity': getCoalesceExpression('markerOpacity', 0.94),
        'circle-stroke-width': ['case', ['boolean', ['get', 'isSelected'], false], 2.5, 1.5],
        'circle-stroke-color': getCoalesceExpression('markerStrokeColor', '#ffffff')
      }
    });
  }

  if (!map.getLayer(POI_SYMBOL_LAYER_ID)) {
    map.addLayer({
      id: POI_SYMBOL_LAYER_ID,
      type: 'symbol',
      source: POI_SOURCE_ID,
      filter: getGeometryTypeFilter('Point'),
      layout: {
        'text-field': ['coalesce', ['get', 'markerGlyph'], ''],
        'text-size': 10.2,
        'text-font': ['Open Sans Semibold'],
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': getCoalesceExpression('markerGlyphColor', '#ffffff')
      }
    });
  }

  if (!map.getLayer(FOCUS_FILL_LAYER_ID)) {
    map.addLayer({
      id: FOCUS_FILL_LAYER_ID,
      type: 'fill',
      source: FOCUS_SOURCE_ID,
      filter: getGeometryTypeFilter('Polygon'),
      paint: {
        'fill-color': '#1f7cff',
        'fill-opacity': 0.18
      }
    });
  }

  if (!map.getLayer(FOCUS_LINE_LAYER_ID)) {
    map.addLayer({
      id: FOCUS_LINE_LAYER_ID,
      type: 'line',
      source: FOCUS_SOURCE_ID,
      filter: getLineOrPolygonFilter(),
      layout: {
        'line-join': 'round'
      },
      paint: {
        'line-color': '#1f7cff',
        'line-opacity': 1,
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2.4, 14, 4, 18, 5]
      }
    });
  }

  if (!map.getLayer(FOCUS_HALO_LAYER_ID)) {
    map.addLayer({
      id: FOCUS_HALO_LAYER_ID,
      type: 'circle',
      source: FOCUS_SOURCE_ID,
      filter: getGeometryTypeFilter('Point'),
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 16, 12, 22, 16, 28],
        'circle-color': '#1f7cff',
        'circle-opacity': 0.14,
        'circle-blur': 0.5
      }
    });
  }

  if (!map.getLayer(FOCUS_RING_LAYER_ID)) {
    map.addLayer({
      id: FOCUS_RING_LAYER_ID,
      type: 'circle',
      source: FOCUS_SOURCE_ID,
      filter: getGeometryTypeFilter('Point'),
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 13, 16, 16],
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 2.2, 16, 2.8],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.96
      }
    });
  }

  if (!map.getLayer(FOCUS_CIRCLE_LAYER_ID)) {
    map.addLayer({
      id: FOCUS_CIRCLE_LAYER_ID,
      type: 'circle',
      source: FOCUS_SOURCE_ID,
      filter: getGeometryTypeFilter('Point'),
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 5, 12, 6.8, 16, 8.8],
        'circle-color': '#1f7cff',
        'circle-opacity': 0.98,
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1.8, 16, 2.6],
        'circle-stroke-color': '#ffffff'
      }
    });
  }
}

export function updateBusinessSources(
  map: MapLibreMap,
  shops: ShopFeatureCollection,
  areas: AreaFeatureCollection,
  pois: PoiFeatureCollection,
  places: PlaceFeatureCollection,
  boundaries: BoundaryFeatureCollection
): void {
  indexSourceFeatures(map, SHOP_SOURCE_ID, shops);
  indexSourceFeatures(map, AREA_SOURCE_ID, areas);
  indexSourceFeatures(map, POI_SOURCE_ID, pois);
  indexSourceFeatures(map, PLACE_SOURCE_ID, places);
  indexSourceFeatures(map, BOUNDARY_SOURCE_ID, boundaries);

  setGeoJsonSourceData(map, SHOP_SOURCE_ID, shops);
  setGeoJsonSourceData(map, AREA_SOURCE_ID, areas);
  setGeoJsonSourceData(map, POI_SOURCE_ID, pois);
  setGeoJsonSourceData(map, PLACE_SOURCE_ID, places);
  setGeoJsonSourceData(map, BOUNDARY_SOURCE_ID, boundaries);
}

export function updateFocusedEntity(map: MapLibreMap, target: MapFocusTarget | null | undefined): void {
  setGeoJsonSourceData(map, FOCUS_SOURCE_ID, createFocusFeatureCollection(target));
}

export function setBusinessLayerVisibility(map: MapLibreMap, visibility: LayerVisibility): void {
  const setVisibility = (layerId: string, show: boolean): void => {
    if (!map.getLayer(layerId)) {
      return;
    }

    try {
      map.setLayoutProperty(layerId, 'visibility', show ? 'visible' : 'none');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(`[MapLayers] failed to update visibility for ${layerId}`, error);
      }
    }
  };

  setVisibility(SHOP_LAYER_ID, visibility.shops);
  setVisibility(SHOP_SYMBOL_LAYER_ID, visibility.shops);
  setVisibility(AREA_FILL_LAYER_ID, visibility.areas);
  setVisibility(AREA_LINE_LAYER_ID, visibility.areas);
  setVisibility(POI_LAYER_ID, visibility.pois);
  setVisibility(POI_SYMBOL_LAYER_ID, visibility.pois);
  setVisibility(PLACE_FILL_LAYER_ID, visibility.places);
  setVisibility(PLACE_LINE_LAYER_ID, visibility.places);
  setVisibility(PLACE_CIRCLE_LAYER_ID, visibility.places);
  setVisibility(BOUNDARY_FILL_LAYER_ID, visibility.boundaries);
  setVisibility(BOUNDARY_LINE_LAYER_ID, visibility.boundaries);
}

export function registerBusinessLayerEvents(map: MapLibreMap, handlers: BusinessLayerHandlers): void {
  if (registeredMaps.has(map)) {
    return;
  }

  registeredMaps.add(map);

  const shouldHandleInteraction = (feature: MapGeoJSONFeature, event: MapLayerMouseEvent): boolean => {
    const signature = `${event.originalEvent.timeStamp}:${String(feature.id)}`;
    const previous = lastInteractionSignature.get(map);
    if (previous === signature) {
      return false;
    }

    lastInteractionSignature.set(map, signature);
    window.setTimeout(() => {
      if (lastInteractionSignature.get(map) === signature) {
        lastInteractionSignature.delete(map);
      }
    }, 0);
    return true;
  };

  for (const layerId of [SHOP_LAYER_ID, SHOP_SYMBOL_LAYER_ID]) {
    map.on('click', layerId, (event) => {
      const feature = event.features?.[0];
      if (!feature) {
        return;
      }

      if (!shouldHandleInteraction(feature, event)) {
        return;
      }

      const target = toShopTarget(feature);
      if (target) {
        handlers.onShopClick?.(target, event);
      }
    });
  }

  for (const layerId of [POI_LAYER_ID, POI_SYMBOL_LAYER_ID]) {
    map.on('click', layerId, (event) => {
      const feature = event.features?.[0];
      if (!feature) {
        return;
      }

      if (!shouldHandleInteraction(feature, event)) {
        return;
      }

      const target = toPoiTarget(feature);
      if (target) {
        handlers.onPoiClick?.(target, event);
      }
    });
  }

  for (const layerId of [AREA_FILL_LAYER_ID, AREA_LINE_LAYER_ID]) {
    map.on('click', layerId, (event) => {
      const feature = selectMostSpecificFeature(map, AREA_SOURCE_ID, event.features ?? [], {
        preferSmallerGeometry: true
      });
      if (!feature) {
        return;
      }

      if (!shouldHandleInteraction(feature, event)) {
        return;
      }

      handlers.onAreaClick?.(toAreaTarget(map, feature), event);
    });
  }

  for (const layerId of [PLACE_FILL_LAYER_ID, PLACE_LINE_LAYER_ID, PLACE_CIRCLE_LAYER_ID]) {
    map.on('click', layerId, (event) => {
      const feature = selectMostSpecificFeature(map, PLACE_SOURCE_ID, event.features ?? [], {
        preferHigherAdminLevel: true,
        preferSmallerGeometry: true
      });
      if (!feature) {
        return;
      }

      if (!shouldHandleInteraction(feature, event)) {
        return;
      }

      handlers.onPlaceClick?.(toPlaceTarget(map, feature), event);
    });
  }

  for (const layerId of [BOUNDARY_FILL_LAYER_ID, BOUNDARY_LINE_LAYER_ID]) {
    map.on('click', layerId, (event) => {
      const feature = selectMostSpecificFeature(map, BOUNDARY_SOURCE_ID, event.features ?? [], {
        preferHigherAdminLevel: true,
        preferSmallerGeometry: true
      });
      if (!feature) {
        return;
      }

      if (!shouldHandleInteraction(feature, event)) {
        return;
      }

      handlers.onBoundaryClick?.(toBoundaryTarget(map, feature), event);
    });
  }

  for (const layerId of [
    SHOP_LAYER_ID,
    SHOP_SYMBOL_LAYER_ID,
    AREA_FILL_LAYER_ID,
    AREA_LINE_LAYER_ID,
    POI_LAYER_ID,
    POI_SYMBOL_LAYER_ID,
    PLACE_FILL_LAYER_ID,
    PLACE_LINE_LAYER_ID,
    PLACE_CIRCLE_LAYER_ID,
    BOUNDARY_FILL_LAYER_ID,
    BOUNDARY_LINE_LAYER_ID
  ]) {
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  }
}
