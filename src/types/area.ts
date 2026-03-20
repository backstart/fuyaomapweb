import type { FeatureCollection, Geometry } from 'geojson';

// Full area DTO returned by detail endpoints.
export interface MapArea {
  id: number;
  name: string;
  type?: string | null;
  remark?: string | null;
  styleJson?: string | null;
  status: number;
  geometryGeoJson: string;
  createTime: string;
  updateTime: string;
  createBy?: string | null;
  updateBy?: string | null;
}

// List payload used by the area table. Geometry stays out to keep list requests compact.
export interface MapAreaListItem {
  id: number;
  name: string;
  type?: string | null;
  status: number;
  styleJson?: string | null;
  updateTime: string;
}

// GeoJSON area features keep styling hints in properties, while geometry remains standard GeoJSON.
export interface AreaGeoJsonProperties {
  name: string;
  type?: string | null;
  remark?: string | null;
  styleJson?: string | null;
  status: number;
}

export type AreaFeatureCollection = FeatureCollection<Geometry, AreaGeoJsonProperties>;

// Matches backend list and geojson query fields, including spatial bbox constraints.
export interface QueryMapAreaParams {
  keyword?: string;
  type?: string;
  status?: number;
  page?: number;
  pageSize?: number;
  bbox?: string;
}
