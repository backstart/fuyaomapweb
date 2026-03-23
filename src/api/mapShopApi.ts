import type { AxiosRequestConfig } from 'axios';
import type { PagedResult } from '@/types/api';
import type { EntityId } from '@/types/entity';
import type { MapShop, MapShopListItem, QueryMapShopParams, ShopFeatureCollection } from '@/types/shop';
import { getRequest } from '@/api/http';

// 店铺列表用于表格分页。
export function getMapShops(params: QueryMapShopParams): Promise<PagedResult<MapShopListItem>> {
  return getRequest('/map/shops', {
    params
  });
}

// 详情接口用于地图定位、弹窗和后续编辑扩展。
export function getMapShopById(id: EntityId): Promise<MapShop> {
  return getRequest(`/map/shops/${id}`);
}

// GeoJSON 接口直接喂给 MapLibre source，不再做二次结构转换。
export function getMapShopsGeoJson(
  params: QueryMapShopParams,
  config?: AxiosRequestConfig
): Promise<ShopFeatureCollection> {
  return getRequest('/map/shops/geojson', {
    params,
    ...config
  });
}
