<template>
  <PageContainer title="地图总览">
    <div class="map-page">
      <BaseMap
        :shop-data="shopStore.geoJson"
        :area-data="areaStore.geoJson"
        :poi-data="poiStore.geoJson"
        :place-data="placeStore.geoJson"
        :boundary-data="boundaryStore.geoJson"
        :manual-label-data="manualLabelData"
        :business-label-data="businessLabelData"
        :layer-visibility="mapStore.layerVisibility"
        :selected-target="mapStore.selectedEntity"
        :focus-target="focusTarget"
        :label-pick-mode="labelPickMode"
        @ready="handleMapReady"
        @viewport-change="handleViewportChange"
        @shop-click="handleEntityClick"
        @area-click="handleEntityClick"
        @poi-click="handleEntityClick"
        @place-click="handleEntityClick"
        @boundary-click="handleEntityClick"
        @map-click="handleMapClick"
        @basemap-feature-click="handleBasemapFeatureClick"
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
                <span :class="['result-status', `result-status--${getStatusTagType(item.status)}`]">
                  {{ getStatusLabel(item.status) }}
                </span>
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
              <span :class="['result-status', `result-status--${getStatusTagType(mapStore.selectedEntity.status)}`]">
                {{ getStatusLabel(mapStore.selectedEntity.status) }}
              </span>
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

        <div class="shell-card label-editor-card">
          <div class="card-head">
            <div class="card-title-row">
              <h3>标注编辑</h3>
              <span v-if="labelContextBadge" class="card-meta">{{ labelContextBadge }}</span>
            </div>
            <el-button text @click="startManualLabel">手动点位</el-button>
          </div>

          <div class="label-editor-toolbar">
            <el-button
              size="small"
              :type="labelPickMode === 'feature' ? 'primary' : 'default'"
              @click="toggleFeaturePickMode"
            >
              {{ labelPickMode === 'feature' ? '退出补名模式' : '点击对象补名' }}
            </el-button>
            <el-button
              size="small"
              :type="labelPickMode === 'point' ? 'primary' : 'default'"
              @click="togglePointPickMode"
            >
              {{ labelPickMode === 'point' ? '等待地图落点' : '拾取标注点' }}
            </el-button>
            <el-button size="small" @click="resetLabelDraft" :disabled="!labelDraft">
              重置
            </el-button>
          </div>

          <p class="label-editor-tip">
            {{ labelEditorTip }}
          </p>

          <div v-if="labelEditorContext" class="label-context-summary">
            <strong>{{ labelContextTitle }}</strong>
            <p>{{ labelContextSubtitle }}</p>
          </div>

          <el-form v-if="labelDraft" label-position="top" class="label-editor-form" @submit.prevent>
            <el-form-item label="显示名称" required>
              <el-input v-model="labelDraft.displayName" placeholder="请输入地图显示名称" />
            </el-form-item>

            <el-form-item label="别名">
              <el-input
                v-model="labelAliasInput"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="多个别名用逗号、顿号或换行分隔"
              />
            </el-form-item>

            <div class="label-form-grid">
              <el-form-item label="要素类型">
                <el-select v-model="labelDraft.featureType">
                  <el-option v-for="option in labelFeatureTypeOptions" :key="option.value" :label="option.label" :value="option.value" />
                </el-select>
              </el-form-item>
              <el-form-item label="标注类型">
                <el-select v-model="labelDraft.labelType">
                  <el-option v-for="option in labelTypeOptions" :key="option.value" :label="option.label" :value="option.value" />
                </el-select>
              </el-form-item>
            </div>

            <div class="label-form-grid">
              <el-form-item label="经度">
                <el-input-number v-model="labelDraft.pointLongitude" :step="0.0001" :precision="6" :min="-180" :max="180" controls-position="right" />
              </el-form-item>
              <el-form-item label="纬度">
                <el-input-number v-model="labelDraft.pointLatitude" :step="0.0001" :precision="6" :min="-90" :max="90" controls-position="right" />
              </el-form-item>
            </div>

            <div class="label-form-grid">
              <el-form-item label="最小缩放">
                <el-input-number v-model="labelDraft.minZoom" :min="0" :max="24" controls-position="right" />
              </el-form-item>
              <el-form-item label="最大缩放">
                <el-input-number v-model="labelDraft.maxZoom" :min="0" :max="24" controls-position="right" />
              </el-form-item>
            </div>

            <div class="label-form-grid">
              <el-form-item label="优先级">
                <el-input-number v-model="labelDraft.priority" :min="0" :max="100000" controls-position="right" />
              </el-form-item>
              <el-form-item label="启用状态">
                <el-switch v-model="labelDraft.status" :active-value="1" :inactive-value="0" />
              </el-form-item>
            </div>

            <div class="label-form-grid">
              <el-form-item label="文字颜色">
                <el-input v-model="labelDraft.textColor" placeholder="#314155" />
              </el-form-item>
              <el-form-item label="描边颜色">
                <el-input v-model="labelDraft.haloColor" placeholder="rgba(255,255,255,0.96)" />
              </el-form-item>
            </div>

            <el-form-item label="原始名称">
              <el-input :model-value="labelDraft.originalName || '-'" disabled />
            </el-form-item>

            <el-form-item label="来源标识">
              <el-input :model-value="labelSourceSummary" disabled />
            </el-form-item>

            <el-form-item label="备注">
              <el-input
                v-model="labelDraft.remark"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="可填写标注说明或纠偏原因"
              />
            </el-form-item>

            <div class="label-editor-actions">
              <el-button type="primary" :loading="labelSaving" @click="saveLabel">
                {{ labelDraft.id ? '更新标注' : '保存标注' }}
              </el-button>
              <el-button :loading="labelLookupLoading" @click="reloadCurrentLabel">
                重新加载
              </el-button>
            </div>
          </el-form>

          <el-empty
            v-else
            description="点击业务对象、道路或建筑后即可补名"
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
import { createMapLabel, queryMapLabels, updateMapLabel } from '@/api/mapLabelApi';
import BaseMap from '@/components/map/BaseMap.vue';
import LayerSwitcher from '@/components/map/LayerSwitcher.vue';
import PageContainer from '@/components/common/PageContainer.vue';
import MapSearchBar from '@/components/search/MapSearchBar.vue';
import { buildBusinessLabelFeatureCollection, buildManualLabelFeatureCollection } from '@/composables/useMapLabelLayers';
import { searchMap } from '@/api/mapSearchApi';
import { useAreaStore } from '@/stores/areaStore';
import { useBoundaryStore } from '@/stores/boundaryStore';
import { useMapStore } from '@/stores/mapStore';
import { usePlaceStore } from '@/stores/placeStore';
import { usePoiStore } from '@/stores/poiStore';
import { useShopStore } from '@/stores/shopStore';
import type { EntityId } from '@/types/entity';
import type { BasemapInspectableFeature, EditableMapLabelContext, EditableMapLabelDraft, MapLabel, MapLabelFeatureType, MapLabelLayerType, MapLabelPickMode } from '@/types/mapLabel';
import type { EntityType, LayerVisibility, MapFocusTarget, MapSearchItem, MapViewportState } from '@/types/map';
import { boundsToBboxString } from '@/utils/bbox';
import {
  DEFAULT_HALO_COLOR,
  DEFAULT_MANUAL_SOURCE,
  DEFAULT_TEXT_COLOR,
  createDraftFromContext,
  createLabelContextFromBasemapFeature,
  createLabelContextFromFocusTarget,
  createManualPointContext,
  formatAliasNamesInput,
  getDefaultLabelType,
  getDefaultMaxZoom,
  getDefaultMinZoom,
  getDefaultPriority,
  isLabelVisibleForLayer,
  parseAliasNamesInput,
  sanitizeMapLabelPayload
} from '@/utils/mapLabels';
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
const LABEL_DEFAULT_CENTER: [number, number] = [121.4737, 31.2304];
const LABEL_FEATURE_TYPE_OPTIONS: Array<{ value: MapLabelFeatureType; label: string }> = [
  { value: 'shop', label: '店铺' },
  { value: 'poi', label: 'POI' },
  { value: 'place', label: '地名/聚落' },
  { value: 'area', label: '区域' },
  { value: 'boundary', label: '边界' },
  { value: 'road', label: '道路/街巷' },
  { value: 'building', label: '建筑' },
  { value: 'house', label: '房屋' },
  { value: 'courtyard', label: '院落' },
  { value: 'manual', label: '手动点位' }
];
const LABEL_TYPE_OPTIONS: Array<{ value: MapLabelLayerType; label: string }> = [
  { value: 'business', label: '业务标注' },
  { value: 'road', label: '道路标注' },
  { value: 'building', label: '建筑标注' }
];

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
const manualLabels = ref<MapLabel[]>([]);
const labelLookupLoading = ref(false);
const labelRefreshLoading = ref(false);
const labelSaving = ref(false);
const labelPickMode = ref<MapLabelPickMode>(null);
const labelEditorContext = ref<EditableMapLabelContext | null>(null);
const labelDraft = ref<EditableMapLabelDraft | null>(null);
const labelAliasInput = ref('');
const labelContextRequestId = ref(0);
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
const lastRequestedLabelViewport = ref<MapViewportState | null>(null);

const searchResultCountLabel = computed(() =>
  mapStore.searchResults.length ? `共 ${mapStore.searchResults.length} 条` : ''
);
const labelFeatureTypeOptions = LABEL_FEATURE_TYPE_OPTIONS;
const labelTypeOptions = LABEL_TYPE_OPTIONS;
const visibleManualLabels = computed(() =>
  manualLabels.value.filter((label) => isLabelVisibleForLayer(label.featureType, mapStore.layerVisibility))
);
const manualLabelData = computed(() => buildManualLabelFeatureCollection(visibleManualLabels.value));
const businessLabelData = computed(() => buildBusinessLabelFeatureCollection({
  shops: shopStore.geoJson,
  areas: areaStore.geoJson,
  pois: poiStore.geoJson,
  places: placeStore.geoJson,
  boundaries: boundaryStore.geoJson,
  visibility: mapStore.layerVisibility,
  manualLabels: visibleManualLabels.value,
  zoom: mapStore.viewport.zoom ?? 0
}));
const labelContextBadge = computed(() => {
  if (labelRefreshLoading.value) {
    return '标注图层刷新中';
  }

  if (labelLookupLoading.value) {
    return '正在加载标注';
  }

  return labelDraft.value?.id ? '已存在人工标注' : '';
});
const labelContextTitle = computed(() => {
  if (!labelEditorContext.value) {
    return '';
  }

  return labelDraft.value?.displayName?.trim() || labelEditorContext.value.suggestedDisplayName || '未命名标注';
});
const labelContextSubtitle = computed(() => {
  if (!labelEditorContext.value) {
    return '';
  }

  const parts = [
    `类型：${labelEditorContext.value.featureType}`,
    labelEditorContext.value.sourceLayer ? `图层：${labelEditorContext.value.sourceLayer}` : '',
    labelEditorContext.value.sourceFeatureId ? `来源ID：${labelEditorContext.value.sourceFeatureId}` : '',
    labelEditorContext.value.originalName ? `原名：${labelEditorContext.value.originalName}` : ''
  ].filter(Boolean);

  return parts.join(' · ');
});
const labelSourceSummary = computed(() => {
  if (!labelDraft.value) {
    return '-';
  }

  return [labelDraft.value.featureType, labelDraft.value.sourceLayer || '-', labelDraft.value.sourceFeatureId || '-'].join(' / ');
});
const labelEditorTip = computed(() => {
  if (labelPickMode.value === 'feature') {
    return '补名模式已开启：点击道路、建筑、院落或业务对象即可把当前对象载入编辑器。';
  }

  if (labelPickMode.value === 'point') {
    return '正在等待地图点击：下一次点击会把标注点移动到新位置。';
  }

  if (labelEditorContext.value?.sourceKind === 'basemap') {
    return '当前正在编辑底图要素标注。没有稳定 sourceFeatureId 的道路/建筑也可以保存为人工点位标注。';
  }

  if (labelEditorContext.value?.sourceKind === 'business') {
    return '当前正在编辑业务对象标注。保存后人工 display_name 会优先于业务名称显示。';
  }

  return '点击业务对象、进入补名模式点击底图要素，或新建手动点位后即可开始编辑。';
});

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

function getLabelFallbackCenter(): [number, number] {
  return mapStore.viewport.center ?? LABEL_DEFAULT_CENTER;
}

function setLabelDraftFromContext(context: EditableMapLabelContext, existing?: MapLabel | null): void {
  labelEditorContext.value = context;
  labelDraft.value = createDraftFromContext(context, existing);
  labelAliasInput.value = formatAliasNamesInput(existing?.aliasNames);
}

async function hydrateLabelDraft(context: EditableMapLabelContext): Promise<void> {
  labelEditorContext.value = context;
  const currentRequestId = ++labelContextRequestId.value;

  if (!context.sourceFeatureId) {
    setLabelDraftFromContext(context, null);
    return;
  }

  labelLookupLoading.value = true;
  try {
    const matched = await queryMapLabels({
      featureType: context.featureType,
      sourceFeatureId: context.sourceFeatureId,
      sourceLayer: context.sourceLayer || undefined
    });

    if (currentRequestId !== labelContextRequestId.value) {
      return;
    }

    setLabelDraftFromContext(context, matched[0] ?? null);
  } catch (error) {
    if (currentRequestId !== labelContextRequestId.value) {
      return;
    }

    setLabelDraftFromContext(context, null);
    ElMessage.error(error instanceof Error ? error.message : '加载标注失败');
  } finally {
    if (currentRequestId === labelContextRequestId.value) {
      labelLookupLoading.value = false;
    }
  }
}

function updateDraftPoint(longitude: number, latitude: number): void {
  if (!labelDraft.value) {
    const context = createManualPointContext(longitude, latitude);
    setLabelDraftFromContext(context, null);
    return;
  }

  labelDraft.value = {
    ...labelDraft.value,
    pointLongitude: longitude,
    pointLatitude: latitude
  };

  if (labelEditorContext.value) {
    labelEditorContext.value = {
      ...labelEditorContext.value,
      pointLongitude: longitude,
      pointLatitude: latitude
    };
  }
}

async function refreshMapLabels(viewport: MapViewportState, force = false): Promise<void> {
  if (!viewport.bbox) {
    manualLabels.value = [];
    lastRequestedLabelViewport.value = null;
    return;
  }

  if (!force && isSimilarViewport(viewport, lastRequestedLabelViewport.value)) {
    return;
  }

  labelRefreshLoading.value = true;
  try {
    manualLabels.value = await queryMapLabels({
      bbox: viewport.bbox,
      zoom: viewport.zoom,
      status: 1
    });
    lastRequestedLabelViewport.value = cloneViewport(viewport);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '标注图层加载失败');
  } finally {
    labelRefreshLoading.value = false;
  }
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
    debugMapRefresh('skip business refresh because no business layer is enabled');
  }

  await refreshMapLabels(viewport, force);

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
  if (labelPickMode.value === 'point') {
    return;
  }

  focusTarget.value = null;
  mapStore.setSelectedEntity(target);
}

function handleMapClick(payload: { longitude: number; latitude: number }): void {
  if (labelPickMode.value !== 'point') {
    return;
  }

  updateDraftPoint(payload.longitude, payload.latitude);
  labelPickMode.value = null;
  ElMessage.success('标注点已更新');
}

function handleBasemapFeatureClick(feature: BasemapInspectableFeature): void {
  focusTarget.value = null;
  labelPickMode.value = null;
  void hydrateLabelDraft(createLabelContextFromBasemapFeature(feature));
}

function toggleFeaturePickMode(): void {
  labelPickMode.value = labelPickMode.value === 'feature' ? null : 'feature';
}

function togglePointPickMode(): void {
  if (!labelDraft.value) {
    const [longitude, latitude] = getLabelFallbackCenter();
    setLabelDraftFromContext(createManualPointContext(longitude, latitude), null);
  }

  labelPickMode.value = labelPickMode.value === 'point' ? null : 'point';
}

function startManualLabel(): void {
  const [longitude, latitude] = getLabelFallbackCenter();
  setLabelDraftFromContext(createManualPointContext(longitude, latitude), null);
  labelPickMode.value = null;
}

function resetLabelDraft(): void {
  if (labelEditorContext.value) {
    void hydrateLabelDraft(labelEditorContext.value);
    return;
  }

  startManualLabel();
}

async function reloadCurrentLabel(): Promise<void> {
  if (!labelEditorContext.value) {
    startManualLabel();
    return;
  }

  await hydrateLabelDraft(labelEditorContext.value);
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

async function saveLabel(): Promise<void> {
  if (!labelDraft.value) {
    ElMessage.warning('请先选择要标注的对象');
    return;
  }

  labelDraft.value = {
    ...labelDraft.value,
    aliasNames: parseAliasNamesInput(labelAliasInput.value),
    labelType: labelDraft.value.labelType || getDefaultLabelType(labelDraft.value.featureType),
    minZoom: labelDraft.value.minZoom ?? getDefaultMinZoom(labelDraft.value.featureType),
    maxZoom: labelDraft.value.maxZoom ?? getDefaultMaxZoom(labelDraft.value.featureType),
    priority: labelDraft.value.priority ?? getDefaultPriority(labelDraft.value.featureType),
    source: labelDraft.value.source || DEFAULT_MANUAL_SOURCE,
    textColor: labelDraft.value.textColor || DEFAULT_TEXT_COLOR,
    haloColor: labelDraft.value.haloColor || DEFAULT_HALO_COLOR
  };

  const payload = sanitizeMapLabelPayload(labelDraft.value);
  if (!payload.displayName) {
    ElMessage.warning('显示名称不能为空');
    return;
  }

  if (payload.minZoom > payload.maxZoom) {
    ElMessage.warning('最小缩放不能大于最大缩放');
    return;
  }

  const isUpdate = Boolean(labelDraft.value.id);
  labelSaving.value = true;
  try {
    const saved = isUpdate && labelDraft.value.id !== null && labelDraft.value.id !== undefined
      ? await updateMapLabel(labelDraft.value.id, payload)
      : await createMapLabel(payload);

    labelDraft.value = {
      ...labelDraft.value,
      ...saved,
      id: saved.id,
      aliasNames: saved.aliasNames
    };
    labelAliasInput.value = formatAliasNamesInput(saved.aliasNames);

    await refreshMapLabels(mapStore.viewport, true);
    ElMessage.success(isUpdate ? '标注已更新' : '标注已保存');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存标注失败');
  } finally {
    labelSaving.value = false;
  }
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
  () => mapStore.selectedEntity,
  (target) => {
    if (!target) {
      return;
    }

    void hydrateLabelDraft(createLabelContextFromFocusTarget(target));
  },
  { deep: true }
);

watch(
  () => labelDraft.value?.featureType,
  (featureType) => {
    if (!labelDraft.value || !featureType) {
      return;
    }

    labelDraft.value = {
      ...labelDraft.value,
      labelType: labelDraft.value.labelType || getDefaultLabelType(featureType),
      minZoom: typeof labelDraft.value.minZoom === 'number' ? labelDraft.value.minZoom : getDefaultMinZoom(featureType),
      maxZoom: typeof labelDraft.value.maxZoom === 'number' ? labelDraft.value.maxZoom : getDefaultMaxZoom(featureType),
      priority: typeof labelDraft.value.priority === 'number' ? labelDraft.value.priority : getDefaultPriority(featureType)
    };
  }
);

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
.inspector-card,
.label-editor-card {
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

.result-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.result-status--success {
  background: #ecfdf3;
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.24);
}

.result-status--warning {
  background: #fff7ed;
  color: #c2410c;
  border-color: rgba(249, 115, 22, 0.22);
}

.result-status--danger {
  background: #fef2f2;
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.22);
}

.result-status--info {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.22);
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

.label-editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.label-editor-tip {
  margin: 0 0 12px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.label-context-summary {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.label-context-summary strong {
  display: block;
  margin-bottom: 4px;
}

.label-context-summary p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.label-editor-form {
  display: grid;
  gap: 4px;
}

.label-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.label-editor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.label-editor-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.label-editor-form :deep(.el-input-number) {
  width: 100%;
 }

.label-editor-form :deep(.el-select) {
  width: 100%;
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

  .label-form-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
