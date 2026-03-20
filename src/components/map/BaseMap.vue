<template>
  <div class="map-shell soft-grid">
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="!hasBaseMap" class="shell-card map-notice">
      <strong>未配置底图</strong>
      <p>当前使用空白底图，仅渲染店铺与区域业务图层。请在 `app-config.js` 或 `.env` 中填写 PMTiles 地址。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { createApp, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import maplibregl, { type LngLatLike, type Map as MapLibreMap } from 'maplibre-gl';
import { appConfig } from '@/config/appConfig';
import { useMapLibre } from '@/composables/useMapLibre';
import {
  ensureBusinessLayers,
  registerBusinessLayerEvents,
  setBusinessLayerVisibility,
  updateBusinessSources
} from '@/composables/useMapLayers';
import AreaPopup from '@/components/map/AreaPopup.vue';
import ShopPopup from '@/components/map/ShopPopup.vue';
import type { AreaFeatureCollection } from '@/types/area';
import type { AreaFocusTarget, LayerVisibility, MapFocusTarget, ShopFocusTarget } from '@/types/map';
import type { ShopFeatureCollection } from '@/types/shop';
import { boundsToBboxString } from '@/utils/bbox';
import { getGeometryBounds, getGeometryCenter, parseGeometryGeoJson } from '@/utils/geometry';

const props = defineProps<{
  shopData: ShopFeatureCollection;
  areaData: AreaFeatureCollection;
  layerVisibility: LayerVisibility;
  focusTarget?: MapFocusTarget | null;
}>();

const emit = defineEmits<{
  ready: [map: MapLibreMap];
  'viewport-change': [payload: { bbox: string; center: [number, number]; zoom: number }];
  'shop-click': [target: ShopFocusTarget];
  'area-click': [target: AreaFocusTarget];
}>();

const { map, initMap, destroyMap } = useMapLibre();
const mapContainer = ref<HTMLDivElement | null>(null);
const hasBaseMap = Boolean(appConfig.pmtilesUrl.trim());

// Popup 使用独立 Vue app 挂载，这样可以直接复用现有 Vue 组件。
let popup: maplibregl.Popup | null = null;
let popupApp: ReturnType<typeof createApp> | null = null;

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
  popupApp = target.entityType === 'shop'
    ? createApp(ShopPopup, { shop: target })
    : createApp(AreaPopup, { area: target });
  popupApp.mount(container);

  popup = new maplibregl.Popup({
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

  if (target.entityType === 'shop') {
    const center: [number, number] = [target.longitude, target.latitude];
    map.value.flyTo({
      center,
      zoom: Math.max(map.value.getZoom(), 14),
      essential: true
    });
    openPopup(target, center);
    return;
  }

  const geometry = parseGeometryGeoJson(target.geometryGeoJson);
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

onMounted(async () => {
  if (!mapContainer.value) {
    return;
  }

  const instance = await initMap(mapContainer.value);
  instance.once('load', () => {
    // 地图 load 后再创建 source/layer，避免 style 尚未准备好时报错。
    ensureBusinessLayers(instance);
    updateBusinessSources(instance, props.shopData, props.areaData);
    setBusinessLayerVisibility(instance, props.layerVisibility);
    registerBusinessLayerEvents(instance, {
      onShopClick: (target) => {
        emit('shop-click', target);
        openPopup(target, [target.longitude, target.latitude]);
      },
      onAreaClick: (target, event) => {
        emit('area-click', target);
        openPopup(target, event.lngLat);
      }
    });
    emitViewport(instance);
    emit('ready', instance);
    instance.on('moveend', () => emitViewport(instance));
  });
});

watch(
  () => [props.shopData, props.areaData] as const,
  ([shops, areas]) => {
    // 地图数据更新频率会比较高，这里只在 source 已就绪后做 setData。
    if (!map.value || !map.value.isStyleLoaded() || !map.value.getSource('business-shops')) {
      return;
    }

    updateBusinessSources(map.value, shops, areas);
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
  },
  { deep: true }
);

watch(
  () => props.focusTarget,
  (target) => {
    // 外部页面只需要传 focusTarget，具体 flyTo/fitBounds 逻辑由 BaseMap 内部处理。
    if (target) {
      focusOnTarget(target);
    }
  },
  { deep: true }
);

onBeforeUnmount(() => {
  clearPopup();
  destroyMap();
});
</script>

<style scoped>
.map-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: var(--radius-xl);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
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
  width: 320px;
  padding: 14px 16px;
  z-index: 3;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
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
