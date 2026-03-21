import type { FeatureCollection, Geometry } from 'geojson';

export interface MapPlace {
  id: number;
  name: string;
  placeType?: string | null;
  adminLevel?: number | null;
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
  id: number;
  name: string;
  placeType?: string | null;
  adminLevel?: number | null;
  status: number;
  centerLongitude?: number | null;
  centerLatitude?: number | null;
  updateTime: string;
}

export interface PlaceGeoJsonProperties {
  name: string;
  placeType?: string | null;
  adminLevel?: number | null;
  remark?: string | null;
  status: number;
  centerLongitude?: number | null;
  centerLatitude?: number | null;
}

export type PlaceFeatureCollection = FeatureCollection<Geometry, PlaceGeoJsonProperties>;

export interface QueryMapPlaceParams {
  keyword?: string;
  placeType?: string;
  adminLevel?: number;
  status?: number;
  page?: number;
  pageSize?: number;
  bbox?: string;
}

export interface SaveMapPlacePayload {
  name: string;
  placeType?: string;
  adminLevel?: number | null;
  remark?: string;
  status: number;
  geoJson?: string;
  centerLongitude?: number | null;
  centerLatitude?: number | null;
}
