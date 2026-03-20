import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent, MapGeoJSONFeature } from 'maplibre-gl';
import type { AreaFeatureCollection, AreaGeoJsonProperties } from '@/types/area';
import type { AreaFocusTarget, LayerVisibility, ShopFocusTarget } from '@/types/map';
import type { ShopFeatureCollection, ShopGeoJsonProperties } from '@/types/shop';

// 所有业务图层 id 都集中定义，避免页面层手写魔法字符串。
const SHOP_SOURCE_ID = 'business-shops';
const SHOP_LAYER_ID = 'business-shops-circle';
const AREA_SOURCE_ID = 'business-areas';
const AREA_FILL_LAYER_ID = 'business-areas-fill';
const AREA_LINE_LAYER_ID = 'business-areas-line';

// 同一个 map 实例只注册一次事件，避免页面更新导致重复绑定。
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
  // 店铺只接受 Point，其他几何直接忽略。
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
  // 区域详情在 store 内统一保存为 geometryGeoJson 字符串，便于后续复用详情结构。
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
  // source 先于 layer 创建，且需要兼容重复进入地图页的情况。
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

  // 当前配色偏企业后台浅色风格，后续可替换为配置化样式。
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
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 1.2,
          13, 1.8,
          17, 2.6
        ]
      }
    });
  }

  if (!map.getLayer(SHOP_LAYER_ID)) {
    map.addLayer({
      id: SHOP_LAYER_ID,
      type: 'circle',
      source: SHOP_SOURCE_ID,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 4.6,
          12, 6.2,
          16, 8.8
        ],
        'circle-color': '#3e7fe0',
        'circle-opacity': 0.95,
        'circle-stroke-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 1.3,
          16, 2
        ],
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
  // MapLibre 支持对同一 source 直接 setData，适合 bbox 更新和筛选刷新。
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

  // 事件只暴露业务对象，不把底层 feature 结构泄露给页面。
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

  // 统一处理 hover 光标，避免每个页面重复写一遍。
  for (const layerId of [SHOP_LAYER_ID, AREA_FILL_LAYER_ID]) {
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  }
}
