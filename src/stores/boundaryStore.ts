import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  createMapBoundary,
  deleteMapBoundary,
  getMapBoundaries,
  getMapBoundariesGeoJson,
  getMapBoundaryById,
  updateMapBoundary
} from '@/api/mapBoundaryApi';
import type { PaginationState } from '@/types/api';
import type { EntityId } from '@/types/entity';
import type {
  BoundaryFeatureCollection,
  MapBoundary,
  MapBoundaryListItem,
  QueryMapBoundaryParams,
  SaveMapBoundaryPayload
} from '@/types/boundary';
import { isRequestCanceled } from '@/utils/request';

function createEmptyFeatureCollection(): BoundaryFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

export const useBoundaryStore = defineStore('boundaries', () => {
  const list = ref<MapBoundaryListItem[]>([]);
  const geoJson = ref<BoundaryFeatureCollection>(createEmptyFeatureCollection());
  const loadingList = ref(false);
  const loadingGeoJson = ref(false);
  let mapGeoJsonAbortController: AbortController | null = null;
  const filters = reactive<QueryMapBoundaryParams>({
    keyword: '',
    boundaryType: '',
    adminLevel: undefined,
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

  async function fetchList(overrides: QueryMapBoundaryParams = {}): Promise<void> {
    loadingList.value = true;
    try {
      const params = {
        ...filters,
        ...overrides
      };

      const data = await getMapBoundaries(params);
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

  async function fetchGeoJson(overrides: QueryMapBoundaryParams = {}): Promise<void> {
    loadingGeoJson.value = true;
    try {
      geoJson.value = await getMapBoundariesGeoJson({
        keyword: filters.keyword,
        boundaryType: filters.boundaryType,
        adminLevel: filters.adminLevel,
        status: filters.status,
        bbox: filters.bbox,
        ...overrides
      });
    } finally {
      loadingGeoJson.value = false;
    }
  }

  async function fetchGeoJsonForMap(overrides: QueryMapBoundaryParams = {}): Promise<boolean> {
    cancelMapGeoJsonRequest('replaced-by-new-bbox');
    const controller = new AbortController();
    mapGeoJsonAbortController = controller;
    loadingGeoJson.value = true;
    try {
      const nextGeoJson = await getMapBoundariesGeoJson(
        {
          bbox: overrides.bbox,
          keyword: overrides.keyword
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
      console.debug('[MapGeoJson][boundaries] cancel request', reason ?? 'manual');
    }

    mapGeoJsonAbortController.abort();
    mapGeoJsonAbortController = null;
    loadingGeoJson.value = false;
  }

  function clearGeoJson(): void {
    geoJson.value = createEmptyFeatureCollection();
  }

  function updateFilters(patch: QueryMapBoundaryParams): void {
    Object.assign(filters, patch);
  }

  function resetFilters(): void {
    filters.keyword = '';
    filters.boundaryType = '';
    filters.adminLevel = undefined;
    filters.status = undefined;
    filters.page = 1;
    filters.pageSize = 10;
    filters.bbox = undefined;
  }

  function getBoundaryDetail(id: EntityId): Promise<MapBoundary> {
    return getMapBoundaryById(id);
  }

  function createBoundary(payload: SaveMapBoundaryPayload): Promise<MapBoundary> {
    return createMapBoundary(payload);
  }

  function editBoundary(id: EntityId, payload: SaveMapBoundaryPayload): Promise<MapBoundary> {
    return updateMapBoundary(id, payload);
  }

  function removeBoundary(id: EntityId): Promise<boolean> {
    return deleteMapBoundary(id);
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
    getBoundaryDetail,
    createBoundary,
    editBoundary,
    removeBoundary
  };
});
