<template>
  <PageContainer
    title="地图总览"
    eyebrow="Map Overview"
    description="MapLibre 地图页已接入店铺、区域、POI、地名、边界五类正式服务层数据。"
  >
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
            <div>
              <h3>搜索结果</h3>
              <p>{{ searchSummary }}</p>
            </div>
            <el-button text @click="clearSearchResults">清空结果</el-button>
          </div>

          <el-scrollbar max-height="320px">
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
              description="支持跨店铺、区域、POI、地名与边界统一搜索。"
              :image-size="80"
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
            <div>
              <h3>当前选中</h3>
              <p>点击地图要素或搜索结果查看详情</p>
            </div>
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
import type { EntityType, MapFocusTarget, MapSearchItem } from '@/types/map';
import { getStatusLabel, getStatusTagType } from '@/utils/status';
import { getEntityTypeLabel, getFocusTargetSubtitle, getSearchItemSubtitle } from '@/utils/mapEntities';

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

const searchSummary = computed(() => {
  if (!mapStore.searchResults.length) {
    return '支持五类正式服务层实体的统一搜索';
  }

  return `共 ${mapStore.searchResults.length} 条结果，点击可直接定位并高亮`;
});

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

async function resolveFocusTarget(entityType: EntityType, id: number): Promise<MapFocusTarget> {
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
  const entity = route.query.entity;
  const id = Number(route.query.id);

  if (
    !['shop', 'area', 'poi', 'place', 'boundary'].includes(String(entity)) ||
    !Number.isFinite(id) ||
    id <= 0
  ) {
    return;
  }

  try {
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
  () => [route.query.entity, route.query.id] as const,
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
  min-height: 720px;
  height: calc(100vh - 176px);
}

.map-overlay {
  position: absolute;
  z-index: 2;
  display: grid;
  gap: 14px;
}

.map-overlay-left {
  top: 18px;
  left: 18px;
}

.map-overlay-right {
  top: 18px;
  right: 18px;
}

.search-results-card,
.inspector-card {
  width: min(420px, calc(100vw - 32px));
  padding: 16px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.card-head h3 {
  margin: 0;
  font-size: 16px;
}

.card-head p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.result-list {
  display: grid;
  gap: 10px;
}

.result-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
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
  gap: 10px;
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
    min-height: 880px;
  }

  .map-overlay {
    position: static;
    margin-top: 14px;
  }
}
</style>
