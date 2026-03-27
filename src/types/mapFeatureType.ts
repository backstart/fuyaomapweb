export interface MapFeatureCategoryDefinition {
  categoryCode: string;
  categoryName: string;
  description?: string | null;
  sortOrder: number;
}

export interface MapFeatureTypeDefinition {
  categoryCode: string;
  categoryName: string;
  typeCode: string;
  typeName: string;
  geometryType: string;
  renderType: string;
  iconKey?: string | null;
  styleKey?: string | null;
  defaultMinZoom?: number | null;
  defaultMaxZoom?: number | null;
  defaultPriority?: number | null;
  sourceTypes: string[];
  legacyAliases: string[];
}

export interface MapFeatureSchema {
  generatedAtUtc: string;
  categories: MapFeatureCategoryDefinition[];
  types: MapFeatureTypeDefinition[];
}
