import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { DrawnBuildingArea } from '@/types/drawnBuilding';
import type { MapLabel } from '@/types/mapLabel';

type SemanticFeatureProperties = {
  categoryCode?: string | null;
  typeCode?: string | null;
};

export function matchesSemanticTypeFilter(
  typeCode: string | null | undefined,
  selectedTypeCode: string | null | undefined
): boolean {
  if (!selectedTypeCode) {
    return true;
  }

  return typeCode === selectedTypeCode;
}

export function filterFeatureCollectionBySemanticType<TGeometry extends Geometry, TProperties extends SemanticFeatureProperties>(
  collection: FeatureCollection<TGeometry, TProperties>,
  selectedTypeCode: string | null | undefined
): FeatureCollection<TGeometry, TProperties> {
  if (!selectedTypeCode) {
    return collection;
  }

  return {
    ...collection,
    features: collection.features.filter((feature: Feature<TGeometry, TProperties>) =>
      matchesSemanticTypeFilter(feature.properties?.typeCode, selectedTypeCode))
  };
}

export function filterLabelsBySemanticType(
  labels: MapLabel[],
  selectedTypeCode: string | null | undefined
): MapLabel[] {
  if (!selectedTypeCode) {
    return labels;
  }

  return labels.filter((label) => matchesSemanticTypeFilter(label.typeCode, selectedTypeCode));
}

export function filterDrawnBuildingAreasBySemanticType(
  areas: DrawnBuildingArea[],
  selectedTypeCode: string | null | undefined
): DrawnBuildingArea[] {
  if (!selectedTypeCode) {
    return areas;
  }

  return areas.filter((area) => matchesSemanticTypeFilter(area.typeCode, selectedTypeCode));
}
