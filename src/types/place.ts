import type { FeatureCollection, Geometry } from 'geojson';
import type { EntityId } from '@/types/entity';

export interface MapPlace {
  id: EntityId;
  name: string;
  placeType?: string | null;
  adminLevel?: number | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
  remark?: string | null;
  status: number;
  geometryGeoJson?: string | null;
  centerLongitude?: number | null;
  centerLatitude?: number | null;
  createTime: string;
  updateTime: string;
  createBy?: string | null;
  updateBy?: string | null;
}

export interface MapPlaceListItem {
  id: EntityId;
  name: string;
  placeType?: string | null;
  adminLevel?: number | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
  status: number;
  centerLongitude?: number | null;
  centerLatitude?: number | null;
  updateTime: string;
}

export interface PlaceGeoJsonProperties {
  name: string;
  placeType?: string | null;
  adminLevel?: number | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
  remark?: string | null;
  status: number;
  businessId?: string | null;
  sourceId?: string | null;
  centerLongitude?: number | null;
  centerLatitude?: number | null;
  geometryGeoJson?: string | null;
}

export type PlaceFeatureCollection = FeatureCollection<Geometry, PlaceGeoJsonProperties>;

export interface QueryMapPlaceParams {
  keyword?: string;
  placeType?: string;
  categoryCode?: string;
  typeCode?: string;
  adminLevel?: number;
  status?: number;
  page?: number;
  pageSize?: number;
  bbox?: string;
}

export interface SaveMapPlacePayload {
  name: string;
  placeType?: string;
  categoryCode?: string | null;
  typeCode?: string | null;
  renderType?: string | null;
  adminLevel?: number | null;
  remark?: string;
  status: number;
  geoJson?: string;
  centerLongitude?: number | null;
  centerLatitude?: number | null;
}
