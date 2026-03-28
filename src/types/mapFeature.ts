import type { EntityId } from '@/types/entity';
import type { EntityType } from '@/types/map';

export type MapViewportEntityType = EntityType | 'road' | 'water' | 'building';

export interface MapViewportFeature {
  id: EntityId;
  entityType: MapViewportEntityType;
  featureType: string;
  sourceType?: string | null;
  source?: string | null;
  sourceId?: string | null;
  sourceFeatureId?: string | null;
  sourceLayer?: string | null;
  labelType?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType: string;
  originalName?: string | null;
  displayName: string;
  aliasNames: string[];
  originalTypeCode?: string | null;
  originalTagsJson?: string | null;
  nameSource?: string | null;
  semanticSource?: string | null;
  minZoom: number;
  maxZoom: number;
  priority: number;
  textColor?: string | null;
  haloColor?: string | null;
  iconKey?: string | null;
  styleKey?: string | null;
  textStyleKey?: string | null;
  pointLongitude?: number | null;
  pointLatitude?: number | null;
  classification?: string | null;
  subclassification?: string | null;
  adminLevel?: number | null;
  remark?: string | null;
  styleJson?: string | null;
  icon?: string | null;
  address?: string | null;
  phone?: string | null;
  geometryGeoJson?: string | null;
  status: number;
  updateTime: string;
}

export interface QueryMapViewportFeaturesParams {
  bbox: string;
  zoom?: number;
  featureTypes?: string;
  types?: string;
  categoryCode?: string;
  typeCode?: string;
  geometryTypes?: string;
  status?: number;
  limit?: number;
}

export interface MapViewportFeatureCollection {
  items: MapViewportFeature[];
  limit: number;
  hasMore: boolean;
}
