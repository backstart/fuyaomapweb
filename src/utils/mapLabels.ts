import type { Feature, Geometry, Point, Position } from 'geojson';
import type { EntityId } from '@/types/entity';
import type { BasemapInspectableFeature, EditableMapLabelContext, EditableMapLabelDraft, MapLabel, MapLabelFeatureType, MapLabelLayerType, SaveMapLabelPayload } from '@/types/mapLabel';
import type { MapFocusTarget } from '@/types/map';
import { getGeometryCenter, parseGeometryGeoJson } from '@/utils/geometry';

const EMPTY_ALIAS_NAMES: string[] = [];

export const DEFAULT_TEXT_COLOR = '#314155';
export const DEFAULT_HALO_COLOR = 'rgba(255, 255, 255, 0.96)';
export const DEFAULT_MANUAL_SOURCE = 'manual';

const FEATURE_TYPE_DEFAULTS: Record<string, { labelType: MapLabelLayerType; minZoom: number; maxZoom: number; priority: number }> = {
  road: { labelType: 'road', minZoom: 10, maxZoom: 24, priority: 220 },
  building: { labelType: 'building', minZoom: 15, maxZoom: 24, priority: 240 },
  house: { labelType: 'building', minZoom: 16, maxZoom: 24, priority: 260 },
  courtyard: { labelType: 'building', minZoom: 16, maxZoom: 24, priority: 250 },
  shop: { labelType: 'business', minZoom: 13, maxZoom: 24, priority: 260 },
  poi: { labelType: 'business', minZoom: 13, maxZoom: 24, priority: 240 },
  place: { labelType: 'business', minZoom: 11, maxZoom: 24, priority: 180 },
  area: { labelType: 'business', minZoom: 12, maxZoom: 24, priority: 160 },
  boundary: { labelType: 'business', minZoom: 11, maxZoom: 24, priority: 150 },
  manual: { labelType: 'business', minZoom: 14, maxZoom: 24, priority: 200 }
};

function normalizeFeatureType(featureType: string | null | undefined): string {
  return featureType?.trim().toLowerCase() || 'manual';
}

function isMeaningfulString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function resolvePreferredName(options: {
  manualDisplayName?: string | null;
  overrideDisplayName?: string | null;
  businessDisplayName?: string | null;
  nameZh?: string | null;
  name?: string | null;
  nameEn?: string | null;
  ref?: string | null;
}): string {
  return [
    options.manualDisplayName,
    options.overrideDisplayName,
    options.businessDisplayName,
    options.nameZh,
    options.name,
    options.nameEn,
    options.ref
  ].find(isMeaningfulString)?.trim() ?? '';
}

export function getDefaultLabelType(featureType: string): MapLabelLayerType {
  return FEATURE_TYPE_DEFAULTS[normalizeFeatureType(featureType)]?.labelType ?? 'business';
}

export function getDefaultMinZoom(featureType: string): number {
  return FEATURE_TYPE_DEFAULTS[normalizeFeatureType(featureType)]?.minZoom ?? 12;
}

export function getDefaultMaxZoom(featureType: string): number {
  return FEATURE_TYPE_DEFAULTS[normalizeFeatureType(featureType)]?.maxZoom ?? 24;
}

export function getDefaultPriority(featureType: string): number {
  return FEATURE_TYPE_DEFAULTS[normalizeFeatureType(featureType)]?.priority ?? 160;
}

export function getBusinessLabelSourceLayer(featureType: string): string | null {
  switch (normalizeFeatureType(featureType)) {
    case 'shop':
      return 'shops';
    case 'poi':
      return 'pois';
    case 'place':
      return 'places';
    case 'area':
      return 'areas';
    case 'boundary':
      return 'boundaries';
    default:
      return null;
  }
}

export function buildLabelLookupKey(featureType: string, sourceFeatureId?: string | number | null, sourceLayer?: string | null): string | null {
  const normalizedType = normalizeFeatureType(featureType);
  const normalizedSourceFeatureId = sourceFeatureId === undefined || sourceFeatureId === null ? '' : String(sourceFeatureId).trim();
  if (!normalizedSourceFeatureId) {
    return null;
  }

  return `${normalizedType}|${normalizedSourceFeatureId}|${sourceLayer?.trim() || ''}`;
}

export function parseAliasNamesInput(value: string): string[] {
  return value
    .split(/[\n,，;]/)
    .map((item) => item.trim())
    .filter((item, index, source) => Boolean(item) && source.indexOf(item) === index);
}

export function formatAliasNamesInput(aliasNames?: string[] | null): string {
  return aliasNames?.filter(isMeaningfulString).join(', ') ?? '';
}

export function sanitizeMapLabelPayload(draft: EditableMapLabelDraft): SaveMapLabelPayload {
  return {
    featureType: normalizeFeatureType(draft.featureType),
    sourceFeatureId: draft.sourceFeatureId?.trim() || null,
    sourceLayer: draft.sourceLayer?.trim() || null,
    labelType: draft.labelType?.trim() || getDefaultLabelType(draft.featureType),
    originalName: draft.originalName?.trim() || null,
    displayName: draft.displayName.trim(),
    aliasNames: (draft.aliasNames || EMPTY_ALIAS_NAMES)
      .map((item) => item.trim())
      .filter((item, index, source) => Boolean(item) && source.indexOf(item) === index),
    pointLongitude: Number(draft.pointLongitude),
    pointLatitude: Number(draft.pointLatitude),
    minZoom: Number(draft.minZoom),
    maxZoom: Number(draft.maxZoom),
    priority: Number(draft.priority),
    textColor: draft.textColor?.trim() || null,
    haloColor: draft.haloColor?.trim() || null,
    status: Number(draft.status),
    source: draft.source?.trim() || DEFAULT_MANUAL_SOURCE,
    remark: draft.remark?.trim() || null
  };
}

export function createDraftFromContext(context: EditableMapLabelContext, existing?: MapLabel | null): EditableMapLabelDraft {
  const featureType = normalizeFeatureType(existing?.featureType ?? context.featureType);
  return {
    id: existing?.id ?? null,
    featureType,
    sourceFeatureId: existing?.sourceFeatureId ?? context.sourceFeatureId ?? null,
    sourceLayer: existing?.sourceLayer ?? context.sourceLayer ?? null,
    labelType: existing?.labelType ?? context.labelType ?? getDefaultLabelType(featureType),
    originalName: existing?.originalName ?? context.originalName ?? null,
    displayName: resolvePreferredName({
      manualDisplayName: existing?.displayName,
      overrideDisplayName: context.suggestedDisplayName,
      businessDisplayName: context.originalName
    }),
    aliasNames: existing?.aliasNames ?? [],
    pointLongitude: existing?.pointLongitude ?? context.pointLongitude,
    pointLatitude: existing?.pointLatitude ?? context.pointLatitude,
    minZoom: existing?.minZoom ?? getDefaultMinZoom(featureType),
    maxZoom: existing?.maxZoom ?? getDefaultMaxZoom(featureType),
    priority: existing?.priority ?? getDefaultPriority(featureType),
    textColor: existing?.textColor ?? DEFAULT_TEXT_COLOR,
    haloColor: existing?.haloColor ?? DEFAULT_HALO_COLOR,
    status: existing?.status ?? 1,
    source: existing?.source ?? DEFAULT_MANUAL_SOURCE,
    remark: existing?.remark ?? null
  };
}

export function createManualPointContext(longitude: number, latitude: number): EditableMapLabelContext {
  return {
    sourceKind: 'manual',
    featureType: 'manual',
    labelType: 'business',
    pointLongitude: longitude,
    pointLatitude: latitude,
    suggestedDisplayName: '',
    sourceLayer: null,
    sourceFeatureId: null,
    originalName: null
  };
}

export function createLabelContextFromBasemapFeature(feature: BasemapInspectableFeature): EditableMapLabelContext {
  return {
    sourceKind: 'basemap',
    featureType: normalizeFeatureType(feature.featureType),
    labelType: feature.labelType as MapLabelLayerType,
    sourceFeatureId: feature.sourceFeatureId ?? null,
    sourceLayer: feature.sourceLayer ?? null,
    originalName: feature.originalName ?? null,
    suggestedDisplayName: feature.originalName ?? '',
    pointLongitude: feature.pointLongitude,
    pointLatitude: feature.pointLatitude,
    geometryGeoJson: feature.geometryGeoJson ?? null
  };
}

export function createLabelContextFromFocusTarget(target: MapFocusTarget): EditableMapLabelContext {
  const featureType = target.entityType;
  const center = getFocusTargetCenter(target);
  return {
    sourceKind: 'business',
    entityType: target.entityType,
    entityId: target.id,
    featureType,
    labelType: getDefaultLabelType(featureType),
    sourceFeatureId: String(target.id),
    sourceLayer: getBusinessLabelSourceLayer(featureType),
    originalName: resolvePreferredName({
      overrideDisplayName: 'displayName' in target ? (target as Record<string, unknown>).displayName as string | undefined : undefined,
      businessDisplayName: target.name
    }),
    suggestedDisplayName: target.name,
    pointLongitude: center?.[0] ?? 0,
    pointLatitude: center?.[1] ?? 0,
    geometryGeoJson: 'geometryGeoJson' in target ? target.geometryGeoJson ?? null : null
  };
}

export function getFocusTargetCenter(target: MapFocusTarget): [number, number] | null {
  if (target.entityType === 'shop' || target.entityType === 'poi') {
    return [target.longitude, target.latitude];
  }

  if (
    target.entityType === 'place' &&
    typeof target.centerLongitude === 'number' &&
    typeof target.centerLatitude === 'number'
  ) {
    return [target.centerLongitude, target.centerLatitude];
  }

  const geometry = 'geometryGeoJson' in target ? parseGeometryGeoJson(target.geometryGeoJson) : null;
  return geometry ? getGeometryCenter(geometry) : null;
}

export function getFeaturePosition<TProperties extends {
  centerLongitude?: number | null;
  centerLatitude?: number | null;
  geometryGeoJson?: string | null;
}>(
  feature: Feature<Geometry, TProperties>
): [number, number] | null {
  if (feature.geometry.type === 'Point') {
    return feature.geometry.coordinates as [number, number];
  }

  const centerLongitude = feature.properties?.centerLongitude;
  const centerLatitude = feature.properties?.centerLatitude;
  if (typeof centerLongitude === 'number' && typeof centerLatitude === 'number') {
    return [centerLongitude, centerLatitude];
  }

  const geometry = feature.properties?.geometryGeoJson
    ? parseGeometryGeoJson(feature.properties.geometryGeoJson)
    : feature.geometry;

  return geometry ? getGeometryCenter(geometry) : null;
}

export function getLabelTextFromFeatureProperties(properties: Record<string, unknown> | null | undefined): string {
  if (!properties) {
    return '';
  }

  const displayName = typeof properties.displayName === 'string' ? properties.displayName : null;
  const businessName = typeof properties.name === 'string' ? properties.name : null;
  const nameZh = typeof properties['name:zh'] === 'string' ? properties['name:zh'] as string : null;
  const nameEn = typeof properties.name_en === 'string' ? properties.name_en : null;
  const ref = typeof properties.ref === 'string' ? properties.ref : null;

  return resolvePreferredName({
    overrideDisplayName: displayName,
    businessDisplayName: businessName,
    nameZh,
    nameEn,
    ref
  });
}

export function isLabelVisibleForLayer(featureType: string, visibility: Record<string, boolean>): boolean {
  switch (normalizeFeatureType(featureType)) {
    case 'shop':
      return visibility.shops;
    case 'area':
      return visibility.areas;
    case 'poi':
      return visibility.pois;
    case 'place':
      return visibility.places;
    case 'boundary':
      return visibility.boundaries;
    default:
      return true;
  }
}

export function toEntityId(value: string | number | undefined | null): EntityId | null {
  if (value === undefined || value === null) {
    return null;
  }

  return typeof value === 'number' || typeof value === 'string' ? value : null;
}

export function getFeatureIdentifier(properties: Record<string, unknown> | null | undefined, featureId: string | number | undefined): string | null {
  if (isMeaningfulString(properties?.businessId as string | undefined)) {
    return String(properties?.businessId).trim();
  }

  if (isMeaningfulString(properties?.sourceId as string | undefined)) {
    return String(properties?.sourceId).trim();
  }

  if (featureId !== undefined && featureId !== null && String(featureId).trim()) {
    return String(featureId).trim();
  }

  return null;
}

export function normalizeCoordinate(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function createPointFeature<TProperties>(coordinates: Position, properties: TProperties, id?: string | number | null): Feature<Point, TProperties> {
  return {
    type: 'Feature',
    id: id ?? undefined,
    properties,
    geometry: {
      type: 'Point',
      coordinates: [coordinates[0], coordinates[1]]
    }
  };
}
