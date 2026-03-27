import type { Feature, Geometry, Polygon } from 'geojson';
import type { AreaGeoJsonProperties, MapArea, SaveMapAreaPayload } from '@/types/area';
import type { DrawnBuildingArea, EditableDrawnBuildingDraft } from '@/types/drawnBuilding';
import { DEFAULT_DRAWN_BUILDING_TYPE_CODE } from '@/utils/mapFeatureTypes';
import { getGeometryCenter, parseGeometryGeoJson } from '@/utils/geometry';

export const DEFAULT_DRAWN_BUILDING_FILL = 'rgba(70, 141, 247, 0.18)';
export const DEFAULT_DRAWN_BUILDING_LINE = '#2f7df6';
export const DEFAULT_DRAWN_BUILDING_LINE_WIDTH = 2.2;
export const DRAWN_BUILDING_SOURCE_TYPE = 'drawn-building';
const DRAWN_BUILDING_STYLE_SCHEMA = 'drawn-building';
const DRAWN_BUILDING_STYLE_VERSION = 1;

type Coordinate = [number, number];

interface DrawnBuildingStylePayload {
  schema: typeof DRAWN_BUILDING_STYLE_SCHEMA;
  version: number;
  buildingCode?: string | null;
  labelLongitude?: number | null;
  labelLatitude?: number | null;
  fillColor?: string | null;
  lineColor?: string | null;
  lineWidth?: number | null;
  shapeType?: DrawnBuildingArea['shapeType'] | null;
}

function closeRing(points: Coordinate[]): Coordinate[] {
  if (!points.length) {
    return points;
  }

  const [firstLongitude, firstLatitude] = points[0];
  const last = points[points.length - 1];
  if (last[0] === firstLongitude && last[1] === firstLatitude) {
    return [...points];
  }

  return [...points, [firstLongitude, firstLatitude]];
}

export function buildRectanglePolygonGeometry(start: Coordinate, end: Coordinate): Polygon {
  const minLongitude = Math.min(start[0], end[0]);
  const maxLongitude = Math.max(start[0], end[0]);
  const minLatitude = Math.min(start[1], end[1]);
  const maxLatitude = Math.max(start[1], end[1]);

  return {
    type: 'Polygon',
    coordinates: [[
      [minLongitude, minLatitude],
      [maxLongitude, minLatitude],
      [maxLongitude, maxLatitude],
      [minLongitude, maxLatitude],
      [minLongitude, minLatitude]
    ]]
  };
}

export function buildPolygonGeometry(points: Coordinate[]): Polygon | null {
  const normalizedPoints = dedupeCoordinates(points);
  if (normalizedPoints.length < 3) {
    return null;
  }

  return {
    type: 'Polygon',
    coordinates: [closeRing(normalizedPoints)]
  };
}

export function dedupeCoordinates(points: Coordinate[], threshold = 1e-7): Coordinate[] {
  return points.reduce<Coordinate[]>((result, current) => {
    const last = result[result.length - 1];
    if (last && Math.abs(last[0] - current[0]) <= threshold && Math.abs(last[1] - current[1]) <= threshold) {
      return result;
    }

    result.push(current);
    return result;
  }, []);
}

export function getGeometryLabelPoint(geometryGeoJson: string): Coordinate {
  const geometry = parseGeometryGeoJson(geometryGeoJson);
  if (!geometry) {
    return [0, 0];
  }

  return getGeometryCenter(geometry) ?? [0, 0];
}

export function createDrawnBuildingDraft(area: DrawnBuildingArea): EditableDrawnBuildingDraft {
  return {
    id: area.id,
    name: area.name,
    buildingType: area.buildingType ?? '',
    categoryCode: area.categoryCode ?? null,
    categoryName: area.categoryName ?? null,
    typeCode: area.typeCode ?? DEFAULT_DRAWN_BUILDING_TYPE_CODE,
    typeName: area.typeName ?? area.buildingType ?? null,
    renderType: area.renderType ?? 'polygon-fill',
    buildingCode: area.buildingCode ?? '',
    geometryGeoJson: area.geometryGeoJson,
    labelLongitude: area.labelLongitude,
    labelLatitude: area.labelLatitude,
    fillColor: area.fillColor,
    lineColor: area.lineColor,
    lineWidth: area.lineWidth,
    status: area.status,
    remark: area.remark ?? '',
    shapeType: area.shapeType,
    isDraft: area.isDraft
  };
}

export function getDrawnBuildingLabelText(area: Pick<DrawnBuildingArea, 'name' | 'buildingCode' | 'id'>): string {
  const name = area.name.trim();
  if (name) {
    return name;
  }

  const code = 'buildingCode' in area && typeof area.buildingCode === 'string' ? area.buildingCode.trim() : '';
  if (code) {
    return code;
  }

  return `建筑-${String(area.id).slice(-6)}`;
}

export function createPolygonFeature<TProperties>(geometry: Polygon, properties: TProperties, id?: string): Feature<Polygon, TProperties> {
  return {
    type: 'Feature',
    id,
    properties,
    geometry
  };
}

function parseDrawnBuildingStyle(styleJson?: string | null): DrawnBuildingStylePayload | null {
  if (!styleJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(styleJson) as Partial<DrawnBuildingStylePayload>;
    if (parsed.schema !== DRAWN_BUILDING_STYLE_SCHEMA) {
      return null;
    }

    return {
      schema: DRAWN_BUILDING_STYLE_SCHEMA,
      version: typeof parsed.version === 'number' ? parsed.version : DRAWN_BUILDING_STYLE_VERSION,
      buildingCode: typeof parsed.buildingCode === 'string' ? parsed.buildingCode : null,
      labelLongitude: typeof parsed.labelLongitude === 'number' ? parsed.labelLongitude : null,
      labelLatitude: typeof parsed.labelLatitude === 'number' ? parsed.labelLatitude : null,
      fillColor: typeof parsed.fillColor === 'string' ? parsed.fillColor : null,
      lineColor: typeof parsed.lineColor === 'string' ? parsed.lineColor : null,
      lineWidth: typeof parsed.lineWidth === 'number' ? parsed.lineWidth : null,
      shapeType: parsed.shapeType === 'rectangle' || parsed.shapeType === 'polygon' ? parsed.shapeType : null
    };
  } catch (error) {
    console.warn('Failed to parse drawn building style json.', error);
    return null;
  }
}

function resolveDrawnBuildingId(feature: Feature<Geometry, AreaGeoJsonProperties>): string | null {
  const properties = feature.properties ?? {};
  if (typeof properties.businessId === 'string' && properties.businessId.trim()) {
    return properties.businessId.trim();
  }

  if (typeof properties.sourceId === 'string' && properties.sourceId.trim()) {
    return properties.sourceId.trim();
  }

  if (typeof feature.id === 'string' && feature.id.trim()) {
    return feature.id.trim();
  }

  if (typeof feature.id === 'number' && Number.isFinite(feature.id)) {
    return String(feature.id);
  }

  return null;
}

function createPersistedDrawnBuildingArea(
  id: string,
  area: {
    name: string;
    type?: string | null;
    categoryCode?: string | null;
    categoryName?: string | null;
    typeCode?: string | null;
    typeName?: string | null;
    renderType?: string | null;
    remark?: string | null;
    styleJson?: string | null;
    status: number;
    geometryGeoJson: string;
    updateTime?: string | null;
    createTime?: string | null;
  }
): DrawnBuildingArea | null {
  const style = parseDrawnBuildingStyle(area.styleJson);
  if (!style) {
    return null;
  }

  const fallbackPoint = getGeometryLabelPoint(area.geometryGeoJson);

  return {
    id,
    name: area.name,
    buildingType: area.typeName ?? area.type ?? null,
    categoryCode: area.categoryCode ?? null,
    categoryName: area.categoryName ?? null,
    typeCode: area.typeCode ?? DEFAULT_DRAWN_BUILDING_TYPE_CODE,
    typeName: area.typeName ?? area.type ?? null,
    renderType: area.renderType ?? 'polygon-fill',
    buildingCode: style.buildingCode ?? null,
    geometryGeoJson: area.geometryGeoJson,
    labelLongitude: style.labelLongitude ?? fallbackPoint[0],
    labelLatitude: style.labelLatitude ?? fallbackPoint[1],
    fillColor: style.fillColor || DEFAULT_DRAWN_BUILDING_FILL,
    lineColor: style.lineColor || DEFAULT_DRAWN_BUILDING_LINE,
    lineWidth: style.lineWidth ?? DEFAULT_DRAWN_BUILDING_LINE_WIDTH,
    status: area.status,
    remark: area.remark ?? '',
    shapeType: style.shapeType === 'rectangle' ? 'rectangle' : 'polygon',
    isDraft: false,
    createTime: area.createTime || area.updateTime || '',
    updateTime: area.updateTime || area.createTime || ''
  };
}

export function parseDrawnBuildingAreaFromMapArea(area: MapArea): DrawnBuildingArea | null {
  const id = String(area.id).trim();
  if (!id) {
    return null;
  }

  return createPersistedDrawnBuildingArea(id, {
    name: area.name,
    type: area.type,
    categoryCode: area.categoryCode,
    categoryName: area.categoryName,
    typeCode: area.typeCode,
    typeName: area.typeName,
    renderType: area.renderType,
    remark: area.remark,
    styleJson: area.styleJson,
    status: area.status,
    geometryGeoJson: area.geometryGeoJson,
    createTime: area.createTime,
    updateTime: area.updateTime
  });
}

export function parseDrawnBuildingAreaFromFeature(feature: Feature<Geometry, AreaGeoJsonProperties>): DrawnBuildingArea | null {
  const id = resolveDrawnBuildingId(feature);
  if (!id) {
    return null;
  }

  const properties = feature.properties ?? {};
  const geometryGeoJson = properties.geometryGeoJson || JSON.stringify(feature.geometry);

  return createPersistedDrawnBuildingArea(id, {
    name: properties.name ?? '未命名建筑',
    type: properties.type,
    categoryCode: properties.categoryCode,
    categoryName: properties.categoryName,
    typeCode: properties.typeCode,
    typeName: properties.typeName,
    renderType: properties.renderType,
    remark: properties.remark,
    styleJson: properties.styleJson,
    status: typeof properties.status === 'number' ? properties.status : 1,
    geometryGeoJson,
    updateTime: properties.updateTime || ''
  });
}

export function buildDrawnBuildingSavePayload(
  area: Pick<EditableDrawnBuildingDraft, 'name' | 'buildingType' | 'categoryCode' | 'typeCode' | 'renderType' | 'buildingCode' | 'geometryGeoJson' | 'labelLongitude' | 'labelLatitude' | 'fillColor' | 'lineColor' | 'lineWidth' | 'status' | 'remark' | 'shapeType'>,
  options?: {
    sourceId?: string | null;
  }
): SaveMapAreaPayload {
  return {
    name: area.name.trim(),
    type: area.buildingType.trim() || null,
    categoryCode: area.categoryCode?.trim() || null,
    typeCode: area.typeCode?.trim() || DEFAULT_DRAWN_BUILDING_TYPE_CODE,
    renderType: area.renderType?.trim() || 'polygon-fill',
    remark: area.remark.trim() || null,
    styleJson: JSON.stringify({
      schema: DRAWN_BUILDING_STYLE_SCHEMA,
      version: DRAWN_BUILDING_STYLE_VERSION,
      buildingCode: area.buildingCode.trim() || null,
      labelLongitude: area.labelLongitude,
      labelLatitude: area.labelLatitude,
      fillColor: area.fillColor.trim() || DEFAULT_DRAWN_BUILDING_FILL,
      lineColor: area.lineColor.trim() || DEFAULT_DRAWN_BUILDING_LINE,
      lineWidth: area.lineWidth,
      shapeType: area.shapeType
    } satisfies DrawnBuildingStylePayload),
    sourceType: DRAWN_BUILDING_SOURCE_TYPE,
    sourceId: options?.sourceId?.trim() || undefined,
    status: area.status,
    geoJson: area.geometryGeoJson
  };
}
