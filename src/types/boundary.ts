import type { FeatureCollection, Geometry } from 'geojson';

export interface MapBoundary {
  id: number;
  name: string;
  boundaryType?: string | null;
  adminLevel?: number | null;
  remark?: string | null;
  styleJson?: string | null;
  status: number;
  geometryGeoJson: string;
  createTime: string;
  updateTime: string;
  createBy?: string | null;
  updateBy?: string | null;
}

export interface MapBoundaryListItem {
  id: number;
  name: string;
  boundaryType?: string | null;
  adminLevel?: number | null;
  status: number;
  styleJson?: string | null;
  updateTime: string;
}

export interface BoundaryGeoJsonProperties {
  name: string;
  boundaryType?: string | null;
  adminLevel?: number | null;
  remark?: string | null;
  styleJson?: string | null;
  status: number;
}

export type BoundaryFeatureCollection = FeatureCollection<Geometry, BoundaryGeoJsonProperties>;

export interface QueryMapBoundaryParams {
  keyword?: string;
  boundaryType?: string;
  adminLevel?: number;
  status?: number;
  page?: number;
  pageSize?: number;
  bbox?: string;
}

export interface SaveMapBoundaryPayload {
  name: string;
  boundaryType?: string;
  adminLevel?: number | null;
  remark?: string;
  styleJson?: string;
  status: number;
  geoJson: string;
}
