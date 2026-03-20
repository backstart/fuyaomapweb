import type { FeatureCollection, Geometry } from 'geojson';

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

export interface MapAreaListItem {
  id: number;
  name: string;
  type?: string | null;
  status: number;
  styleJson?: string | null;
  updateTime: string;
}

export interface AreaGeoJsonProperties {
  name: string;
  type?: string | null;
  remark?: string | null;
  styleJson?: string | null;
  status: number;
}

export type AreaFeatureCollection = FeatureCollection<Geometry, AreaGeoJsonProperties>;

export interface QueryMapAreaParams {
  keyword?: string;
  type?: string;
  status?: number;
  page?: number;
  pageSize?: number;
  bbox?: string;
}
