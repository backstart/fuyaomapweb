<template>
  <PageContainer
    title="地图总览"
    eyebrow="Map V1"
    description="MapLibre 地图页已接入店铺、区域、搜索和图层控制，数据直接来自 fuyaomap 后端。"
  >
    <div class="map-page">
      <BaseMap
        :shop-data="shopStore.geoJson"
        :area-data="areaStore.geoJson"
        :layer-visibility="mapStore.layerVisibility"
        :focus-target="focusTarget"
        @ready="handleMapReady"
        @viewport-change="handleViewportChange"
        @shop-click="handleShopClick"
        @area-click="handleAreaClick"
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

          <el-scrollbar max-height="280px">
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
                  <p>{{ item.itemType === 'shop' ? '店铺' : '区域' }} · {{ item.classification || '未分类' }}</p>
                </div>
                <el-tag :type="getStatusTagType(item.status)" effect="light">
                  {{ getStatusLabel(item.status) }}
                </el-tag>
              </button>
            </div>
            <el-empty
              v-else
              description="输入关键字后可检索店铺与区域，并联动地图定位。"
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
              {{ mapStore.selectedEntity.entityType === 'shop' ? '店铺' : '区域' }}
              <span v-if="mapStore.selectedEntity.entityType === 'shop'">
                · {{ mapStore.selectedEntity.category || '未分类' }}
              </span>
              <span v-else>
                · {{ mapStore.selectedEntity.type || '未分类' }}
              </span>
            </p>
            <p class="inspector-remark">
              {{ mapStore.selectedEntity.remark || '暂无备注信息。' }}
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
import { useMapStore } from '@/stores/mapStore';
import { useShopStore } from '@/stores/shopStore';
import type { AreaFocusTarget, MapFocusTarget, MapSearchItem, ShopFocusTarget } from '@/types/map';
import { getStatusLabel, getStatusTagType } from '@/utils/status';

const route = useRoute();
const mapStore = useMapStore();
const shopStore = useShopStore();
const areaStore = useAreaStore();

const searchKeyword = ref('');
const searchLoading = ref(false);
const focusTarget = ref<MapFocusTarget | null>(null);

const searchSummary = computed(() => {
  if (!mapStore.searchResults.length) {
    return '支持跨店铺与区域统一搜索';
  }

  return `共 ${mapStore.searchResults.length} 条结果，点击可直接定位`;
});

async function refreshGeoJson(bbox?: string): Promise<void> {
  shopStore.updateFilters({ bbox });
  areaStore.updateFilters({ bbox });

  try {
    await Promise.all([
      shopStore.fetchGeoJson({ bbox }),
      areaStore.fetchGeoJson({ bbox })
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : '地图数据加载失败';
    ElMessage.error(message);
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

function handleShopClick(target: ShopFocusTarget): void {
  focusTarget.value = target;
  mapStore.setSelectedEntity(target);
}

function handleAreaClick(target: AreaFocusTarget): void {
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
    const message = error instanceof Error ? error.message : '搜索失败';
    ElMessage.error(message);
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

async function resolveShopFocusTarget(id: number): Promise<ShopFocusTarget> {
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

async function resolveAreaFocusTarget(id: number): Promise<AreaFocusTarget> {
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

async function locateSearchResult(item: MapSearchItem): Promise<void> {
  try {
    const target = item.itemType === 'shop'
      ? await resolveShopFocusTarget(item.id)
      : await resolveAreaFocusTarget(item.id);
    focusTarget.value = target;
    mapStore.setSelectedEntity(target);
  } catch (error) {
    const message = error instanceof Error ? error.message : '定位失败';
    ElMessage.error(message);
  }
}

async function syncRouteFocus(): Promise<void> {
  const entity = route.query.entity;
  const id = Number(route.query.id);

  if ((entity !== 'shop' && entity !== 'area') || !Number.isFinite(id) || id <= 0) {
    return;
  }

  try {
    const target = entity === 'shop'
      ? await resolveShopFocusTarget(id)
      : await resolveAreaFocusTarget(id);
    focusTarget.value = target;
    mapStore.setSelectedEntity(target);
  } catch (error) {
    const message = error instanceof Error ? error.message : '无法加载定位对象';
    ElMessage.error(message);
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
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  text-align: left;
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
.inspector-remark {
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
