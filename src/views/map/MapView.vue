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
import type { EntityType, MapFocusTarget, MapSearchItem } from '@/types/map';
import { getStatusLabel, getStatusTagType } from '@/utils/status';
import { getFocusTargetSubtitle, getSearchItemSubtitle } from '@/utils/mapEntities';

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

const searchResultCountLabel = computed(() =>
  mapStore.searchResults.length ? `共 ${mapStore.searchResults.length} 条` : ''
);

async function refreshGeoJson(bbox?: string): Promise<void> {
  shopStore.updateFilters({ bbox });
  areaStore.updateFilters({ bbox });
  poiStore.updateFilters({ bbox });
  placeStore.updateFilters({ bbox });
  boundaryStore.updateFilters({ bbox });

  try {
    await Promise.all([
      shopStore.fetchGeoJson({ bbox }),
      areaStore.fetchGeoJson({ bbox }),
      poiStore.fetchGeoJson({ bbox }),
      placeStore.fetchGeoJson({ bbox }),
      boundaryStore.fetchGeoJson({ bbox })
    ]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '地图数据加载失败');
  }
}

function handleMapReady(mapInstance: MapLibreMap): void {
  mapStore.setMap(mapInstance);

  if (mapStore.viewport.bbox) {
    void refreshGeoJson(mapStore.viewport.bbox);
    return;
  }

  void refreshGeoJson();
}

function handleViewportChange(payload: { bbox: string; center: [number, number]; zoom: number }): void {
  mapStore.setViewport(payload);
  void refreshGeoJson(payload.bbox);
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

onBeforeUnmount(() => {
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
