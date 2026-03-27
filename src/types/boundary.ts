import type { FeatureCollection, Geometry } from 'geojson';
import type { EntityId } from '@/types/entity';
import type { SemanticRenderProperties } from '@/types/semanticRender';

export interface MapBoundary {
  id: EntityId;
  name: string;
  boundaryType?: string | null;
  adminLevel?: number | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
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
  id: EntityId;
  name: string;
  boundaryType?: string | null;
  adminLevel?: number | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
  status: number;
  styleJson?: string | null;
  updateTime: string;
}

export interface BoundaryGeoJsonProperties extends Partial<SemanticRenderProperties> {
  name: string;
  boundaryType?: string | null;
  adminLevel?: number | null;
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
  sourceId?: string | null;
  geometryGeoJson?: string | null;
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
