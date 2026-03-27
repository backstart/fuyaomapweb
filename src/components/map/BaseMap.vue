<template>
  <div class="map-shell">
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="mapNotice" class="shell-card map-notice">
      <strong>{{ mapNotice.title }}</strong>
      <p>{{ mapNotice.message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, createApp, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { LngLatLike, Map as MapLibreMap, MapGeoJSONFeature, MapMouseEvent, Popup as MapLibrePopup } from 'maplibre-gl';
import { appConfig } from '@/config/appConfig';
import { BASEMAP_SOURCE_ID } from '@/map/amapLikeStyle';
import {
  buildDrawnBuildingDraftFeatureCollection,
  DRAWN_BUILDING_AREA_SOURCE_ID,
  DRAWN_BUILDING_FILL_LAYER_ID,
  DRAWN_BUILDING_LABEL_LAYER_ID,
  DRAWN_BUILDING_LABEL_SOURCE_ID,
  DRAWN_BUILDING_LINE_LAYER_ID,
  ensureDrawnBuildingLayers,
  updateDrawnBuildingSources
} from '@/composables/useDrawnBuildingLayers';
import { useMapLibre } from '@/composables/useMapLibre';
import {
  ensureBusinessLayers,
  registerBusinessLayerEvents,
  setBusinessLayerVisibility,
  updateFocusedEntity,
  updateBusinessSources
} from '@/composables/useMapLayers';
import { ensureMapLabelLayers, MANUAL_LABEL_LAYER_IDS, MANUAL_LABEL_SOURCE_ID, updateMapLabelSources } from '@/composables/useMapLabelLayers';
import type { AreaFeatureCollection } from '@/types/area';
import type { BoundaryFeatureCollection } from '@/types/boundary';
import EntityPopup from '@/components/map/EntityPopup.vue';
import type { EntityId } from '@/types/entity';
import type {
  AreaFocusTarget,
  BoundaryFocusTarget,
  LayerVisibility,
  MapFocusTarget,
  MapViewportState,
  PlaceFocusTarget,
  PoiFocusTarget,
  ShopFocusTarget
} from '@/types/map';
import type { BasemapInspectableFeature, MapLabelFeatureCollection, MapLabelPickMode } from '@/types/mapLabel';
import type {
  BuildingDrawMode,
  DrawnBuildingAreaFeatureCollection,
  DrawnBuildingCompletePayload,
  DrawnBuildingLabelFeatureCollection
} from '@/types/drawnBuilding';
import type { PlaceFeatureCollection } from '@/types/place';
import type { PoiFeatureCollection } from '@/types/poi';
import type { ShopFeatureCollection } from '@/types/shop';
import { boundsToBboxString } from '@/utils/bbox';
import { buildPolygonGeometry, buildRectanglePolygonGeometry, dedupeCoordinates } from '@/utils/drawnBuildings';
import { getGeometryBounds, getGeometryCenter, parseGeometryGeoJson } from '@/utils/geometry';
import { resolvePreferredName } from '@/utils/mapLabels';
import { getLastBasemapIssueMessage } from '@/utils/mapStyle';
import { maplibreglRuntime } from '@/utils/maplibreRuntime';

const INSPECTABLE_BASE_LAYER_IDS = [
  'road-label',
  'road-major-fill',
  'road-primary-fill',
  'road-secondary-fill',
  'road-local-fill',
  'road-path',
  'building-fill',
  'poi-label',
  'place-label'
] as const;

const props = defineProps<{
  shopData: ShopFeatureCollection;
  areaData: AreaFeatureCollection;
  poiData: PoiFeatureCollection;
  placeData: PlaceFeatureCollection;
  boundaryData: BoundaryFeatureCollection;
  manualLabelData: MapLabelFeatureCollection;
  businessLabelData: MapLabelFeatureCollection;
  drawnBuildingAreaData: DrawnBuildingAreaFeatureCollection;
  drawnBuildingLabelData: DrawnBuildingLabelFeatureCollection;
  layerVisibility: LayerVisibility;
  initialViewport?: MapViewportState | null;
  selectedTarget?: MapFocusTarget | null;
  focusTarget?: MapFocusTarget | null;
  labelPickMode?: MapLabelPickMode;
  drawBuildingMode?: BuildingDrawMode;
}>();

const emit = defineEmits<{
  ready: [map: MapLibreMap];
  'viewport-change': [payload: { bbox: string; center: [number, number]; zoom: number }];
  'shop-click': [target: ShopFocusTarget];
  'area-click': [target: AreaFocusTarget];
  'poi-click': [target: PoiFocusTarget];
  'place-click': [target: PlaceFocusTarget];
  'boundary-click': [target: BoundaryFocusTarget];
  'map-click': [payload: { longitude: number; latitude: number }];
  'basemap-feature-click': [feature: BasemapInspectableFeature];
  'manual-label-click': [labelId: EntityId];
  'drawn-building-click': [areaId: EntityId];
  'drawn-building-complete': [payload: DrawnBuildingCompletePayload];
}>();

const { map, initMap, destroyMap } = useMapLibre();
const mapContainer = ref<HTMLDivElement | null>(null);
const hasBaseMap = Boolean(appConfig.pmtilesUrl.trim());
const suppressNextMapClickAction = ref(false);
const rectangleAnchor = ref<[number, number] | null>(null);
const polygonVertices = ref<Array<[number, number]>>([]);
const drawCursorPoint = ref<[number, number] | null>(null);
const mapErrorMessage = ref('');
let resizeObserver: ResizeObserver | null = null;

// Popup 使用独立 Vue app 挂载，这样可以直接复用现有 Vue 组件。
let popup: MapLibrePopup | null = null;
let popupApp: ReturnType<typeof createApp> | null = null;

const mapNotice = computed(() => {
  if (!hasBaseMap) {
    return {
      title: '未配置底图',
      message: '请检查 PMTiles 地址配置。'
    };
  }

  if (!mapErrorMessage.value) {
    return null;
  }

  return {
    title: '底图加载失败',
    message: mapErrorMessage.value
  };
});

declare global {
  interface Window {
    __FUYAO_MAP_DEBUG__?: MapLibreMap;
  }
}

function getDrawingCursor(): [number, number] | null {
  return drawCursorPoint.value;
}

function getDraftGeometryGeoJson(): string | null {
  if (!props.drawBuildingMode) {
    return null;
  }

  if (props.drawBuildingMode === 'rectangle') {
    if (!rectangleAnchor.value || !getDrawingCursor()) {
      return null;
    }

    return JSON.stringify(buildRectanglePolygonGeometry(rectangleAnchor.value, getDrawingCursor()!));
  }

  const draftPoints = getDrawingCursor() ? [...polygonVertices.value, getDrawingCursor()!] : [...polygonVertices.value];
  const geometry = buildPolygonGeometry(draftPoints);
  return geometry ? JSON.stringify(geometry) : null;
}

function updateDrawnBuildingMapSources(instance: MapLibreMap): void {
  if (!instance.isStyleLoaded() || !instance.getSource(DRAWN_BUILDING_AREA_SOURCE_ID)) {
    return;
  }

  updateDrawnBuildingSources(
    instance,
    props.drawnBuildingAreaData,
    props.drawnBuildingLabelData,
    buildDrawnBuildingDraftFeatureCollection(getDraftGeometryGeoJson(), props.drawBuildingMode ?? null)
  );
}

function resetDrawInteractionState(instance?: MapLibreMap): void {
  rectangleAnchor.value = null;
  polygonVertices.value = [];
  drawCursorPoint.value = null;

  if (instance) {
    updateDrawnBuildingMapSources(instance);
  }
}

function syncInteractionMode(instance: MapLibreMap): void {
  const interactiveDraw = Boolean(props.drawBuildingMode);
  if (interactiveDraw) {
    instance.doubleClickZoom.disable();
  } else {
    instance.doubleClickZoom.enable();
  }

  instance.getCanvas().style.cursor = interactiveDraw || props.labelPickMode ? 'crosshair' : '';
}

function resolveDrawnBuildingId(feature: MapGeoJSONFeature): EntityId | null {
  if (feature.source !== DRAWN_BUILDING_AREA_SOURCE_ID && feature.source !== DRAWN_BUILDING_LABEL_SOURCE_ID) {
    return null;
  }

  const properties = feature.properties as Record<string, unknown> | undefined;
  const rawId = properties?.areaId ?? feature.id;
  if (rawId === undefined || rawId === null || !String(rawId).trim()) {
    return null;
  }

  return String(rawId).trim();
}

function queryDrawnBuildingId(mapInstance: MapLibreMap, event: MapMouseEvent): EntityId | null {
  const feature = mapInstance.queryRenderedFeatures(event.point, {
    layers: [DRAWN_BUILDING_FILL_LAYER_ID, DRAWN_BUILDING_LINE_LAYER_ID, DRAWN_BUILDING_LABEL_LAYER_ID]
  }).find((item) => item.source === DRAWN_BUILDING_AREA_SOURCE_ID || item.source === DRAWN_BUILDING_LABEL_SOURCE_ID);

  return feature ? resolveDrawnBuildingId(feature) : null;
}

function completeDrawnBuilding(instance: MapLibreMap, geometryGeoJson: string, shapeType: Exclude<BuildingDrawMode, null>, fallback: [number, number]): void {
  const geometry = parseGeometryGeoJson(geometryGeoJson);
  const center = geometry ? getGeometryCenter(geometry) : null;

  emit('drawn-building-complete', {
    geometryGeoJson,
    labelLongitude: center?.[0] ?? fallback[0],
    labelLatitude: center?.[1] ?? fallback[1],
    shapeType
  });

  resetDrawInteractionState(instance);
}

function setupBusinessLayers(instance: MapLibreMap): void {
  ensureBusinessLayers(instance);
  ensureMapLabelLayers(instance);
  ensureDrawnBuildingLayers(instance);
  updateBusinessSources(instance, props.shopData, props.areaData, props.poiData, props.placeData, props.boundaryData);
  updateMapLabelSources(instance, props.manualLabelData, props.businessLabelData);
  updateDrawnBuildingMapSources(instance);
  setBusinessLayerVisibility(instance, props.layerVisibility);
  updateFocusedEntity(instance, getDisplayTarget());
  registerBusinessLayerEvents(instance, {
    onShopClick: (target) => {
      if (props.drawBuildingMode) {
        return;
      }
      suppressNextMapClickAction.value = true;
      emit('shop-click', target);
      openPopup(target, [target.longitude, target.latitude]);
    },
    onAreaClick: (target, event) => {
      if (props.drawBuildingMode) {
        return;
      }
      suppressNextMapClickAction.value = true;
      emit('area-click', target);
      openPopup(target, event.lngLat);
    },
    onPoiClick: (target) => {
      if (props.drawBuildingMode) {
        return;
      }
      suppressNextMapClickAction.value = true;
      emit('poi-click', target);
      openPopup(target, [target.longitude, target.latitude]);
    },
    onPlaceClick: (target, event) => {
      if (props.drawBuildingMode) {
        return;
      }
      suppressNextMapClickAction.value = true;
      emit('place-click', target);
      openPopup(target, event.lngLat);
    },
    onBoundaryClick: (target, event) => {
      if (props.drawBuildingMode) {
        return;
      }
      suppressNextMapClickAction.value = true;
      emit('boundary-click', target);
      openPopup(target, event.lngLat);
    }
  });
  emit('ready', instance);
  if (import.meta.env.DEV) {
    window.__FUYAO_MAP_DEBUG__ = instance;
  }
  instance.on('moveend', () => emitViewport(instance));
  instance.on('mousemove', (event) => handleMapMouseMove(instance, event));
  instance.on('click', (event) => handleMapClick(instance, event));
  instance.on('dblclick', (event) => handleMapDoubleClick(instance, event));
  instance.on('error', (event) => {
    const message = event?.error instanceof Error ? event.error.message : String(event?.error ?? '');
    if (!message) {
      return;
    }

    if (message.includes('pmtiles') || message.includes('scheme') || message.includes('/tiles/')) {
      mapErrorMessage.value = '无法读取 /tiles/city.pmtiles，请检查 PMTiles 协议注册、/tiles/ 映射及 city.pmtiles 文件是否存在。';
      console.error('[BaseMap] basemap runtime error', event.error);
    }
  });
  syncInteractionMode(instance);
  scheduleMapResize(instance);
}

function isTargetVisible(target: MapFocusTarget | null | undefined): boolean {
  if (!target) {
    return false;
  }

  switch (target.entityType) {
    case 'shop':
      return props.layerVisibility.shops;
    case 'area':
      return props.layerVisibility.areas;
    case 'poi':
      return props.layerVisibility.pois;
    case 'place':
      return props.layerVisibility.places;
    case 'boundary':
      return props.layerVisibility.boundaries;
    case 'label':
      return true;
    default:
      return false;
  }
}

function getDisplayTarget(): MapFocusTarget | null {
  const candidate = props.selectedTarget ?? props.focusTarget ?? null;
  return isTargetVisible(candidate) ? candidate : null;
}

function emitViewport(mapInstance: MapLibreMap): void {
  const bounds = mapInstance.getBounds();
  emit('viewport-change', {
    bbox: boundsToBboxString(bounds),
    center: [mapInstance.getCenter().lng, mapInstance.getCenter().lat],
    zoom: mapInstance.getZoom()
  });
}

function clearPopup(): void {
  // 每次重新打开前先销毁旧 popup，避免内存泄漏和重复挂载。
  popup?.remove();
  popup = null;
  popupApp?.unmount();
  popupApp = null;
}

function openPopup(target: MapFocusTarget, lngLat: LngLatLike): void {
  if (!map.value) {
    return;
  }

  clearPopup();

  const container = document.createElement('div');
  popupApp = createApp(EntityPopup, { entity: target });
  popupApp.mount(container);

  popup = new maplibreglRuntime.Popup({
    closeButton: true,
    closeOnClick: false,
    maxWidth: '360px',
    offset: 14
  })
    .setDOMContent(container)
    .setLngLat(lngLat)
    .addTo(map.value);

  popup.on('close', () => {
    popupApp?.unmount();
    popupApp = null;
    popup = null;
  });
}

function focusOnTarget(target: MapFocusTarget): void {
  // 点位用 flyTo，面要素用 fitBounds，保持交互符合地图使用习惯。
  if (!map.value) {
    return;
  }

  updateFocusedEntity(map.value, target);

  if (target.entityType === 'shop' || target.entityType === 'poi' || target.entityType === 'label') {
    const center: [number, number] = [target.longitude, target.latitude];
    map.value.flyTo({
      center,
      zoom: Math.max(map.value.getZoom(), 14),
      essential: true
    });
    openPopup(target, center);
    return;
  }

  const geometry = 'geometryGeoJson' in target ? parseGeometryGeoJson(target.geometryGeoJson) : null;
  if (!geometry && target.entityType === 'place' && typeof target.centerLongitude === 'number' && typeof target.centerLatitude === 'number') {
    const center: [number, number] = [target.centerLongitude, target.centerLatitude];
    map.value.flyTo({
      center,
      zoom: Math.max(map.value.getZoom(), 13.5),
      essential: true
    });
    openPopup(target, center);
    return;
  }

  if (!geometry) {
    return;
  }

  const center = getGeometryCenter(geometry);
  const bounds = getGeometryBounds(geometry);

  if (bounds) {
    map.value.fitBounds(bounds, {
      padding: 80,
      maxZoom: 15,
      duration: 800
    });
  }

  if (center) {
    openPopup(target, center);
  }
}

function resolveBasemapFeatureId(feature: MapGeoJSONFeature): string | null {
  if (feature.id !== undefined && feature.id !== null && String(feature.id).trim()) {
    return String(feature.id).trim();
  }

  const properties = feature.properties as Record<string, unknown> | undefined;
  const candidates = [properties?.source_id, properties?.sourceId, properties?.osm_id, properties?.id];
  const candidate = candidates.find((value) => value !== undefined && value !== null && String(value).trim());
  return candidate ? String(candidate).trim() : null;
}

function resolveBasemapFeatureType(feature: MapGeoJSONFeature): { featureType: string; labelType: string } | null {
  const layerId = feature.layer.id;
  if (layerId.startsWith('road-')) {
    return {
      featureType: 'road',
      labelType: 'road'
    };
  }

  if (layerId.startsWith('building-')) {
    return {
      featureType: 'building',
      labelType: 'building'
    };
  }

  if (layerId === 'poi-label') {
    return {
      featureType: 'poi',
      labelType: 'business'
    };
  }

  if (layerId === 'place-label') {
    return {
      featureType: 'place',
      labelType: 'business'
    };
  }

  return null;
}

function resolveBasemapFeaturePoint(feature: MapGeoJSONFeature, fallback: [number, number]): [number, number] {
  if (feature.geometry.type === 'Point') {
    return feature.geometry.coordinates as [number, number];
  }

  if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
    return getGeometryCenter(feature.geometry) ?? fallback;
  }

  return fallback;
}

function toInspectableBasemapFeature(feature: MapGeoJSONFeature, fallback: [number, number]): BasemapInspectableFeature | null {
  if (feature.source !== BASEMAP_SOURCE_ID) {
    return null;
  }

  const type = resolveBasemapFeatureType(feature);
  if (!type) {
    return null;
  }

  const properties = feature.properties as Record<string, unknown> | undefined;
  const originalName = resolvePreferredName({
    overrideDisplayName: typeof properties?.displayName === 'string' ? properties.displayName : null,
    nameZh: typeof properties?.['name:zh'] === 'string' ? properties['name:zh'] as string : null,
    name: typeof properties?.name === 'string' ? properties.name as string : null,
    nameEn: typeof properties?.name_en === 'string' ? properties.name_en as string : null,
    ref: typeof properties?.ref === 'string' ? properties.ref as string : null
  });

  const [pointLongitude, pointLatitude] = resolveBasemapFeaturePoint(feature, fallback);

  return {
    featureType: type.featureType,
    labelType: type.labelType,
    sourceFeatureId: resolveBasemapFeatureId(feature),
    sourceLayer: feature.sourceLayer || null,
    originalName: originalName || null,
    pointLongitude,
    pointLatitude,
    geometryGeoJson: JSON.stringify(feature.geometry),
    source: 'pmtiles'
  };
}

function queryInspectableBasemapFeature(mapInstance: MapLibreMap, event: MapMouseEvent): BasemapInspectableFeature | null {
  const feature = mapInstance.queryRenderedFeatures(event.point, {
    layers: [...INSPECTABLE_BASE_LAYER_IDS]
  }).find((item) => item.source === BASEMAP_SOURCE_ID);

  if (!feature) {
    return null;
  }

  return toInspectableBasemapFeature(feature, [event.lngLat.lng, event.lngLat.lat]);
}

function resolveManualLabelId(feature: MapGeoJSONFeature): EntityId | null {
  if (feature.source !== MANUAL_LABEL_SOURCE_ID) {
    return null;
  }

  const properties = feature.properties as Record<string, unknown> | undefined;
  const rawId = properties?.labelId ?? feature.id;
  if (rawId === undefined || rawId === null || !String(rawId).trim()) {
    return null;
  }

  return typeof rawId === 'number' ? rawId : String(rawId).trim();
}

function queryManualLabelId(mapInstance: MapLibreMap, event: MapMouseEvent): EntityId | null {
  const feature = mapInstance.queryRenderedFeatures(event.point, {
    layers: [...MANUAL_LABEL_LAYER_IDS]
  }).find((item) => item.source === MANUAL_LABEL_SOURCE_ID);

  return feature ? resolveManualLabelId(feature) : null;
}

function handleMapMouseMove(instance: MapLibreMap, event: MapMouseEvent): void {
  if (!props.drawBuildingMode) {
    return;
  }

  drawCursorPoint.value = [event.lngLat.lng, event.lngLat.lat];
  updateDrawnBuildingMapSources(instance);
}

function handleMapClick(instance: MapLibreMap, event: MapMouseEvent): void {
  if (props.drawBuildingMode === 'rectangle') {
    const nextPoint: [number, number] = [event.lngLat.lng, event.lngLat.lat];

    if (!rectangleAnchor.value) {
      rectangleAnchor.value = nextPoint;
      drawCursorPoint.value = nextPoint;
      updateDrawnBuildingMapSources(instance);
      return;
    }

    const geometryGeoJson = JSON.stringify(buildRectanglePolygonGeometry(rectangleAnchor.value, nextPoint));
    completeDrawnBuilding(instance, geometryGeoJson, 'rectangle', nextPoint);
    return;
  }

  if (props.drawBuildingMode === 'polygon') {
    const nextPoint: [number, number] = [event.lngLat.lng, event.lngLat.lat];
    polygonVertices.value = dedupeCoordinates([...polygonVertices.value, nextPoint]);
    drawCursorPoint.value = nextPoint;
    updateDrawnBuildingMapSources(instance);
    return;
  }

  if (props.labelPickMode !== 'point') {
    const drawnBuildingId = queryDrawnBuildingId(instance, event);
    if (drawnBuildingId !== null) {
      emit('drawn-building-click', drawnBuildingId);
      return;
    }
  }

  emit('map-click', {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat
  });

  if (suppressNextMapClickAction.value) {
    suppressNextMapClickAction.value = false;
    return;
  }

  if (props.labelPickMode !== 'point') {
    const manualLabelId = queryManualLabelId(instance, event);
    if (manualLabelId !== null) {
      emit('manual-label-click', manualLabelId);
      return;
    }
  }

  if (props.labelPickMode !== 'feature') {
    return;
  }

  const feature = queryInspectableBasemapFeature(instance, event);
  if (feature) {
    emit('basemap-feature-click', feature);
  }
}

function handleMapDoubleClick(instance: MapLibreMap, event: MapMouseEvent): void {
  if (props.drawBuildingMode !== 'polygon') {
    return;
  }

  event.preventDefault();

  const points = dedupeCoordinates(polygonVertices.value);
  const geometry = buildPolygonGeometry(points);
  if (!geometry) {
    return;
  }

  const fallback: [number, number] = points[points.length - 1] ?? [event.lngLat.lng, event.lngLat.lat];
  completeDrawnBuilding(instance, JSON.stringify(geometry), 'polygon', fallback);
}

function scheduleMapResize(instance: MapLibreMap): void {
  window.requestAnimationFrame(() => {
    if (map.value !== instance) {
      return;
    }

    instance.resize();
  });

  window.setTimeout(() => {
    if (map.value !== instance) {
      return;
    }

    instance.resize();
  }, 160);
}

onMounted(async () => {
  if (!mapContainer.value) {
    return;
  }

  try {
    const instance = await initMap(mapContainer.value, {
      persistedViewport: props.initialViewport
    });
    mapErrorMessage.value = getLastBasemapIssueMessage();
    scheduleMapResize(instance);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (!map.value) {
          return;
        }

        map.value.resize();
      });
      resizeObserver.observe(mapContainer.value);
    }

    if (instance.isStyleLoaded()) {
      setupBusinessLayers(instance);
      return;
    }

    instance.once('load', () => {
      // 地图 load 后再创建 source/layer，避免 style 尚未准备好时报错。
      setupBusinessLayers(instance);
    });
  } catch (error) {
    mapErrorMessage.value = error instanceof Error ? error.message : '地图初始化失败，请检查底图样式和 PMTiles 配置。';
    console.error('[BaseMap] failed to initialize map', error);
  }
});

watch(
  () => [props.shopData, props.areaData, props.poiData, props.placeData, props.boundaryData] as const,
  ([shops, areas, pois, places, boundaries]) => {
    // 地图数据更新频率会比较高，这里只在 source 已就绪后做 setData。
    if (!map.value || !map.value.isStyleLoaded() || !map.value.getSource('business-shops')) {
      return;
    }

    updateBusinessSources(map.value, shops, areas, pois, places, boundaries);
  },
  { deep: true }
);

watch(
  () => [props.manualLabelData, props.businessLabelData] as const,
  ([manualLabels, businessLabels]) => {
    if (!map.value || !map.value.isStyleLoaded() || !map.value.getSource('map-manual-labels')) {
      return;
    }

    updateMapLabelSources(map.value, manualLabels, businessLabels);
  },
  { deep: true }
);

watch(
  () => [props.drawnBuildingAreaData, props.drawnBuildingLabelData] as const,
  () => {
    if (!map.value || !map.value.isStyleLoaded() || !map.value.getSource(DRAWN_BUILDING_AREA_SOURCE_ID)) {
      return;
    }

    updateDrawnBuildingMapSources(map.value);
  },
  { deep: true }
);

watch(
  () => props.layerVisibility,
  (visibility) => {
    if (!map.value || !map.value.getLayer('business-shops-circle')) {
      return;
    }

    setBusinessLayerVisibility(map.value, visibility);
    updateFocusedEntity(map.value, getDisplayTarget());

    if (!getDisplayTarget()) {
      clearPopup();
    }
  },
  { deep: true }
);

watch(
  () => props.selectedTarget ?? props.focusTarget ?? null,
  (target) => {
    if (map.value) {
      updateFocusedEntity(map.value, isTargetVisible(target) ? target : null);
    }
  },
  { deep: true }
);

watch(
  () => props.focusTarget,
  (target) => {
    // 只有程序性定位才触发 flyTo/fitBounds；地图点击选中只更新高亮。
    if (!target) {
      return;
    }

    if (map.value) {
      updateFocusedEntity(map.value, target);
    }

    focusOnTarget(target);
  },
  { deep: true }
);

watch(
  () => [props.labelPickMode, props.drawBuildingMode] as const,
  ([, drawMode], [, previousDrawMode]) => {
    if (!map.value) {
      return;
    }

    syncInteractionMode(map.value);
    if (drawMode !== previousDrawMode) {
      resetDrawInteractionState(map.value);
    }

    if (!drawMode) {
      resetDrawInteractionState(map.value);
      return;
    }

    updateDrawnBuildingMapSources(map.value);
  }
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  clearPopup();
  resetDrawInteractionState(map.value ?? undefined);
  if (import.meta.env.DEV && window.__FUYAO_MAP_DEBUG__ === map.value) {
    delete window.__FUYAO_MAP_DEBUG__;
  }
  destroyMap();
});
</script>

<style scoped>
.map-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 0;
  border: none;
  box-shadow: none;
  background: #f6f4ef;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-notice {
  position: absolute;
  right: 16px;
  bottom: 16px;
  width: 240px;
  padding: 12px 14px;
  z-index: 3;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
}

.map-notice strong {
  display: block;
  margin-bottom: 4px;
}

.map-notice p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.map-shell :deep(.maplibregl-canvas) {
  background: #f6f4ef;
}

.map-shell :deep(.maplibregl-ctrl-top-right) {
  margin: 16px 16px 0 0;
}

.map-shell :deep(.maplibregl-ctrl-bottom-right) {
  margin: 0 16px 16px 0;
}

.map-shell :deep(.maplibregl-ctrl-group) {
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.98);
}

.map-shell :deep(.maplibregl-ctrl-group button) {
  width: 34px;
  height: 34px;
}

.map-shell :deep(.maplibregl-ctrl button .maplibregl-ctrl-icon) {
  opacity: 0.78;
}

.map-shell :deep(.maplibregl-ctrl-attrib) {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.map-shell :deep(.maplibregl-popup-content) {
  padding: 0;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
}

.map-shell :deep(.maplibregl-popup-tip) {
  border-top-color: rgba(255, 255, 255, 0.98);
}

.map-shell :deep(.maplibregl-popup-close-button) {
  top: 8px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  color: #6b7280;
}

.map-shell :deep(.maplibregl-popup-close-button:hover) {
  background: rgba(15, 23, 42, 0.06);
}
</style>
