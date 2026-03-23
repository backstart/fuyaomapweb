import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { getMapShopById, getMapShops, getMapShopsGeoJson } from '@/api/mapShopApi';
import type { PaginationState } from '@/types/api';
import type { EntityId } from '@/types/entity';
import type { MapShop, MapShopListItem, QueryMapShopParams, ShopFeatureCollection } from '@/types/shop';

function createEmptyFeatureCollection(): ShopFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

export const useShopStore = defineStore('shops', () => {
  // 列表数据和 GeoJSON 分开维护：
  // 列表走分页接口，GeoJSON 走地图接口，两者查询目标不同。
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
      // 当前 store filters 作为默认条件，页面传入的 overrides 仅覆盖局部字段。
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
      // GeoJSON 查询主要用于地图渲染，因此通常只关心筛选条件和 bbox。
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
    // 列表页和地图页都复用这些字段，因此重置要显式覆盖每一项。
    filters.keyword = '';
    filters.category = '';
    filters.status = undefined;
    filters.page = 1;
    filters.pageSize = 10;
    filters.bbox = undefined;
  }

  function getShopDetail(id: EntityId): Promise<MapShop> {
    // 地图定位和详情弹窗统一走详情接口，避免依赖表格数据是否完整。
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
