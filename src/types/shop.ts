import type { FeatureCollection, Point } from 'geojson';

export interface MapShop {
  id: number;
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

export interface MapShopListItem {
  id: number;
  name: string;
  category?: string | null;
  icon?: string | null;
  status: number;
  longitude: number;
  latitude: number;
  updateTime: string;
}

export interface ShopGeoJsonProperties {
  name: string;
  category?: string | null;
  remark?: string | null;
  icon?: string | null;
  status: number;
}

export type ShopFeatureCollection = FeatureCollection<Point, ShopGeoJsonProperties>;

export interface QueryMapShopParams {
  keyword?: string;
  category?: string;
  status?: number;
  page?: number;
  pageSize?: number;
  bbox?: string;
}
