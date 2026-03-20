import type { PagedResult } from '@/types/api';
import type { MapShop, MapShopListItem, QueryMapShopParams, ShopFeatureCollection } from '@/types/shop';
import { getRequest } from '@/api/http';

export function getMapShops(params: QueryMapShopParams): Promise<PagedResult<MapShopListItem>> {
  return getRequest('/map/shops', {
    params
  });
}

export function getMapShopById(id: number): Promise<MapShop> {
  return getRequest(`/map/shops/${id}`);
}

export function getMapShopsGeoJson(params: QueryMapShopParams): Promise<ShopFeatureCollection> {
  return getRequest('/map/shops/geojson', {
    params
  });
}
