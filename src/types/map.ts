export type EntityType = 'shop' | 'area' | 'poi' | 'place' | 'boundary';

// Unified search rows returned by `/search`, later expanded into map focus targets when needed.
export interface MapSearchItem {
  id: number;
  name: string;
  itemType: EntityType;
  classification?: string | null;
  status: number;
  longitude?: number | null;
  latitude?: number | null;
  geometryGeoJson?: string | null;
  updateTime: string;
}

// Search endpoint accepts shared keyword filters plus optional business filters and bbox.
export interface MapSearchParams {
  q?: string;
  keyword?: string;
  category?: string;
  type?: string;
  status?: number;
  page?: number;
  pageSize?: number;
  bbox?: string;
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
  id: number;
  name: string;
  category?: string | null;
  remark?: string | null;
  icon?: string | null;
  status: number;
  longitude: number;
  latitude: number;
}

export interface PoiFocusTarget {
  entityType: 'poi';
  id: number;
  name: string;
  category?: string | null;
  subcategory?: string | null;
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
  id: number;
  name: string;
  type?: string | null;
  remark?: string | null;
  styleJson?: string | null;
  status: number;
  geometryGeoJson: string;
}

export interface PlaceFocusTarget {
  entityType: 'place';
  id: number;
  name: string;
  placeType?: string | null;
  adminLevel?: number | null;
  remark?: string | null;
  status: number;
  geometryGeoJson?: string | null;
  centerLongitude?: number | null;
  centerLatitude?: number | null;
}

export interface BoundaryFocusTarget {
  entityType: 'boundary';
  id: number;
  name: string;
  boundaryType?: string | null;
  adminLevel?: number | null;
  remark?: string | null;
  styleJson?: string | null;
  status: number;
  geometryGeoJson: string;
}

// Discriminated union used throughout the map flow to branch between flyTo and fitBounds.
export type MapFocusTarget =
  | ShopFocusTarget
  | AreaFocusTarget
  | PoiFocusTarget
  | PlaceFocusTarget
  | BoundaryFocusTarget;
