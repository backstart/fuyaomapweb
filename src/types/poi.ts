import type { FeatureCollection, Point } from 'geojson';
import type { EntityId } from '@/types/entity';

export interface MapPoi {
  id: EntityId;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
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
  id: EntityId;
  name: string;
  category?: string | null;
  subcategory?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
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
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
  remark?: string | null;
  icon?: string | null;
  address?: string | null;
  phone?: string | null;
  businessId?: string | null;
  sourceId?: string | null;
  status: number;
}

export type PoiFeatureCollection = FeatureCollection<Point, PoiGeoJsonProperties>;

export interface QueryMapPoiParams {
  keyword?: string;
  category?: string;
  subcategory?: string;
  categoryCode?: string;
  typeCode?: string;
  status?: number;
  page?: number;
  pageSize?: number;
  bbox?: string;
}

export interface SaveMapPoiPayload {
  name: string;
  category?: string;
  subcategory?: string;
  categoryCode?: string | null;
  typeCode?: string | null;
  renderType?: string | null;
  remark?: string;
  icon?: string;
  status: number;
  address?: string;
  phone?: string;
  longitude: number;
  latitude: number;
}
