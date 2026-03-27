import type { FeatureCollection, Point } from 'geojson';
import type { EntityId } from '@/types/entity';
import type { EntityType } from '@/types/map';
import type { SemanticRenderProperties } from '@/types/semanticRender';

export type MapLabelFeatureType = EntityType | 'road' | 'building' | 'house' | 'courtyard' | 'manual';
export type MapLabelLayerType = 'road' | 'building' | 'business';
export type MapLabelPickMode = 'feature' | 'point' | null;

export interface MapLabel {
  id: EntityId;
  featureType: string;
  sourceFeatureId?: string | null;
  sourceLayer?: string | null;
  labelType: string;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType: string;
  originalName?: string | null;
  displayName: string;
  aliasNames: string[];
  pointLongitude: number;
  pointLatitude: number;
  lng: number;
  lat: number;
  minZoom: number;
  maxZoom: number;
  priority: number;
  textColor?: string | null;
  haloColor?: string | null;
  status: number;
  source?: string | null;
  remark?: string | null;
  createTime?: string;
  updateTime?: string;
  createBy?: string | null;
  updateBy?: string | null;
}

export interface QueryMapLabelParams {
  bbox?: string;
  zoom?: number;
  types?: string;
  featureType?: string;
  categoryCode?: string;
  typeCode?: string;
  renderType?: string;
  sourceFeatureId?: string;
  sourceLayer?: string;
  keyword?: string;
  status?: number;
}

export interface SaveMapLabelPayload {
  featureType: string;
  sourceFeatureId?: string | null;
  sourceLayer?: string | null;
  labelType?: string | null;
  categoryCode?: string | null;
  typeCode?: string | null;
  renderType?: string | null;
  originalName?: string | null;
  displayName: string;
  aliasNames: string[];
  pointLongitude: number;
  pointLatitude: number;
  minZoom: number;
  maxZoom: number;
  priority: number;
  textColor?: string | null;
  haloColor?: string | null;
  status: number;
  source?: string | null;
  remark?: string | null;
}

export interface MapLabelGeoJsonProperties extends Partial<SemanticRenderProperties> {
  labelId?: string;
  displayName: string;
  featureType: string;
  labelType: string;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
  sourceFeatureId?: string | null;
  sourceLayer?: string | null;
  priority: number;
  sortKey: number;
  textColor?: string | null;
  haloColor?: string | null;
  minZoom: number;
  maxZoom: number;
  status: number;
  source?: string | null;
  labelOrigin: 'manual' | 'business';
}

export type MapLabelFeatureCollection = FeatureCollection<Point, MapLabelGeoJsonProperties>;

export interface BasemapInspectableFeature {
  featureType: string;
  labelType: string;
  sourceFeatureId?: string | null;
  sourceLayer?: string | null;
  originalName?: string | null;
  pointLongitude: number;
  pointLatitude: number;
  geometryGeoJson?: string | null;
  source: 'pmtiles';
}

export interface EditableMapLabelContext {
  sourceKind: 'business' | 'basemap' | 'manual';
  featureType: string;
  labelType: string;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
  sourceFeatureId?: string | null;
  sourceLayer?: string | null;
  originalName?: string | null;
  suggestedDisplayName?: string | null;
  pointLongitude: number;
  pointLatitude: number;
  geometryGeoJson?: string | null;
  entityType?: EntityType;
  entityId?: EntityId;
}

export interface EditableMapLabelDraft extends SaveMapLabelPayload {
  id?: EntityId | null;
  categoryName?: string | null;
  typeName?: string | null;
  geometryType?: string | null;
}
