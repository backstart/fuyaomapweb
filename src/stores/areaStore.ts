import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { getMapAreaById, getMapAreas, getMapAreasGeoJson } from '@/api/mapAreaApi';
import type { PaginationState } from '@/types/api';
import type { EntityId } from '@/types/entity';
import type { AreaFeatureCollection, MapArea, MapAreaListItem, QueryMapAreaParams } from '@/types/area';
import { DRAWN_BUILDING_SOURCE_TYPE } from '@/utils/drawnBuildings';
import { isRequestCanceled } from '@/utils/request';

function createEmptyFeatureCollection(): AreaFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

export const useAreaStore = defineStore('areas', () => {
  // 区域和店铺保持同样的 store 形态，便于后续抽象通用列表/地图逻辑。
  const list = ref<MapAreaListItem[]>([]);
  const geoJson = ref<AreaFeatureCollection>(createEmptyFeatureCollection());
  const loadingList = ref(false);
  const loadingGeoJson = ref(false);
  let mapGeoJsonAbortController: AbortController | null = null;
  const filters = reactive<QueryMapAreaParams>({
    keyword: '',
    type: '',
    sourceType: undefined,
    excludeSourceType: DRAWN_BUILDING_SOURCE_TYPE,
    status: undefined,
    page: 1,
    pageSize: 10,
    bbox: undefined
  });
  const pagination = reactive<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0
  });

  async function fetchList(overrides: QueryMapAreaParams = {}): Promise<void> {
    loadingList.value = true;
    try {
      const params = {
        ...filters,
        ...overrides
      };

      const data = await getMapAreas(params);
      list.value = data.items;
      pagination.page = data.page;
      pagination.pageSize = data.pageSize;
      pagination.total = data.total;
      filters.page = data.page;
      filters.pageSize = data.pageSize;
    } finally {
      loadingList.value = false;
    }
  }

  async function fetchGeoJson(overrides: QueryMapAreaParams = {}): Promise<void> {
    loadingGeoJson.value = true;
    try {
      geoJson.value = await getMapAreasGeoJson({
        keyword: filters.keyword,
        type: filters.type,
        sourceType: filters.sourceType,
        excludeSourceType: filters.excludeSourceType,
        status: filters.status,
        bbox: filters.bbox,
        ...overrides
      });
    } finally {
      loadingGeoJson.value = false;
    }
  }

  async function fetchGeoJsonForMap(overrides: QueryMapAreaParams = {}): Promise<boolean> {
    cancelMapGeoJsonRequest('replaced-by-new-bbox');
    const controller = new AbortController();
    mapGeoJsonAbortController = controller;
    loadingGeoJson.value = true;
    try {
      const nextGeoJson = await getMapAreasGeoJson(
        {
          bbox: overrides.bbox,
          keyword: overrides.keyword,
          excludeSourceType: overrides.excludeSourceType ?? filters.excludeSourceType
        },
        {
          signal: controller.signal
        }
      );

      if (mapGeoJsonAbortController !== controller) {
        return false;
      }

      geoJson.value = nextGeoJson;
      return true;
    } catch (error) {
      if (isRequestCanceled(error) || controller.signal.aborted) {
        return false;
      }

      throw error;
    } finally {
      if (mapGeoJsonAbortController === controller) {
        loadingGeoJson.value = false;
        mapGeoJsonAbortController = null;
      }
    }
  }

  function cancelMapGeoJsonRequest(reason?: string): void {
    if (!mapGeoJsonAbortController) {
      return;
    }

    if (import.meta.env.DEV) {
      console.debug('[MapGeoJson][areas] cancel request', reason ?? 'manual');
    }

    mapGeoJsonAbortController.abort();
    mapGeoJsonAbortController = null;
    loadingGeoJson.value = false;
  }

  function clearGeoJson(): void {
    geoJson.value = createEmptyFeatureCollection();
  }

  function updateFilters(patch: QueryMapAreaParams): void {
    Object.assign(filters, patch);
  }

  function resetFilters(): void {
    filters.keyword = '';
    filters.type = '';
    filters.sourceType = undefined;
    filters.excludeSourceType = DRAWN_BUILDING_SOURCE_TYPE;
    filters.status = undefined;
    filters.page = 1;
    filters.pageSize = 10;
    filters.bbox = undefined;
  }

  function getAreaDetail(id: EntityId): Promise<MapArea> {
    // 定位区域时需要 geometryGeoJson，因此必须拿详情接口而不是列表项。
    return getMapAreaById(id);
  }

  return {
    list,
    geoJson,
    loadingList,
    loadingGeoJson,
    filters,
    pagination,
    fetchList,
    fetchGeoJson,
    fetchGeoJsonForMap,
    cancelMapGeoJsonRequest,
    clearGeoJson,
    updateFilters,
    resetFilters,
    getAreaDetail
  };
});
