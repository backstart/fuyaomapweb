import type { MapFeatureSchema, MapFeatureTypeDefinition } from '@/types/mapFeatureType';
import type { MapLabelLayerType } from '@/types/mapLabel';

export interface FeatureTypeOptionGroup {
  categoryCode: string;
  categoryName: string;
  options: MapFeatureTypeDefinition[];
}

const DEFAULT_LABEL_TYPE_CODE_BY_FEATURE: Record<string, string> = {
  road: 'road_name',
  building: 'building_name',
  house: 'building_name',
  courtyard: 'building_name',
  place: 'settlement_name',
  boundary: 'administrative_boundary',
  manual: 'manual_annotation',
  shop: 'poi_generic',
  poi: 'poi_generic',
  area: 'settlement_name'
};

export const DEFAULT_DRAWN_BUILDING_TYPE_CODE = 'building_block';

export function findFeatureTypeDefinition(
  schema: MapFeatureSchema | null | undefined,
  typeCode: string | null | undefined
): MapFeatureTypeDefinition | null {
  if (!schema || !typeCode) {
    return null;
  }

  return schema.types.find((item) => item.typeCode === typeCode) ?? null;
}

export function groupFeatureTypes(
  schema: MapFeatureSchema | null | undefined,
  predicate?: (definition: MapFeatureTypeDefinition) => boolean
): FeatureTypeOptionGroup[] {
  if (!schema) {
    return [];
  }

  return schema.categories
    .map((category) => ({
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      options: schema.types.filter((item) =>
        item.categoryCode === category.categoryCode && (!predicate || predicate(item)))
    }))
    .filter((group) => group.options.length > 0);
}

export function getDefaultTypeCodeForLabelFeature(featureType: string | null | undefined): string | null {
  if (!featureType) {
    return null;
  }

  return DEFAULT_LABEL_TYPE_CODE_BY_FEATURE[featureType.trim().toLowerCase()] ?? null;
}

export function getLabelLayerTypeFromRenderType(renderType: string | null | undefined): MapLabelLayerType {
  switch (renderType?.trim().toLowerCase()) {
    case 'label-road-name':
      return 'road';
    case 'label-building-name':
      return 'building';
    default:
      return 'business';
  }
}
