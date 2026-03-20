<template>
  <div class="map-shell soft-grid">
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="!hasBaseMap" class="shell-card map-notice">
      <strong>未配置底图</strong>
      <p>当前使用空白底图，仅渲染店铺与区域业务图层。请在 `.env` 中填写 `VITE_MAP_BASE_URL`。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { createApp, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import maplibregl, { type LngLatLike, type Map as MapLibreMap } from 'maplibre-gl';
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
const hasBaseMap = Boolean(import.meta.env.VITE_MAP_BASE_URL?.trim());

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
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: var(--shadow-lg);
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
</style>
