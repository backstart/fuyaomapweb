import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent, MapGeoJSONFeature } from 'maplibre-gl';
import type { AreaFeatureCollection, AreaGeoJsonProperties } from '@/types/area';
import type { AreaFocusTarget, LayerVisibility, ShopFocusTarget } from '@/types/map';
import type { ShopFeatureCollection, ShopGeoJsonProperties } from '@/types/shop';

const SHOP_SOURCE_ID = 'business-shops';
const SHOP_LAYER_ID = 'business-shops-circle';
const AREA_SOURCE_ID = 'business-areas';
const AREA_FILL_LAYER_ID = 'business-areas-fill';
const AREA_LINE_LAYER_ID = 'business-areas-line';

const registeredMaps = new WeakSet<MapLibreMap>();

interface BusinessLayerHandlers {
  onShopClick?: (target: ShopFocusTarget, event: MapLayerMouseEvent) => void;
  onAreaClick?: (target: AreaFocusTarget, event: MapLayerMouseEvent) => void;
}

function createEmptyShops(): ShopFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

function createEmptyAreas(): AreaFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

function getGeoJsonSource(map: MapLibreMap, sourceId: string): GeoJSONSource {
  return map.getSource(sourceId) as GeoJSONSource;
}

function toNumericId(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return 0;
}

function toShopTarget(feature: MapGeoJSONFeature): ShopFocusTarget | null {
  if (feature.geometry.type !== 'Point') {
    return null;
  }

  const properties = feature.properties as Partial<ShopGeoJsonProperties>;
  const [longitude, latitude] = feature.geometry.coordinates;

  return {
    entityType: 'shop',
    id: toNumericId(feature.id),
    name: properties.name ?? '未命名店铺',
    category: properties.category,
    remark: properties.remark,
    icon: properties.icon,
    status: typeof properties.status === 'number' ? properties.status : 0,
    longitude,
    latitude
  };
}

function toAreaTarget(feature: MapGeoJSONFeature): AreaFocusTarget | null {
  const properties = feature.properties as Partial<AreaGeoJsonProperties>;

  return {
    entityType: 'area',
    id: toNumericId(feature.id),
    name: properties.name ?? '未命名区域',
    type: properties.type,
    remark: properties.remark,
    styleJson: properties.styleJson,
    status: typeof properties.status === 'number' ? properties.status : 0,
    geometryGeoJson: JSON.stringify(feature.geometry)
  };
}

export function ensureBusinessLayers(map: MapLibreMap): void {
  if (!map.getSource(AREA_SOURCE_ID)) {
    map.addSource(AREA_SOURCE_ID, {
      type: 'geojson',
      data: createEmptyAreas()
    });
  }

  if (!map.getSource(SHOP_SOURCE_ID)) {
    map.addSource(SHOP_SOURCE_ID, {
      type: 'geojson',
      data: createEmptyShops()
    });
  }

  if (!map.getLayer(AREA_FILL_LAYER_ID)) {
    map.addLayer({
      id: AREA_FILL_LAYER_ID,
      type: 'fill',
      source: AREA_SOURCE_ID,
      paint: {
        'fill-color': [
          'case',
          ['has', 'styleJson'],
          '#4f8ddf',
          '#5b8def'
        ],
        'fill-opacity': 0.18
      }
    });
  }

  if (!map.getLayer(AREA_LINE_LAYER_ID)) {
    map.addLayer({
      id: AREA_LINE_LAYER_ID,
      type: 'line',
      source: AREA_SOURCE_ID,
      paint: {
        'line-color': '#2d63c8',
        'line-width': 2
      }
    });
  }

  if (!map.getLayer(SHOP_LAYER_ID)) {
    map.addLayer({
      id: SHOP_LAYER_ID,
      type: 'circle',
      source: SHOP_SOURCE_ID,
      paint: {
        'circle-radius': 6.5,
        'circle-color': '#f97316',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });
  }
}

export function updateBusinessSources(
  map: MapLibreMap,
  shops: ShopFeatureCollection,
  areas: AreaFeatureCollection
): void {
  getGeoJsonSource(map, SHOP_SOURCE_ID).setData(shops);
  getGeoJsonSource(map, AREA_SOURCE_ID).setData(areas);
}

export function setBusinessLayerVisibility(map: MapLibreMap, visibility: LayerVisibility): void {
  map.setLayoutProperty(SHOP_LAYER_ID, 'visibility', visibility.shops ? 'visible' : 'none');
  map.setLayoutProperty(AREA_FILL_LAYER_ID, 'visibility', visibility.areas ? 'visible' : 'none');
  map.setLayoutProperty(AREA_LINE_LAYER_ID, 'visibility', visibility.areas ? 'visible' : 'none');
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

  map.on('click', AREA_FILL_LAYER_ID, (event) => {
    const feature = event.features?.[0];
    if (!feature) {
      return;
    }

    const target = toAreaTarget(feature);
    if (target) {
      handlers.onAreaClick?.(target, event);
    }
  });

  for (const layerId of [SHOP_LAYER_ID, AREA_FILL_LAYER_ID]) {
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  }
}
