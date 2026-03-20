import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { getMapShopById, getMapShops, getMapShopsGeoJson } from '@/api/mapShopApi';
import type { PaginationState } from '@/types/api';
import type { MapShop, MapShopListItem, QueryMapShopParams, ShopFeatureCollection } from '@/types/shop';

function createEmptyFeatureCollection(): ShopFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

export const useShopStore = defineStore('shops', () => {
  const list = ref<MapShopListItem[]>([]);
  const geoJson = ref<ShopFeatureCollection>(createEmptyFeatureCollection());
  const loadingList = ref(false);
  const loadingGeoJson = ref(false);
  const filters = reactive<QueryMapShopParams>({
    keyword: '',
    category: '',
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

  async function fetchList(overrides: QueryMapShopParams = {}): Promise<void> {
    loadingList.value = true;
    try {
      const params = {
        ...filters,
        ...overrides
      };

      const data = await getMapShops(params);
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

  async function fetchGeoJson(overrides: QueryMapShopParams = {}): Promise<void> {
    loadingGeoJson.value = true;
    try {
      geoJson.value = await getMapShopsGeoJson({
        keyword: filters.keyword,
        category: filters.category,
        status: filters.status,
        bbox: filters.bbox,
        ...overrides
      });
    } finally {
      loadingGeoJson.value = false;
    }
  }

  function updateFilters(patch: QueryMapShopParams): void {
    Object.assign(filters, patch);
  }

  function resetFilters(): void {
    filters.keyword = '';
    filters.category = '';
    filters.status = undefined;
    filters.page = 1;
    filters.pageSize = 10;
    filters.bbox = undefined;
  }

  function getShopDetail(id: number): Promise<MapShop> {
    return getMapShopById(id);
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
    getShopDetail
  };
});
