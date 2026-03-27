import type { FeatureCollection, Point, Polygon } from 'geojson';
import type { EntityId } from '@/types/entity';

export type BuildingDrawMode = 'rectangle' | 'polygon' | null;

export interface DrawnBuildingArea {
  id: EntityId;
  name: string;
  buildingType?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  buildingCode?: string | null;
  geometryGeoJson: string;
  labelLongitude: number;
  labelLatitude: number;
  fillColor: string;
  lineColor: string;
  lineWidth: number;
  status: number;
  remark?: string | null;
  shapeType: Exclude<BuildingDrawMode, null>;
  isDraft: boolean;
  createTime: string;
  updateTime: string;
}

export interface EditableDrawnBuildingDraft {
  id: EntityId;
  name: string;
  buildingType: string;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  buildingCode: string;
  geometryGeoJson: string;
  labelLongitude: number;
  labelLatitude: number;
  fillColor: string;
  lineColor: string;
  lineWidth: number;
  status: number;
  remark: string;
  shapeType: Exclude<BuildingDrawMode, null>;
  isDraft: boolean;
}

export interface DrawnBuildingAreaProperties {
  areaId: string;
  name: string;
  buildingType?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  buildingCode?: string | null;
  fillColor: string;
  lineColor: string;
  lineWidth: number;
  status: number;
  isSelected: boolean;
}

export interface DrawnBuildingLabelProperties {
  areaId: string;
  labelText: string;
  name: string;
  buildingType?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  typeCode?: string | null;
  typeName?: string | null;
  renderType?: string | null;
  buildingCode?: string | null;
  isSelected: boolean;
}

export interface DrawnBuildingDraftProperties {
  mode: Exclude<BuildingDrawMode, null>;
}

export type DrawnBuildingAreaFeatureCollection = FeatureCollection<Polygon, DrawnBuildingAreaProperties>;
export type DrawnBuildingLabelFeatureCollection = FeatureCollection<Point, DrawnBuildingLabelProperties>;
export type DrawnBuildingDraftFeatureCollection = FeatureCollection<Polygon, DrawnBuildingDraftProperties>;

export interface DrawnBuildingCompletePayload {
  geometryGeoJson: string;
  labelLongitude: number;
  labelLatitude: number;
  shapeType: Exclude<BuildingDrawMode, null>;
}
