import type { EntityId } from '@/types/entity';

export type EntityType = 'shop' | 'area' | 'poi' | 'place' | 'boundary' | 'label';

// Unified search rows returned by `/search`, later expanded into map focus targets when needed.
export interface MapSearchItem {
  id: EntityId;
  name: string;
  displayName?: string;
  type?: EntityType;
  entityType?: EntityType;
  itemType: EntityType;
  classification?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
  address?: string | null;
  source?: string | null;
  aliasNames?: string[];
  score?: number | null;
  status: number;
  lng?: number | null;
  lat?: number | null;
  longitude?: number | null;
  latitude?: number | null;
  bbox?: [number, number, number, number] | null;
  geometryGeoJson?: string | null;
  updateTime: string;
}

// Search endpoint accepts shared keyword filters plus optional business filters and bbox.
export interface MapSearchParams {
  q?: string;
  keyword?: string;
  types?: string;
  category?: string;
  type?: string;
  categoryCode?: string;
  typeCode?: string;
  status?: number;
  page?: number;
  limit?: number;
  pageSize?: number;
  bbox?: string;
  near?: string;
  radius?: number;
}

// Toggle state for business layers rendered on the map.
export interface LayerVisibility {
  shops: boolean;
  areas: boolean;
  pois: boolean;
  places: boolean;
  boundaries: boolean;
}

// Viewport is stored separately so list pages and the map page can share the last viewed extent.
export interface MapViewportState {
  bbox?: string;
  center?: [number, number];
  zoom?: number;
}

// Point targets can be positioned by lng/lat and are used for shop popup/flyTo behavior.
export interface ShopFocusTarget {
  entityType: 'shop';
  id: EntityId;
  name: string;
  category?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
  remark?: string | null;
  icon?: string | null;
  status: number;
  longitude: number;
  latitude: number;
}

export interface PoiFocusTarget {
  entityType: 'poi';
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
  address?: string | null;
  phone?: string | null;
  status: number;
  longitude: number;
  latitude: number;
}

// Area targets keep raw geometry JSON so the map can parse bounds only when focus is needed.
export interface AreaFocusTarget {
  entityType: 'area';
  id: EntityId;
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
  geometryGeoJson: string;
}

export interface PlaceFocusTarget {
  entityType: 'place';
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
}

export interface BoundaryFocusTarget {
  entityType: 'boundary';
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
}

export interface LabelFocusTarget {
  entityType: 'label';
  id: EntityId;
  name: string;
  displayName?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
  source?: string | null;
  classification?: string | null;
  status: number;
  longitude: number;
  latitude: number;
}

// Discriminated union used throughout the map flow to branch between flyTo and fitBounds.
export type MapFocusTarget =
  | ShopFocusTarget
  | AreaFocusTarget
  | PoiFocusTarget
  | PlaceFocusTarget
  | BoundaryFocusTarget
  | LabelFocusTarget;
