import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  createMapPlace,
  deleteMapPlace,
  getMapPlaceById,
  getMapPlaces,
  getMapPlacesGeoJson,
  updateMapPlace
} from '@/api/mapPlaceApi';
import type { PaginationState } from '@/types/api';
import type { EntityId } from '@/types/entity';
import type { MapPlace, MapPlaceListItem, PlaceFeatureCollection, QueryMapPlaceParams, SaveMapPlacePayload } from '@/types/place';
import { isRequestCanceled } from '@/utils/request';

function createEmptyFeatureCollection(): PlaceFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

export const usePlaceStore = defineStore('places', () => {
  const list = ref<MapPlaceListItem[]>([]);
  const geoJson = ref<PlaceFeatureCollection>(createEmptyFeatureCollection());
  const loadingList = ref(false);
  const loadingGeoJson = ref(false);
  let mapGeoJsonAbortController: AbortController | null = null;
  const filters = reactive<QueryMapPlaceParams>({
    keyword: '',
    placeType: '',
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

  async function fetchList(overrides: QueryMapPlaceParams = {}): Promise<void> {
    loadingList.value = true;
    try {
      const params = {
        ...filters,
        ...overrides
      };

      const data = await getMapPlaces(params);
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

  async function fetchGeoJson(overrides: QueryMapPlaceParams = {}): Promise<void> {
    loadingGeoJson.value = true;
    try {
      geoJson.value = await getMapPlacesGeoJson({
        keyword: filters.keyword,
        placeType: filters.placeType,
        adminLevel: filters.adminLevel,
        status: filters.status,
        bbox: filters.bbox,
        ...overrides
      });
    } finally {
      loadingGeoJson.value = false;
    }
  }

  async function fetchGeoJsonForMap(overrides: QueryMapPlaceParams = {}): Promise<boolean> {
    cancelMapGeoJsonRequest('replaced-by-new-bbox');
    const controller = new AbortController();
    mapGeoJsonAbortController = controller;
    loadingGeoJson.value = true;
    try {
      const nextGeoJson = await getMapPlacesGeoJson(
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
      console.debug('[MapGeoJson][places] cancel request', reason ?? 'manual');
    }

    mapGeoJsonAbortController.abort();
    mapGeoJsonAbortController = null;
    loadingGeoJson.value = false;
  }

  function clearGeoJson(): void {
    geoJson.value = createEmptyFeatureCollection();
  }

  function updateFilters(patch: QueryMapPlaceParams): void {
    Object.assign(filters, patch);
  }

  function resetFilters(): void {
    filters.keyword = '';
    filters.placeType = '';
    filters.adminLevel = undefined;
    filters.status = undefined;
    filters.page = 1;
    filters.pageSize = 10;
    filters.bbox = undefined;
  }

  function getPlaceDetail(id: EntityId): Promise<MapPlace> {
    return getMapPlaceById(id);
  }

  function createPlace(payload: SaveMapPlacePayload): Promise<MapPlace> {
    return createMapPlace(payload);
  }

  function editPlace(id: EntityId, payload: SaveMapPlacePayload): Promise<MapPlace> {
    return updateMapPlace(id, payload);
  }

  function removePlace(id: EntityId): Promise<boolean> {
    return deleteMapPlace(id);
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
    getPlaceDetail,
    createPlace,
    editPlace,
    removePlace
  };
});
