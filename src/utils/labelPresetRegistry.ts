import type { EditableMapLabelDraft, MapLabelFeatureType, MapLabelLayerType } from '@/types/mapLabel';
import type { MapFeatureTypeDefinition } from '@/types/mapFeatureType';

export const DEFAULT_LABEL_TEXT_COLOR = '#314155';
export const DEFAULT_LABEL_HALO_COLOR = 'rgba(255, 255, 255, 0.96)';

export interface LabelFeatureTypeOption {
  value: MapLabelFeatureType;
  label: string;
  description: string;
  defaultLabelType: MapLabelLayerType;
  minZoom: number;
  maxZoom: number;
  priority: number;
}

export interface LabelPurposeOption {
  value: MapLabelLayerType;
  label: string;
  description: string;
}

export interface LabelEditorPreset {
  labelType: MapLabelLayerType;
  minZoom: number;
  maxZoom: number;
  priority: number;
  textColor: string;
  haloColor: string;
}

const FEATURE_TYPE_OPTIONS: LabelFeatureTypeOption[] = [
  { value: 'shop', label: '店铺', description: '给店铺、商户或服务门店补充名称。', defaultLabelType: 'business', minZoom: 13, maxZoom: 24, priority: 238 },
  { value: 'poi', label: 'POI 点位', description: '给机构、设施、停车场、景点等点位补充名称。', defaultLabelType: 'business', minZoom: 13, maxZoom: 24, priority: 230 },
  { value: 'place', label: '聚落/地名', description: '给村庄、社区、小区、园区等地名对象补充名称。', defaultLabelType: 'business', minZoom: 10, maxZoom: 22, priority: 205 },
  { value: 'area', label: '区域面', description: '给区域面对象补充名称，适合园区、片区等。', defaultLabelType: 'business', minZoom: 11, maxZoom: 22, priority: 190 },
  { value: 'boundary', label: '行政区/边界', description: '给行政区或边界对象补充区划名称。', defaultLabelType: 'business', minZoom: 8, maxZoom: 20, priority: 260 },
  { value: 'road', label: '道路/街巷', description: '给已有道路对象补充道路名称。', defaultLabelType: 'road', minZoom: 11, maxZoom: 24, priority: 220 },
  { value: 'building', label: '建筑', description: '给建筑物或楼栋补充名称。', defaultLabelType: 'building', minZoom: 15, maxZoom: 24, priority: 240 },
  { value: 'house', label: '房屋', description: '给房屋、楼栋或独立建筑补充名称。', defaultLabelType: 'building', minZoom: 16, maxZoom: 24, priority: 250 },
  { value: 'courtyard', label: '院落', description: '给院落、宅基地或内部小范围建筑群补充名称。', defaultLabelType: 'building', minZoom: 16, maxZoom: 24, priority: 248 },
  { value: 'manual', label: '自定义点位', description: '不依赖现有对象，在任意位置创建自定义点位标注。', defaultLabelType: 'business', minZoom: 13, maxZoom: 24, priority: 210 }
];

const LABEL_PURPOSE_OPTIONS: LabelPurposeOption[] = [
  { value: 'business', label: '通用名称', description: '适合 POI、聚落、行政区和自定义点位等通用名称显示。' },
  { value: 'road', label: '道路名称', description: '按道路名称规则显示，适合街巷、主次干道等名称。' },
  { value: 'building', label: '建筑名称', description: '按建筑名称规则显示，适合楼栋、建筑群和院落名称。' }
];

const FEATURE_TYPE_MAP = new Map(FEATURE_TYPE_OPTIONS.map((item) => [item.value, item] as const));
const LABEL_PURPOSE_MAP = new Map(LABEL_PURPOSE_OPTIONS.map((item) => [item.value, item] as const));

const TYPE_CODE_PRESETS: Record<string, Partial<LabelEditorPreset>> = {
  administrative_boundary: { minZoom: 7, maxZoom: 18, priority: 270, textColor: '#475666' },
  town_boundary: { minZoom: 9, maxZoom: 19, priority: 240, textColor: '#4e5f71' },
  settlement_name: { minZoom: 10, maxZoom: 22, priority: 205, textColor: '#475666' },
  road_name: { labelType: 'road', minZoom: 11, maxZoom: 24, priority: 220, textColor: '#5a6676' },
  water_name: { minZoom: 9, maxZoom: 22, priority: 214, textColor: '#4d82b8' },
  building_name: { labelType: 'building', minZoom: 15, maxZoom: 24, priority: 240, textColor: '#364152' },
  poi_generic: { minZoom: 13, maxZoom: 24, priority: 230, textColor: '#3f4f61' },
  manual_annotation: { minZoom: 13, maxZoom: 24, priority: 210, textColor: DEFAULT_LABEL_TEXT_COLOR }
};

function normalizeFeatureType(featureType: string | null | undefined): MapLabelFeatureType {
  const normalized = featureType?.trim().toLowerCase();
  return (normalized || 'manual') as MapLabelFeatureType;
}

function normalizeLabelPurpose(value: string | null | undefined): MapLabelLayerType {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'road' || normalized === 'building') {
    return normalized;
  }

  return 'business';
}

function resolvePurposeFromRenderType(renderType: string | null | undefined): MapLabelLayerType | null {
  switch (renderType?.trim().toLowerCase()) {
    case 'label-road-name':
      return 'road';
    case 'label-building-name':
      return 'building';
    default:
      return null;
  }
}

function resolveKeywordPreset(typeCode: string | null | undefined): Partial<LabelEditorPreset> | null {
  const normalized = typeCode?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (TYPE_CODE_PRESETS[normalized]) {
    return TYPE_CODE_PRESETS[normalized];
  }

  if (normalized.includes('boundary') || normalized.includes('district') || normalized.includes('county')) {
    return { minZoom: 8, maxZoom: 20, priority: 255, textColor: '#475666' };
  }

  if (normalized.includes('settlement') || normalized.includes('village') || normalized.includes('community') || normalized.includes('compound') || normalized.includes('park')) {
    return { minZoom: 10, maxZoom: 22, priority: 205, textColor: '#475666' };
  }

  if (normalized.includes('road') || normalized.includes('street') || normalized.includes('avenue')) {
    return { labelType: 'road', minZoom: 11, maxZoom: 24, priority: 220, textColor: '#5a6676' };
  }

  if (normalized.includes('water') || normalized.includes('river') || normalized.includes('lake') || normalized.includes('reservoir')) {
    return { minZoom: 9, maxZoom: 22, priority: 214, textColor: '#4d82b8' };
  }

  if (normalized.includes('building') || normalized.includes('house') || normalized.includes('courtyard') || normalized.includes('block')) {
    return { labelType: 'building', minZoom: 15, maxZoom: 24, priority: 240, textColor: '#364152' };
  }

  if (normalized.includes('hospital') || normalized.includes('clinic')) {
    return { minZoom: 12, maxZoom: 24, priority: 252, textColor: '#3f4f61' };
  }

  if (normalized.includes('school') || normalized.includes('kindergarten')) {
    return { minZoom: 12, maxZoom: 23, priority: 246, textColor: '#3f4f61' };
  }

  if (normalized.includes('hotel') || normalized.includes('lodging') || normalized.includes('homestay')) {
    return { minZoom: 13, maxZoom: 24, priority: 244, textColor: '#3f4f61' };
  }

  if (normalized.includes('restaurant') || normalized.includes('food')) {
    return { minZoom: 13, maxZoom: 24, priority: 236, textColor: '#3f4f61' };
  }

  if (normalized.includes('bank')) {
    return { minZoom: 13, maxZoom: 24, priority: 238, textColor: '#3f4f61' };
  }

  if (normalized.includes('parking') || normalized.includes('fuel')) {
    return { minZoom: 13, maxZoom: 24, priority: 222, textColor: '#3f4f61' };
  }

  if (normalized.includes('tourism') || normalized.includes('scenic')) {
    return { minZoom: 11, maxZoom: 22, priority: 225, textColor: '#3f4f61' };
  }

  return null;
}

function shouldReplacePresetValue(current: unknown, previous: unknown, force = false): boolean {
  if (force) {
    return true;
  }

  if (current === null || current === undefined || current === '') {
    return true;
  }

  if (previous === null || previous === undefined || previous === '') {
    return false;
  }

  return current === previous;
}

export function getLabelFeatureTypeOptions(): LabelFeatureTypeOption[] {
  return FEATURE_TYPE_OPTIONS;
}

export function getLabelPurposeOptions(): LabelPurposeOption[] {
  return LABEL_PURPOSE_OPTIONS;
}

export function getLabelFeatureTypeLabel(featureType: string | null | undefined): string {
  return FEATURE_TYPE_MAP.get(normalizeFeatureType(featureType))?.label ?? '自定义点位';
}

export function getLabelFeatureTypeDescription(featureType: string | null | undefined): string {
  return FEATURE_TYPE_MAP.get(normalizeFeatureType(featureType))?.description ?? '在地图上创建自定义点位标注。';
}

export function getLabelPurposeLabel(labelType: string | null | undefined): string {
  return LABEL_PURPOSE_MAP.get(normalizeLabelPurpose(labelType))?.label ?? '通用名称';
}

export function getLabelPurposeDescription(labelType: string | null | undefined): string {
  return LABEL_PURPOSE_MAP.get(normalizeLabelPurpose(labelType))?.description ?? '适合通用名称的地图显示。';
}

export function resolveLabelEditorPreset(options: {
  featureType?: string | null;
  typeCode?: string | null;
  labelType?: string | null;
  definition?: MapFeatureTypeDefinition | null;
}): LabelEditorPreset {
  const featureType = normalizeFeatureType(options.featureType);
  const featureMeta = FEATURE_TYPE_MAP.get(featureType) ?? FEATURE_TYPE_MAP.get('manual')!;
  const keywordPreset = resolveKeywordPreset(options.typeCode);
  const renderPurpose = resolvePurposeFromRenderType(options.definition?.renderType);
  const schemaPurpose = renderPurpose ?? null;

  const preset: LabelEditorPreset = {
    labelType: featureMeta.defaultLabelType,
    minZoom: featureMeta.minZoom,
    maxZoom: featureMeta.maxZoom,
    priority: featureMeta.priority,
    textColor: DEFAULT_LABEL_TEXT_COLOR,
    haloColor: DEFAULT_LABEL_HALO_COLOR
  };

  if (typeof options.definition?.defaultMinZoom === 'number') {
    preset.minZoom = options.definition.defaultMinZoom;
  }

  if (typeof options.definition?.defaultMaxZoom === 'number') {
    preset.maxZoom = options.definition.defaultMaxZoom;
  }

  if (typeof options.definition?.defaultPriority === 'number') {
    preset.priority = options.definition.defaultPriority;
  }

  if (schemaPurpose) {
    preset.labelType = schemaPurpose;
  } else if (options.labelType) {
    preset.labelType = normalizeLabelPurpose(options.labelType);
  }

  if (keywordPreset) {
    preset.labelType = keywordPreset.labelType ?? preset.labelType;
    preset.minZoom = keywordPreset.minZoom ?? preset.minZoom;
    preset.maxZoom = keywordPreset.maxZoom ?? preset.maxZoom;
    preset.priority = keywordPreset.priority ?? preset.priority;
    preset.textColor = keywordPreset.textColor ?? preset.textColor;
    preset.haloColor = keywordPreset.haloColor ?? preset.haloColor;
  }

  return preset;
}

export function applyLabelEditorPreset(
  draft: EditableMapLabelDraft,
  nextPreset: LabelEditorPreset,
  options?: {
    previousPreset?: LabelEditorPreset | null;
    force?: boolean;
  }
): EditableMapLabelDraft {
  const previous = options?.previousPreset ?? null;
  const force = options?.force ?? false;

  return {
    ...draft,
    labelType: shouldReplacePresetValue(draft.labelType, previous?.labelType, force)
      ? nextPreset.labelType
      : normalizeLabelPurpose(draft.labelType),
    minZoom: shouldReplacePresetValue(draft.minZoom, previous?.minZoom, force)
      ? nextPreset.minZoom
      : draft.minZoom,
    maxZoom: shouldReplacePresetValue(draft.maxZoom, previous?.maxZoom, force)
      ? nextPreset.maxZoom
      : draft.maxZoom,
    priority: shouldReplacePresetValue(draft.priority, previous?.priority, force)
      ? nextPreset.priority
      : draft.priority,
    textColor: shouldReplacePresetValue(draft.textColor ?? null, previous?.textColor ?? null, force)
      ? nextPreset.textColor
      : draft.textColor,
    haloColor: shouldReplacePresetValue(draft.haloColor ?? null, previous?.haloColor ?? null, force)
      ? nextPreset.haloColor
      : draft.haloColor
  };
}
