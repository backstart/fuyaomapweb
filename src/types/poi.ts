import type { FeatureCollection, Point } from 'geojson';

export interface MapPoi {
  id: number;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  remark?: string | null;
  icon?: string | null;
  status: number;
  address?: string | null;
  phone?: string | null;
  longitude: number;
  latitude: number;
  createTime: string;
  updateTime: string;
  createBy?: string | null;
  updateBy?: string | null;
}

export interface MapPoiListItem {
  id: number;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  icon?: string | null;
  status: number;
  longitude: number;
  latitude: number;
  updateTime: string;
}

export interface PoiGeoJsonProperties {
  name: string;
  category?: string | null;
  subcategory?: string | null;
  remark?: string | null;
  icon?: string | null;
  address?: string | null;
  phone?: string | null;
  status: number;
}

export type PoiFeatureCollection = FeatureCollection<Point, PoiGeoJsonProperties>;

export interface QueryMapPoiParams {
  keyword?: string;
  category?: string;
  subcategory?: string;
  status?: number;
  page?: number;
  pageSize?: number;
  bbox?: string;
}

export interface SaveMapPoiPayload {
  name: string;
  category?: string;
  subcategory?: string;
  remark?: string;
  icon?: string;
  status: number;
  address?: string;
  phone?: string;
  longitude: number;
  latitude: number;
}
