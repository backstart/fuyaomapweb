import type { FeatureCollection, Geometry } from 'geojson';
import type { EntityId } from '@/types/entity';

// Full area DTO returned by detail endpoints.
export interface MapArea {
  id: EntityId;
  name: string;
  type?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType: string;
  remark?: string | null;
  styleJson?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  status: number;
  geometryGeoJson: string;
  createTime: string;
  updateTime: string;
  createBy?: string | null;
  updateBy?: string | null;
}

// List payload used by the area table. Geometry stays out to keep list requests compact.
export interface MapAreaListItem {
  id: EntityId;
  name: string;
  type?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType: string;
  status: number;
  styleJson?: string | null;
  updateTime: string;
}

// GeoJSON area features keep styling hints in properties, while geometry remains standard GeoJSON.
export interface AreaGeoJsonProperties {
  name: string;
  type?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
  remark?: string | null;
  styleJson?: string | null;
  status: number;
  businessId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  geometryGeoJson?: string | null;
  updateTime?: string | null;
}

export type AreaFeatureCollection = FeatureCollection<Geometry, AreaGeoJsonProperties>;

// Matches backend list and geojson query fields, including spatial bbox constraints.
export interface QueryMapAreaParams {
  keyword?: string;
  type?: string;
  categoryCode?: string;
  typeCode?: string;
  renderType?: string;
  sourceType?: string;
  excludeSourceType?: string;
  status?: number;
  page?: number;
  pageSize?: number;
  bbox?: string;
}

export interface SaveMapAreaPayload {
  name: string;
  type?: string | null;
  categoryCode?: string | null;
  typeCode?: string | null;
  renderType?: string | null;
  remark?: string | null;
  styleJson?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  status: number;
  geoJson: string;
}
