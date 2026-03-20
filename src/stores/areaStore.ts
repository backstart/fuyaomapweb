import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { getMapAreaById, getMapAreas, getMapAreasGeoJson } from '@/api/mapAreaApi';
import type { PaginationState } from '@/types/api';
import type { AreaFeatureCollection, MapArea, MapAreaListItem, QueryMapAreaParams } from '@/types/area';

function createEmptyFeatureCollection(): AreaFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

export const useAreaStore = defineStore('areas', () => {
  const list = ref<MapAreaListItem[]>([]);
  const geoJson = ref<AreaFeatureCollection>(createEmptyFeatureCollection());
  const loadingList = ref(false);
  const loadingGeoJson = ref(false);
  const filters = reactive<QueryMapAreaParams>({
    keyword: '',
    type: '',
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
        status: filters.status,
        bbox: filters.bbox,
        ...overrides
      });
    } finally {
      loadingGeoJson.value = false;
    }
  }

  function updateFilters(patch: QueryMapAreaParams): void {
    Object.assign(filters, patch);
  }

  function resetFilters(): void {
    filters.keyword = '';
    filters.type = '';
    filters.status = undefined;
    filters.page = 1;
    filters.pageSize = 10;
    filters.bbox = undefined;
  }

  function getAreaDetail(id: number): Promise<MapArea> {
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
    updateFilters,
    resetFilters,
    getAreaDetail
  };
});
