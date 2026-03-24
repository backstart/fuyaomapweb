import type { FeatureCollection, Point } from 'geojson';
import type { EntityId } from '@/types/entity';

// Full shop DTO returned by detail endpoints.
export interface MapShop {
  id: EntityId;
  name: string;
  category?: string | null;
  remark?: string | null;
  icon?: string | null;
  status: number;
  longitude: number;
  latitude: number;
  createTime: string;
  updateTime: string;
  createBy?: string | null;
  updateBy?: string | null;
}

// List item payload is narrower than detail and is rendered directly in the shop table.
export interface MapShopListItem {
  id: EntityId;
  name: string;
  category?: string | null;
  icon?: string | null;
  status: number;
  longitude: number;
  latitude: number;
  updateTime: string;
}

// Properties carried by the GeoJSON shop layer. Coordinates live in the Point geometry itself.
export interface ShopGeoJsonProperties {
  name: string;
  category?: string | null;
  remark?: string | null;
  icon?: string | null;
  businessId?: string | null;
  sourceId?: string | null;
  status: number;
}

export type ShopFeatureCollection = FeatureCollection<Point, ShopGeoJsonProperties>;

// Query params follow the backend controller contract, including optional bbox filtering.
export interface QueryMapShopParams {
  keyword?: string;
  category?: string;
  status?: number;
  page?: number;
  pageSize?: number;
  bbox?: string;
}
