export type EntityType = 'shop' | 'area';

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

export interface LayerVisibility {
  shops: boolean;
  areas: boolean;
}

export interface MapViewportState {
  bbox?: string;
  center?: [number, number];
  zoom?: number;
}

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

export type MapFocusTarget = ShopFocusTarget | AreaFocusTarget;
