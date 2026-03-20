export type EntityType = 'shop' | 'area';

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

// Discriminated union used throughout the map flow to branch between flyTo and fitBounds.
export type MapFocusTarget = ShopFocusTarget | AreaFocusTarget;
