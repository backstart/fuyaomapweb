import type { Feature, FeatureCollection, Geometry, Point } from 'geojson';
import type { GeoJSONSource, Map as MapLibreMap, MapGeoJSONFeature, MapLayerMouseEvent } from 'maplibre-gl';
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
import { parseGeometryGeoJson } from '@/utils/geometry';

const SHOP_SOURCE_ID = 'business-shops';
const SHOP_LAYER_ID = 'business-shops-circle';
const AREA_SOURCE_ID = 'business-areas';
const AREA_FILL_LAYER_ID = 'business-areas-fill';
const AREA_LINE_LAYER_ID = 'business-areas-line';
const POI_SOURCE_ID = 'business-pois';
const POI_LAYER_ID = 'business-pois-circle';
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
const FOCUS_CIRCLE_LAYER_ID = 'business-focus-circle';

const registeredMaps = new WeakSet<MapLibreMap>();

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
    id: toEntityId(feature.id),
    name: properties.name ?? '未命名店铺',
    category: properties.category,
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
    id: toEntityId(feature.id),
    name: properties.name ?? '未命名 POI',
    category: properties.category,
    subcategory: properties.subcategory,
    remark: properties.remark,
    icon: properties.icon,
    address: properties.address,
    phone: properties.phone,
    status: typeof properties.status === 'number' ? properties.status : 0,
    longitude,
    latitude
  };
}

function toAreaTarget(feature: MapGeoJSONFeature): AreaFocusTarget {
  const properties = feature.properties as Partial<AreaGeoJsonProperties>;

  return {
    entityType: 'area',
    id: toEntityId(feature.id),
    name: properties.name ?? '未命名区域',
    type: properties.type,
    remark: properties.remark,
    styleJson: properties.styleJson,
    status: typeof properties.status === 'number' ? properties.status : 0,
    geometryGeoJson: JSON.stringify(feature.geometry)
  };
}

function toPlaceTarget(feature: MapGeoJSONFeature): PlaceFocusTarget {
  const properties = feature.properties as Partial<PlaceGeoJsonProperties>;

  return {
    entityType: 'place',
    id: toEntityId(feature.id),
    name: properties.name ?? '未命名地名',
    placeType: properties.placeType,
    adminLevel: typeof properties.adminLevel === 'number' ? properties.adminLevel : undefined,
    remark: properties.remark,
    status: typeof properties.status === 'number' ? properties.status : 0,
    geometryGeoJson: JSON.stringify(feature.geometry),
    centerLongitude: typeof properties.centerLongitude === 'number' ? properties.centerLongitude : undefined,
    centerLatitude: typeof properties.centerLatitude === 'number' ? properties.centerLatitude : undefined
  };
}

function toBoundaryTarget(feature: MapGeoJSONFeature): BoundaryFocusTarget {
  const properties = feature.properties as Partial<BoundaryGeoJsonProperties>;

  return {
    entityType: 'boundary',
    id: toEntityId(feature.id),
    name: properties.name ?? '未命名边界',
    boundaryType: properties.boundaryType,
    adminLevel: typeof properties.adminLevel === 'number' ? properties.adminLevel : undefined,
    remark: properties.remark,
    styleJson: properties.styleJson,
    status: typeof properties.status === 'number' ? properties.status : 0,
    geometryGeoJson: JSON.stringify(feature.geometry)
  };
}

function createFocusFeatureCollection(target: MapFocusTarget | null | undefined): FeatureCollection<Geometry> {
  if (!target) {
    return createEmptyGeometryFeatureCollection();
  }

  if (target.entityType === 'shop' || target.entityType === 'poi') {
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
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry
        }
      ]
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
      paint: {
        'fill-color': '#5a8ee6',
        'fill-opacity': 0.12
      }
    });
  }

  if (!map.getLayer(AREA_LINE_LAYER_ID)) {
    map.addLayer({
      id: AREA_LINE_LAYER_ID,
      type: 'line',
      source: AREA_SOURCE_ID,
      layout: {
        'line-join': 'round'
      },
      paint: {
        'line-color': '#4478d6',
        'line-opacity': 0.9,
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.2, 13, 1.8, 17, 2.6]
      }
    });
  }

  if (!map.getLayer(BOUNDARY_FILL_LAYER_ID)) {
    map.addLayer({
      id: BOUNDARY_FILL_LAYER_ID,
      type: 'fill',
      source: BOUNDARY_SOURCE_ID,
      paint: {
        'fill-color': '#8d6a4a',
        'fill-opacity': 0.06
      }
    });
  }

  if (!map.getLayer(BOUNDARY_LINE_LAYER_ID)) {
    map.addLayer({
      id: BOUNDARY_LINE_LAYER_ID,
      type: 'line',
      source: BOUNDARY_SOURCE_ID,
      layout: {
        'line-join': 'round'
      },
      paint: {
        'line-color': '#8d6a4a',
        'line-opacity': 0.88,
        'line-dasharray': [2.2, 1.6],
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.1, 13, 1.8, 17, 2.4]
      }
    });
  }

  if (!map.getLayer(PLACE_FILL_LAYER_ID)) {
    map.addLayer({
      id: PLACE_FILL_LAYER_ID,
      type: 'fill',
      source: PLACE_SOURCE_ID,
      paint: {
        'fill-color': '#7b78d6',
        'fill-opacity': 0.08
      }
    });
  }

  if (!map.getLayer(PLACE_LINE_LAYER_ID)) {
    map.addLayer({
      id: PLACE_LINE_LAYER_ID,
      type: 'line',
      source: PLACE_SOURCE_ID,
      layout: {
        'line-join': 'round'
      },
      paint: {
        'line-color': '#6f6ad2',
        'line-opacity': 0.8,
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 13, 1.6, 17, 2.2]
      }
    });
  }

  if (!map.getLayer(PLACE_CIRCLE_LAYER_ID)) {
    map.addLayer({
      id: PLACE_CIRCLE_LAYER_ID,
      type: 'circle',
      source: PLACE_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 5.8, 16, 8],
        'circle-color': '#6f6ad2',
        'circle-opacity': 0.92,
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1.1, 16, 1.8],
        'circle-stroke-color': '#ffffff'
      }
    });
  }

  if (!map.getLayer(SHOP_LAYER_ID)) {
    map.addLayer({
      id: SHOP_LAYER_ID,
      type: 'circle',
      source: SHOP_SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4.6, 12, 6.2, 16, 8.8],
        'circle-color': '#3e7fe0',
        'circle-opacity': 0.95,
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1.3, 16, 2],
        'circle-stroke-color': '#ffffff'
      }
    });
  }

  if (!map.getLayer(POI_LAYER_ID)) {
    map.addLayer({
      id: POI_LAYER_ID,
      type: 'circle',
      source: POI_SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4.2, 12, 5.9, 16, 8.4],
        'circle-color': '#1d9ab0',
        'circle-opacity': 0.94,
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1.2, 16, 1.9],
        'circle-stroke-color': '#ffffff'
      }
    });
  }

  if (!map.getLayer(FOCUS_FILL_LAYER_ID)) {
    map.addLayer({
      id: FOCUS_FILL_LAYER_ID,
      type: 'fill',
      source: FOCUS_SOURCE_ID,
      paint: {
        'fill-color': '#1f7cff',
        'fill-opacity': 0.16
      }
    });
  }

  if (!map.getLayer(FOCUS_LINE_LAYER_ID)) {
    map.addLayer({
      id: FOCUS_LINE_LAYER_ID,
      type: 'line',
      source: FOCUS_SOURCE_ID,
      layout: {
        'line-join': 'round'
      },
      paint: {
        'line-color': '#1f7cff',
        'line-opacity': 0.98,
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 14, 3.2, 18, 4]
      }
    });
  }

  if (!map.getLayer(FOCUS_CIRCLE_LAYER_ID)) {
    map.addLayer({
      id: FOCUS_CIRCLE_LAYER_ID,
      type: 'circle',
      source: FOCUS_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 7, 12, 10, 16, 14],
        'circle-color': '#1f7cff',
        'circle-opacity': 0.2,
        'circle-stroke-width': 2.2,
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
  getGeoJsonSource(map, SHOP_SOURCE_ID).setData(shops);
  getGeoJsonSource(map, AREA_SOURCE_ID).setData(areas);
  getGeoJsonSource(map, POI_SOURCE_ID).setData(pois);
  getGeoJsonSource(map, PLACE_SOURCE_ID).setData(places);
  getGeoJsonSource(map, BOUNDARY_SOURCE_ID).setData(boundaries);
}

export function updateFocusedEntity(map: MapLibreMap, target: MapFocusTarget | null | undefined): void {
  getGeoJsonSource(map, FOCUS_SOURCE_ID).setData(createFocusFeatureCollection(target));
}

export function setBusinessLayerVisibility(map: MapLibreMap, visibility: LayerVisibility): void {
  map.setLayoutProperty(SHOP_LAYER_ID, 'visibility', visibility.shops ? 'visible' : 'none');
  map.setLayoutProperty(AREA_FILL_LAYER_ID, 'visibility', visibility.areas ? 'visible' : 'none');
  map.setLayoutProperty(AREA_LINE_LAYER_ID, 'visibility', visibility.areas ? 'visible' : 'none');
  map.setLayoutProperty(POI_LAYER_ID, 'visibility', visibility.pois ? 'visible' : 'none');
  map.setLayoutProperty(PLACE_FILL_LAYER_ID, 'visibility', visibility.places ? 'visible' : 'none');
  map.setLayoutProperty(PLACE_LINE_LAYER_ID, 'visibility', visibility.places ? 'visible' : 'none');
  map.setLayoutProperty(PLACE_CIRCLE_LAYER_ID, 'visibility', visibility.places ? 'visible' : 'none');
  map.setLayoutProperty(BOUNDARY_FILL_LAYER_ID, 'visibility', visibility.boundaries ? 'visible' : 'none');
  map.setLayoutProperty(BOUNDARY_LINE_LAYER_ID, 'visibility', visibility.boundaries ? 'visible' : 'none');
}

export function registerBusinessLayerEvents(map: MapLibreMap, handlers: BusinessLayerHandlers): void {
  if (registeredMaps.has(map)) {
    return;
  }

  registeredMaps.add(map);

  map.on('click', SHOP_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    if (!feature) {
      return;
    }

    const target = toShopTarget(feature);
    if (target) {
      handlers.onShopClick?.(target, event);
    }
  });

  map.on('click', POI_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    if (!feature) {
      return;
    }

    const target = toPoiTarget(feature);
    if (target) {
      handlers.onPoiClick?.(target, event);
    }
  });

  for (const layerId of [AREA_FILL_LAYER_ID, AREA_LINE_LAYER_ID]) {
    map.on('click', layerId, (event) => {
      const feature = event.features?.[0];
      if (!feature) {
        return;
      }

      handlers.onAreaClick?.(toAreaTarget(feature), event);
    });
  }

  for (const layerId of [PLACE_FILL_LAYER_ID, PLACE_LINE_LAYER_ID, PLACE_CIRCLE_LAYER_ID]) {
    map.on('click', layerId, (event) => {
      const feature = event.features?.[0];
      if (!feature) {
        return;
      }

      handlers.onPlaceClick?.(toPlaceTarget(feature), event);
    });
  }

  for (const layerId of [BOUNDARY_FILL_LAYER_ID, BOUNDARY_LINE_LAYER_ID]) {
    map.on('click', layerId, (event) => {
      const feature = event.features?.[0];
      if (!feature) {
        return;
      }

      handlers.onBoundaryClick?.(toBoundaryTarget(feature), event);
    });
  }

  for (const layerId of [
    SHOP_LAYER_ID,
    AREA_FILL_LAYER_ID,
    AREA_LINE_LAYER_ID,
    POI_LAYER_ID,
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
