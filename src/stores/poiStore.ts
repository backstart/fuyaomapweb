import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  createMapPoi,
  deleteMapPoi,
  getMapPoiById,
  getMapPois,
  getMapPoisGeoJson,
  updateMapPoi
} from '@/api/mapPoiApi';
import type { PaginationState } from '@/types/api';
import type { EntityId } from '@/types/entity';
import type { MapPoi, MapPoiListItem, PoiFeatureCollection, QueryMapPoiParams, SaveMapPoiPayload } from '@/types/poi';

function createEmptyFeatureCollection(): PoiFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

export const usePoiStore = defineStore('pois', () => {
  const list = ref<MapPoiListItem[]>([]);
  const geoJson = ref<PoiFeatureCollection>(createEmptyFeatureCollection());
  const loadingList = ref(false);
  const loadingGeoJson = ref(false);
  const filters = reactive<QueryMapPoiParams>({
    keyword: '',
    category: '',
    subcategory: '',
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

  async function fetchList(overrides: QueryMapPoiParams = {}): Promise<void> {
    loadingList.value = true;
    try {
      const params = {
        ...filters,
        ...overrides
      };

      const data = await getMapPois(params);
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

  async function fetchGeoJson(overrides: QueryMapPoiParams = {}): Promise<void> {
    loadingGeoJson.value = true;
    try {
      geoJson.value = await getMapPoisGeoJson({
        keyword: filters.keyword,
        category: filters.category,
        subcategory: filters.subcategory,
        status: filters.status,
        bbox: filters.bbox,
        ...overrides
      });
    } finally {
      loadingGeoJson.value = false;
    }
  }

  function updateFilters(patch: QueryMapPoiParams): void {
    Object.assign(filters, patch);
  }

  function resetFilters(): void {
    filters.keyword = '';
    filters.category = '';
    filters.subcategory = '';
    filters.status = undefined;
    filters.page = 1;
    filters.pageSize = 10;
    filters.bbox = undefined;
  }

  function getPoiDetail(id: EntityId): Promise<MapPoi> {
    return getMapPoiById(id);
  }

  function createPoi(payload: SaveMapPoiPayload): Promise<MapPoi> {
    return createMapPoi(payload);
  }

  function editPoi(id: EntityId, payload: SaveMapPoiPayload): Promise<MapPoi> {
    return updateMapPoi(id, payload);
  }

  function removePoi(id: EntityId): Promise<boolean> {
    return deleteMapPoi(id);
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
    updateFilters,
    resetFilters,
    getPoiDetail,
    createPoi,
    editPoi,
    removePoi
  };
});
