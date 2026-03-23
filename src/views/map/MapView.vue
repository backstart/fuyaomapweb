<template>
  <PageContainer title="地图总览">
    <div class="map-page">
      <BaseMap
        :shop-data="shopStore.geoJson"
        :area-data="areaStore.geoJson"
        :poi-data="poiStore.geoJson"
        :place-data="placeStore.geoJson"
        :boundary-data="boundaryStore.geoJson"
        :layer-visibility="mapStore.layerVisibility"
        :focus-target="focusTarget"
        @ready="handleMapReady"
        @viewport-change="handleViewportChange"
        @shop-click="handleEntityClick"
        @area-click="handleEntityClick"
        @poi-click="handleEntityClick"
        @place-click="handleEntityClick"
        @boundary-click="handleEntityClick"
      />

      <div class="map-overlay map-overlay-left">
        <MapSearchBar
          v-model="searchKeyword"
          :loading="searchLoading"
          @submit="handleSearch"
          @clear="clearSearch"
        />

        <div class="shell-card search-results-card">
          <div class="card-head">
            <div class="card-title-row">
              <h3>搜索结果</h3>
              <span v-if="searchResultCountLabel" class="card-meta">{{ searchResultCountLabel }}</span>
            </div>
            <el-button text @click="clearSearchResults">清空</el-button>
          </div>

          <el-scrollbar max-height="300px">
            <div v-if="mapStore.searchResults.length" class="result-list">
              <button
                v-for="item in mapStore.searchResults"
                :key="`${item.itemType}-${item.id}`"
                class="result-item"
                type="button"
                @click="locateSearchResult(item)"
              >
                <div>
                  <strong>{{ item.name }}</strong>
                  <p>{{ getSearchItemSubtitle(item) }}</p>
                </div>
                <el-tag :type="getStatusTagType(item.status)" effect="light">
                  {{ getStatusLabel(item.status) }}
                </el-tag>
              </button>
            </div>
            <el-empty
              v-else
              description="暂无搜索结果"
              :image-size="72"
            />
          </el-scrollbar>
        </div>
      </div>

      <div class="map-overlay map-overlay-right">
        <LayerSwitcher
          :model-value="mapStore.layerVisibility"
          @update:model-value="mapStore.setLayerVisibility"
        />

        <div class="shell-card inspector-card">
          <div class="card-head">
            <h3>当前选中</h3>
          </div>
          <div v-if="mapStore.selectedEntity" class="inspector-body">
            <div class="inspector-title-row">
              <strong>{{ mapStore.selectedEntity.name }}</strong>
              <el-tag :type="getStatusTagType(mapStore.selectedEntity.status)" effect="light">
                {{ getStatusLabel(mapStore.selectedEntity.status) }}
              </el-tag>
            </div>
            <p class="inspector-meta">
              {{ getFocusTargetSubtitle(mapStore.selectedEntity) }}
            </p>
            <p class="inspector-detail">
              {{ getInspectorDetail(mapStore.selectedEntity) }}
            </p>
            <p class="inspector-remark">
              {{ getInspectorRemark(mapStore.selectedEntity) }}
            </p>
          </div>
          <el-empty
            v-else
            description="暂无选中要素"
            :image-size="72"
          />
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useRoute } from 'vue-router';
import BaseMap from '@/components/map/BaseMap.vue';
import LayerSwitcher from '@/components/map/LayerSwitcher.vue';
import PageContainer from '@/components/common/PageContainer.vue';
import MapSearchBar from '@/components/search/MapSearchBar.vue';
import { searchMap } from '@/api/mapSearchApi';
import { useAreaStore } from '@/stores/areaStore';
import { useBoundaryStore } from '@/stores/boundaryStore';
import { useMapStore } from '@/stores/mapStore';
import { usePlaceStore } from '@/stores/placeStore';
import { usePoiStore } from '@/stores/poiStore';
import { useShopStore } from '@/stores/shopStore';
import type { EntityId } from '@/types/entity';
import type { EntityType, LayerVisibility, MapFocusTarget, MapSearchItem, MapViewportState } from '@/types/map';
import { boundsToBboxString } from '@/utils/bbox';
import { getStatusLabel, getStatusTagType } from '@/utils/status';
import { getFocusTargetSubtitle, getSearchItemSubtitle } from '@/utils/mapEntities';

const MAP_REFRESH_DEBOUNCE_MS = 600;
const BBOX_EPSILON = 0.0008;
const CENTER_EPSILON = 0.0004;
const ZOOM_EPSILON = 0.08;
const LAYER_MIN_ZOOM: Record<LayerKey, number> = {
  shops: 12,
  areas: 9,
  pois: 13,
  places: 11,
  boundaries: 8
};

type LayerKey = keyof LayerVisibility;

const route = useRoute();
const mapStore = useMapStore();
const shopStore = useShopStore();
const areaStore = useAreaStore();
const poiStore = usePoiStore();
const placeStore = usePlaceStore();
const boundaryStore = useBoundaryStore();

const searchKeyword = ref('');
const searchLoading = ref(false);
const focusTarget = ref<MapFocusTarget | null>(null);
const refreshTimer = ref<number | null>(null);
const pendingViewport = ref<MapViewportState | null>(null);
const pendingRefreshReason = ref('idle');
const lastRequestedViewportByLayer = ref<Record<LayerKey, MapViewportState | null>>({
  shops: null,
  areas: null,
  pois: null,
  places: null,
  boundaries: null
});

const searchResultCountLabel = computed(() =>
  mapStore.searchResults.length ? `共 ${mapStore.searchResults.length} 条` : ''
);

function debugMapRefresh(message: string, detail?: unknown): void {
  if (!import.meta.env.DEV) {
    return;
  }

  if (detail === undefined) {
    console.debug(`[MapRefresh] ${message}`);
    return;
  }

  console.debug(`[MapRefresh] ${message}`, detail);
}

function parseBbox(bbox?: string): [number, number, number, number] | null {
  if (!bbox) {
    return null;
  }

  const values = bbox.split(',').map((item) => Number(item));
  if (values.length !== 4 || values.some((item) => Number.isNaN(item))) {
    return null;
  }

  return [values[0], values[1], values[2], values[3]];
}

function cloneViewport(viewport: MapViewportState): MapViewportState {
  return {
    bbox: viewport.bbox,
    center: viewport.center ? [...viewport.center] as [number, number] : undefined,
    zoom: viewport.zoom
  };
}

function isSimilarViewport(next: MapViewportState, previous: MapViewportState | null): boolean {
  if (!previous?.bbox || !next.bbox) {
    return false;
  }

  const nextBbox = parseBbox(next.bbox);
  const previousBbox = parseBbox(previous.bbox);

  if (!nextBbox || !previousBbox) {
    return false;
  }

  const bboxSimilar = nextBbox.every((value, index) => Math.abs(value - previousBbox[index]) <= BBOX_EPSILON);
  const centerSimilar =
    !!next.center &&
    !!previous.center &&
    Math.abs(next.center[0] - previous.center[0]) <= CENTER_EPSILON &&
    Math.abs(next.center[1] - previous.center[1]) <= CENTER_EPSILON;
  const zoomSimilar =
    typeof next.zoom === 'number' &&
    typeof previous.zoom === 'number' &&
    Math.abs(next.zoom - previous.zoom) <= ZOOM_EPSILON;

  return bboxSimilar && centerSimilar && zoomSimilar;
}

function getEnabledLayers(): LayerKey[] {
  return (Object.entries(mapStore.layerVisibility) as Array<[LayerKey, boolean]>)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}

function getViewportZoom(viewport: MapViewportState): number {
  return typeof viewport.zoom === 'number' ? viewport.zoom : 0;
}

function isLayerWithinZoomRange(layer: LayerKey, viewport: MapViewportState): boolean {
  return getViewportZoom(viewport) >= LAYER_MIN_ZOOM[layer];
}

function getViewportSnapshot(mapInstance: MapLibreMap): MapViewportState {
  const bounds = mapInstance.getBounds();
  return {
    bbox: boundsToBboxString(bounds),
    center: [mapInstance.getCenter().lng, mapInstance.getCenter().lat],
    zoom: mapInstance.getZoom()
  };
}

async function refreshLayer(layer: LayerKey, viewport: MapViewportState): Promise<boolean> {
  const bbox = viewport.bbox;

  switch (layer) {
    case 'shops':
      return shopStore.fetchGeoJsonForMap({ bbox });
    case 'areas':
      return areaStore.fetchGeoJsonForMap({ bbox });
    case 'pois':
      return poiStore.fetchGeoJsonForMap({ bbox });
    case 'places':
      return placeStore.fetchGeoJsonForMap({ bbox });
    case 'boundaries':
      return boundaryStore.fetchGeoJsonForMap({ bbox });
  }
}

function cancelLayerRequest(layer: LayerKey, reason: string): void {
  switch (layer) {
    case 'shops':
      shopStore.cancelMapGeoJsonRequest(reason);
      return;
    case 'areas':
      areaStore.cancelMapGeoJsonRequest(reason);
      return;
    case 'pois':
      poiStore.cancelMapGeoJsonRequest(reason);
      return;
    case 'places':
      placeStore.cancelMapGeoJsonRequest(reason);
      return;
    case 'boundaries':
      boundaryStore.cancelMapGeoJsonRequest(reason);
      return;
  }
}

function clearLayerData(layer: LayerKey): void {
  switch (layer) {
    case 'shops':
      shopStore.clearGeoJson();
      return;
    case 'areas':
      areaStore.clearGeoJson();
      return;
    case 'pois':
      poiStore.clearGeoJson();
      return;
    case 'places':
      placeStore.clearGeoJson();
      return;
    case 'boundaries':
      boundaryStore.clearGeoJson();
      return;
  }
}

function resetScheduledRefresh(): void {
  if (refreshTimer.value !== null) {
    window.clearTimeout(refreshTimer.value);
    refreshTimer.value = null;
  }
}

async function flushScheduledRefresh(force = false): Promise<void> {
  resetScheduledRefresh();

  const viewport = pendingViewport.value ?? mapStore.viewport;
  pendingViewport.value = null;

  if (!viewport?.bbox) {
    debugMapRefresh('skip refresh because bbox is empty');
    return;
  }

  const enabledLayers = getEnabledLayers();
  const disabledLayers = (Object.keys(mapStore.layerVisibility) as LayerKey[]).filter((layer) => !mapStore.layerVisibility[layer]);
  const zoomFilteredLayers = enabledLayers.filter((layer) => !isLayerWithinZoomRange(layer, viewport));
  const requestableLayers = enabledLayers.filter((layer) => isLayerWithinZoomRange(layer, viewport));
  if (!enabledLayers.length) {
    debugMapRefresh('skip refresh because no business layer is enabled');
    return;
  }

  if (disabledLayers.length) {
    debugMapRefresh('skip disabled layers', disabledLayers);
  }

  if (zoomFilteredLayers.length) {
    debugMapRefresh('skip layers because zoom is below threshold', {
      zoom: viewport.zoom,
      layers: zoomFilteredLayers.map((layer) => ({
        layer,
        minZoom: LAYER_MIN_ZOOM[layer]
      }))
    });

    zoomFilteredLayers.forEach((layer) => {
      cancelLayerRequest(layer, 'below-min-zoom');
      clearLayerData(layer);
      lastRequestedViewportByLayer.value[layer] = null;
    });
  }

  const requestQueue: Promise<void>[] = [];
  const requestLayers: LayerKey[] = [];

  requestableLayers.forEach((layer) => {
    const previousViewport = lastRequestedViewportByLayer.value[layer];
    if (!force && isSimilarViewport(viewport, previousViewport)) {
      debugMapRefresh(`skip ${layer} because viewport change is too small`, {
        bbox: viewport.bbox,
        zoom: viewport.zoom
      });
      return;
    }

    requestLayers.push(layer);
    requestQueue.push(
      refreshLayer(layer, viewport).then((completed) => {
        if (!completed) {
          debugMapRefresh(`request ${layer} canceled or superseded`, {
            bbox: viewport.bbox
          });
          return;
        }

        lastRequestedViewportByLayer.value[layer] = cloneViewport(viewport);
      })
    );
  });

  if (!requestQueue.length) {
    debugMapRefresh('skip refresh because all visible layers hit viewport dedupe', {
      reason: pendingRefreshReason.value,
      bbox: viewport.bbox
    });
    return;
  }

  debugMapRefresh('request visible layers', {
    reason: pendingRefreshReason.value,
    bbox: viewport.bbox,
    layers: requestLayers
  });

  try {
    await Promise.all(requestQueue);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '地图数据加载失败');
  }
}

function scheduleRefresh(viewport: MapViewportState, options?: { immediate?: boolean; force?: boolean; reason?: string }): void {
  mapStore.setViewport(viewport);
  pendingViewport.value = cloneViewport(viewport);
  pendingRefreshReason.value = options?.reason ?? 'viewport-change';

  if (options?.immediate) {
    void flushScheduledRefresh(options.force);
    return;
  }

  if (refreshTimer.value !== null) {
    debugMapRefresh('debounce previous refresh', {
      reason: pendingRefreshReason.value
    });
    window.clearTimeout(refreshTimer.value);
  }

  refreshTimer.value = window.setTimeout(() => {
    void flushScheduledRefresh(options?.force);
  }, MAP_REFRESH_DEBOUNCE_MS);
}

function handleMapReady(mapInstance: MapLibreMap): void {
  mapStore.setMap(mapInstance);
  scheduleRefresh(getViewportSnapshot(mapInstance), {
    immediate: true,
    force: true,
    reason: 'initial-load'
  });
}

function handleViewportChange(payload: { bbox: string; center: [number, number]; zoom: number }): void {
  scheduleRefresh(payload, {
    reason: 'moveend'
  });
}

function handleEntityClick(target: MapFocusTarget): void {
  focusTarget.value = target;
  mapStore.setSelectedEntity(target);
}

async function handleSearch(): Promise<void> {
  const keyword = searchKeyword.value.trim();
  if (!keyword) {
    mapStore.setSearchResults([]);
    return;
  }

  searchLoading.value = true;
  try {
    const result = await searchMap({
      q: keyword,
      page: 1,
      pageSize: 10,
      bbox: mapStore.viewport.bbox
    });
    mapStore.setSearchResults(result.items);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '搜索失败');
  } finally {
    searchLoading.value = false;
  }
}

function clearSearchResults(): void {
  mapStore.setSearchResults([]);
}

function clearSearch(): void {
  searchKeyword.value = '';
  clearSearchResults();
}

async function resolveFocusTarget(entityType: EntityType, id: EntityId): Promise<MapFocusTarget> {
  switch (entityType) {
    case 'shop': {
      const detail = await shopStore.getShopDetail(id);
      return {
        entityType: 'shop',
        id: detail.id,
        name: detail.name,
        category: detail.category,
        remark: detail.remark,
        icon: detail.icon,
        status: detail.status,
        longitude: detail.longitude,
        latitude: detail.latitude
      };
    }
    case 'area': {
      const detail = await areaStore.getAreaDetail(id);
      return {
        entityType: 'area',
        id: detail.id,
        name: detail.name,
        type: detail.type,
        remark: detail.remark,
        styleJson: detail.styleJson,
        status: detail.status,
        geometryGeoJson: detail.geometryGeoJson
      };
    }
    case 'poi': {
      const detail = await poiStore.getPoiDetail(id);
      return {
        entityType: 'poi',
        id: detail.id,
        name: detail.name,
        category: detail.category,
        subcategory: detail.subcategory,
        remark: detail.remark,
        icon: detail.icon,
        address: detail.address,
        phone: detail.phone,
        status: detail.status,
        longitude: detail.longitude,
        latitude: detail.latitude
      };
    }
    case 'place': {
      const detail = await placeStore.getPlaceDetail(id);
      return {
        entityType: 'place',
        id: detail.id,
        name: detail.name,
        placeType: detail.placeType,
        adminLevel: detail.adminLevel,
        remark: detail.remark,
        status: detail.status,
        geometryGeoJson: detail.geometryGeoJson,
        centerLongitude: detail.centerLongitude,
        centerLatitude: detail.centerLatitude
      };
    }
    case 'boundary': {
      const detail = await boundaryStore.getBoundaryDetail(id);
      return {
        entityType: 'boundary',
        id: detail.id,
        name: detail.name,
        boundaryType: detail.boundaryType,
        adminLevel: detail.adminLevel,
        remark: detail.remark,
        styleJson: detail.styleJson,
        status: detail.status,
        geometryGeoJson: detail.geometryGeoJson
      };
    }
    default:
      throw new Error(`未知实体类型：${entityType}`);
  }
}

function readQueryString(raw: unknown): string | undefined {
  if (typeof raw === 'string') {
    return raw.trim() || undefined;
  }

  if (Array.isArray(raw)) {
    return readQueryString(raw[0]);
  }

  return undefined;
}

function readQueryNumber(raw: unknown): number | undefined {
  const value = readQueryString(raw);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildFocusTargetFromQuery(entityType: EntityType, id: EntityId): MapFocusTarget | null {
  const name = readQueryString(route.query.name) || '未命名对象';
  const status = readQueryNumber(route.query.status) ?? 0;

  if (entityType === 'shop' || entityType === 'poi') {
    const longitude = readQueryNumber(route.query.lng);
    const latitude = readQueryNumber(route.query.lat);

    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
      return null;
    }

    if (entityType === 'shop') {
      return {
        entityType: 'shop',
        id,
        name,
        category: readQueryString(route.query.category),
        status,
        longitude,
        latitude
      };
    }

    return {
      entityType: 'poi',
      id,
      name,
      category: readQueryString(route.query.category),
      subcategory: readQueryString(route.query.subcategory),
      status,
      longitude,
      latitude
    };
  }

  if (entityType === 'place') {
    const centerLongitude = readQueryNumber(route.query.centerLng);
    const centerLatitude = readQueryNumber(route.query.centerLat);

    if (typeof centerLongitude !== 'number' || typeof centerLatitude !== 'number') {
      return null;
    }

    return {
      entityType: 'place',
      id,
      name,
      placeType: readQueryString(route.query.placeType),
      adminLevel: readQueryNumber(route.query.adminLevel),
      status,
      centerLongitude,
      centerLatitude
    };
  }

  return null;
}

async function locateSearchResult(item: MapSearchItem): Promise<void> {
  try {
    const target = await resolveFocusTarget(item.itemType, item.id);
    focusTarget.value = target;
    mapStore.setSelectedEntity(target);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '定位失败');
  }
}

async function syncRouteFocus(): Promise<void> {
  const entity = readQueryString(route.query.entity);
  const id = readQueryString(route.query.id);

  if (
    !entity ||
    !['shop', 'area', 'poi', 'place', 'boundary'].includes(entity) ||
    !id
  ) {
    return;
  }

  try {
    const queryTarget = buildFocusTargetFromQuery(entity as EntityType, id);
    if (queryTarget) {
      focusTarget.value = queryTarget;
      mapStore.setSelectedEntity(queryTarget);
      return;
    }

    const target = await resolveFocusTarget(entity as EntityType, id);
    focusTarget.value = target;
    mapStore.setSelectedEntity(target);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '无法加载定位对象');
  }
}

function getInspectorDetail(target: MapFocusTarget): string {
  switch (target.entityType) {
    case 'shop':
    case 'poi':
      return `坐标：${target.longitude.toFixed(6)}, ${target.latitude.toFixed(6)}`;
    case 'area':
      return `类型：${target.type || '未分类'}`;
    case 'place':
      return `行政级别：${target.adminLevel ?? '-'} · 中心点：${
        typeof target.centerLongitude === 'number' && typeof target.centerLatitude === 'number'
          ? `${target.centerLongitude.toFixed(6)}, ${target.centerLatitude.toFixed(6)}`
          : '-'
      }`;
    case 'boundary':
      return `行政级别：${target.adminLevel ?? '-'} · 样式：${target.styleJson || '-'}`;
  }
}

function getInspectorRemark(target: MapFocusTarget): string {
  switch (target.entityType) {
    case 'shop':
    case 'area':
    case 'poi':
    case 'place':
    case 'boundary':
      return target.remark || '暂无备注信息。';
    default:
      return '暂无备注信息。';
  }
}

watch(
  () => route.fullPath,
  () => {
    void syncRouteFocus();
  },
  { immediate: true }
);

onMounted(() => {
  mapStore.setSearchResults([]);
});

watch(
  () => ({ ...mapStore.layerVisibility }),
  (next, previous) => {
    const changedLayers = (Object.keys(next) as LayerKey[]).filter((key) => next[key] !== previous[key]);

    if (!changedLayers.length) {
      return;
    }

    changedLayers.forEach((layer) => {
      if (!next[layer]) {
        debugMapRefresh(`skip ${layer} because layer is disabled`);
        cancelLayerRequest(layer, 'layer-disabled');
        clearLayerData(layer);
        lastRequestedViewportByLayer.value[layer] = null;
        return;
      }

      debugMapRefresh(`layer ${layer} enabled, schedule refresh`, {
        bbox: mapStore.viewport.bbox,
        zoom: mapStore.viewport.zoom,
        minZoom: LAYER_MIN_ZOOM[layer]
      });
      lastRequestedViewportByLayer.value[layer] = null;
    });

    if (mapStore.viewport.bbox) {
      scheduleRefresh(mapStore.viewport, {
        reason: 'layer-visibility-change'
      });
    }
  }
);

onBeforeUnmount(() => {
  resetScheduledRefresh();
  (['shops', 'areas', 'pois', 'places', 'boundaries'] as LayerKey[]).forEach((layer) => {
    cancelLayerRequest(layer, 'map-view-unmount');
  });
  mapStore.setMap(null);
});
</script>

<style scoped>
.map-page {
  position: relative;
  min-height: 680px;
  height: calc(100vh - 126px);
}

.map-overlay {
  position: absolute;
  z-index: 2;
  display: grid;
  gap: 12px;
}

.map-overlay-left {
  top: 14px;
  left: 14px;
}

.map-overlay-right {
  top: 14px;
  right: 14px;
}

.search-results-card,
.inspector-card {
  width: min(360px, calc(100vw - 28px));
  padding: 14px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.card-head h3 {
  margin: 0;
  font-size: 16px;
}

.card-meta {
  color: var(--text-secondary);
  font-size: 12px;
}

.result-list {
  display: grid;
  gap: 8px;
}

.result-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.result-item:hover {
  border-color: rgba(59, 130, 246, 0.28);
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.08);
  transform: translateY(-1px);
}

.result-item strong {
  display: block;
}

.result-item p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.inspector-body {
  display: grid;
  gap: 8px;
}

.inspector-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.inspector-title-row strong {
  font-size: 17px;
}

.inspector-meta,
.inspector-remark,
.inspector-detail {
  margin: 0;
  color: var(--text-secondary);
}

@media (max-width: 1024px) {
  .map-page {
    height: auto;
    min-height: 860px;
  }

  .map-overlay {
    position: static;
    margin-top: 12px;
  }
}
</style>
