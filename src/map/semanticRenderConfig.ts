import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { DrawnBuildingArea } from '@/types/drawnBuilding';
import type { MapFeatureSchema, MapFeatureTypeDefinition } from '@/types/mapFeatureType';
import type { MapLabel } from '@/types/mapLabel';
import type { SemanticRenderProperties } from '@/types/semanticRender';
import { findFeatureTypeDefinition } from '@/utils/mapFeatureTypes';

type GeometryKind = 'point' | 'line' | 'polygon';
type RenderState = 'default' | 'selected' | 'editing';

interface PointStyleToken {
  markerColor: string;
  markerStrokeColor: string;
  markerGlyph: string | null;
  markerGlyphColor: string;
  markerOpacity: number;
  markerRadius: number;
}

interface PolygonStyleToken {
  fillColorHint: string;
  fillOpacityHint: number;
  lineColorHint: string;
  lineWidthHint: number;
  lineOpacityHint: number;
  lineDashKey?: string | null;
}

interface LineStyleToken {
  lineColorHint: string;
  lineWidthHint: number;
  lineOpacityHint: number;
  lineDashKey?: string | null;
}

interface TextStyleToken {
  textStyleKey: string;
  textColor: string;
  haloColor: string;
  textSize: number;
  textRadialOffset: number;
  textLetterSpacing: number;
}

interface SemanticVisualDefinition {
  typeCode?: string | null;
  typeName?: string | null;
  iconKey?: string | null;
  styleKey?: string | null;
  renderType: string;
  geometryType: GeometryKind;
  minZoom: number;
  maxZoom: number;
  priority: number;
}

interface SemanticRenderInput {
  sourceType: string;
  categoryCode?: string | null;
  typeCode?: string | null;
  renderType?: string | null;
  geometryType?: string | null;
  state?: RenderState;
}

const DEFAULT_POINT_STYLE: PointStyleToken = {
  markerColor: '#3784d6',
  markerStrokeColor: '#ffffff',
  markerGlyph: 'P',
  markerGlyphColor: '#ffffff',
  markerOpacity: 0.94,
  markerRadius: 6.2
};

const DEFAULT_POLYGON_STYLE: PolygonStyleToken = {
  fillColorHint: 'rgba(90, 142, 230, 0.14)',
  fillOpacityHint: 0.14,
  lineColorHint: '#4478d6',
  lineWidthHint: 1.8,
  lineOpacityHint: 0.9,
  lineDashKey: null
};

const DEFAULT_LINE_STYLE: LineStyleToken = {
  lineColorHint: '#5f7a96',
  lineWidthHint: 2,
  lineOpacityHint: 0.92,
  lineDashKey: null
};

const DEFAULT_TEXT_STYLE: TextStyleToken = {
  textStyleKey: 'label-poi-name',
  textColor: '#41505f',
  haloColor: 'rgba(255, 255, 255, 0.96)',
  textSize: 11.6,
  textRadialOffset: 0.52,
  textLetterSpacing: 0
};

const POINT_STYLE_TOKENS: Record<string, PointStyleToken> = {
  'public-government': { markerColor: '#35506f', markerStrokeColor: '#eef4fb', markerGlyph: 'G', markerGlyphColor: '#ffffff', markerOpacity: 0.96, markerRadius: 6.8 },
  'public-service-center': { markerColor: '#466ab0', markerStrokeColor: '#edf3ff', markerGlyph: 'S', markerGlyphColor: '#ffffff', markerOpacity: 0.96, markerRadius: 6.7 },
  'public-police': { markerColor: '#2f4061', markerStrokeColor: '#edf2f7', markerGlyph: 'P', markerGlyphColor: '#ffffff', markerOpacity: 0.96, markerRadius: 6.7 },
  'commerce-mall': { markerColor: '#f08d2d', markerStrokeColor: '#fff5e8', markerGlyph: 'M', markerGlyphColor: '#ffffff', markerOpacity: 0.95, markerRadius: 6.8 },
  'commerce-supermarket': { markerColor: '#2f8c5b', markerStrokeColor: '#eefaf3', markerGlyph: 'S', markerGlyphColor: '#ffffff', markerOpacity: 0.95, markerRadius: 6.5 },
  'commerce-bank': { markerColor: '#147e78', markerStrokeColor: '#ecfbf9', markerGlyph: 'B', markerGlyphColor: '#ffffff', markerOpacity: 0.95, markerRadius: 6.4 },
  'lodging-hotel': { markerColor: '#6b5bd2', markerStrokeColor: '#f2efff', markerGlyph: 'H', markerGlyphColor: '#ffffff', markerOpacity: 0.96, markerRadius: 6.9 },
  'lodging-homestay': { markerColor: '#8d67cf', markerStrokeColor: '#f4effc', markerGlyph: 'H', markerGlyphColor: '#ffffff', markerOpacity: 0.95, markerRadius: 6.5 },
  'food-restaurant': { markerColor: '#e46b53', markerStrokeColor: '#fff0eb', markerGlyph: 'R', markerGlyphColor: '#ffffff', markerOpacity: 0.95, markerRadius: 6.7 },
  'health-hospital': { markerColor: '#da5868', markerStrokeColor: '#fff0f2', markerGlyph: '+', markerGlyphColor: '#ffffff', markerOpacity: 0.96, markerRadius: 6.9 },
  'education-school': { markerColor: '#3072c3', markerStrokeColor: '#eef5ff', markerGlyph: 'S', markerGlyphColor: '#ffffff', markerOpacity: 0.95, markerRadius: 6.7 },
  'education-kindergarten': { markerColor: '#ef6ea2', markerStrokeColor: '#fff0f6', markerGlyph: 'K', markerGlyphColor: '#ffffff', markerOpacity: 0.95, markerRadius: 6.5 },
  'transport-parking': { markerColor: '#4d6785', markerStrokeColor: '#eff4fa', markerGlyph: 'P', markerGlyphColor: '#ffffff', markerOpacity: 0.94, markerRadius: 6.1 },
  'transport-bus-stop': { markerColor: '#1d9ab0', markerStrokeColor: '#ecfafe', markerGlyph: 'B', markerGlyphColor: '#ffffff', markerOpacity: 0.94, markerRadius: 6.1 },
  'transport-subway': { markerColor: '#6858d1', markerStrokeColor: '#f0edff', markerGlyph: 'M', markerGlyphColor: '#ffffff', markerOpacity: 0.95, markerRadius: 6.5 },
  'tourism-scenic': { markerColor: '#d18a20', markerStrokeColor: '#fff7e8', markerGlyph: '*', markerGlyphColor: '#ffffff', markerOpacity: 0.95, markerRadius: 6.3 },
  'poi-generic': { markerColor: '#2e89c8', markerStrokeColor: '#edf7ff', markerGlyph: 'P', markerGlyphColor: '#ffffff', markerOpacity: 0.94, markerRadius: 6.1 },
  'label-manual': { markerColor: '#4d5d73', markerStrokeColor: '#f3f5f8', markerGlyph: 'L', markerGlyphColor: '#ffffff', markerOpacity: 0.92, markerRadius: 5.8 },
  'settlement-village': { markerColor: '#5d7d64', markerStrokeColor: '#eef7ef', markerGlyph: null, markerGlyphColor: '#ffffff', markerOpacity: 0.9, markerRadius: 5.2 },
  'settlement-community': { markerColor: '#58708a', markerStrokeColor: '#eef4fb', markerGlyph: null, markerGlyphColor: '#ffffff', markerOpacity: 0.9, markerRadius: 5.4 }
};

const POLYGON_STYLE_TOKENS: Record<string, PolygonStyleToken> = {
  'natural-park': { fillColorHint: 'rgba(121, 187, 116, 0.16)', fillOpacityHint: 0.16, lineColorHint: '#6da862', lineWidthHint: 1.8, lineOpacityHint: 0.86 },
  'water-lake': { fillColorHint: 'rgba(114, 176, 228, 0.18)', fillOpacityHint: 0.18, lineColorHint: '#5ea7dc', lineWidthHint: 1.7, lineOpacityHint: 0.88 },
  'water-reservoir': { fillColorHint: 'rgba(88, 161, 224, 0.2)', fillOpacityHint: 0.2, lineColorHint: '#4e99db', lineWidthHint: 1.8, lineOpacityHint: 0.88 },
  'settlement-compound': { fillColorHint: 'rgba(120, 164, 116, 0.12)', fillOpacityHint: 0.12, lineColorHint: '#69a16a', lineWidthHint: 1.6, lineOpacityHint: 0.84 },
  'building-industrial-park': { fillColorHint: 'rgba(211, 165, 78, 0.14)', fillOpacityHint: 0.14, lineColorHint: '#bf8b3b', lineWidthHint: 1.8, lineOpacityHint: 0.88 },
  'building-office': { fillColorHint: 'rgba(114, 124, 196, 0.14)', fillOpacityHint: 0.14, lineColorHint: '#6675c8', lineWidthHint: 1.8, lineOpacityHint: 0.88 },
  'building-block': { fillColorHint: 'rgba(70, 141, 247, 0.18)', fillOpacityHint: 0.18, lineColorHint: '#2f7df6', lineWidthHint: 2.2, lineOpacityHint: 0.96 },
  'boundary-admin': { fillColorHint: 'rgba(141, 106, 74, 0.06)', fillOpacityHint: 0.06, lineColorHint: '#8d6a4a', lineWidthHint: 1.9, lineOpacityHint: 0.86, lineDashKey: 'boundary' },
  'boundary-town': { fillColorHint: 'rgba(166, 126, 88, 0.04)', fillOpacityHint: 0.04, lineColorHint: '#ab835c', lineWidthHint: 1.6, lineOpacityHint: 0.82, lineDashKey: 'boundary-light' },
  'water-river': { fillColorHint: 'rgba(102, 170, 226, 0.14)', fillOpacityHint: 0.14, lineColorHint: '#5ea7dc', lineWidthHint: 1.6, lineOpacityHint: 0.82 },
  'label-manual': { fillColorHint: 'rgba(84, 101, 122, 0.08)', fillOpacityHint: 0.08, lineColorHint: '#55657a', lineWidthHint: 1.6, lineOpacityHint: 0.86 }
};

const LINE_STYLE_TOKENS: Record<string, LineStyleToken> = {
  'boundary-admin': { lineColorHint: '#8d6a4a', lineWidthHint: 1.9, lineOpacityHint: 0.88, lineDashKey: 'boundary' },
  'boundary-town': { lineColorHint: '#ab835c', lineWidthHint: 1.6, lineOpacityHint: 0.82, lineDashKey: 'boundary-light' },
  'water-river': { lineColorHint: '#5ea7dc', lineWidthHint: 1.8, lineOpacityHint: 0.88 },
  'road-expressway': { lineColorHint: '#c89a4d', lineWidthHint: 2.6, lineOpacityHint: 0.92 },
  'road-primary': { lineColorHint: '#d8a357', lineWidthHint: 2.2, lineOpacityHint: 0.9 },
  'road-secondary': { lineColorHint: '#b6b9bf', lineWidthHint: 1.8, lineOpacityHint: 0.88 },
  'road-local': { lineColorHint: '#cfd4da', lineWidthHint: 1.4, lineOpacityHint: 0.82 }
};

const TEXT_STYLE_TOKENS: Record<string, TextStyleToken> = {
  'label-road-name': { textStyleKey: 'label-road-name', textColor: '#5a6676', haloColor: 'rgba(255, 255, 255, 0.96)', textSize: 11.4, textRadialOffset: 0.1, textLetterSpacing: 0.02 },
  'label-water-name': { textStyleKey: 'label-water-name', textColor: '#4d82b8', haloColor: 'rgba(255, 255, 255, 0.94)', textSize: 11.6, textRadialOffset: 0.22, textLetterSpacing: 0.03 },
  'label-settlement-name': { textStyleKey: 'label-settlement-name', textColor: '#475666', haloColor: 'rgba(246, 244, 239, 0.95)', textSize: 13.2, textRadialOffset: 0.18, textLetterSpacing: 0.015 },
  'label-building-name': { textStyleKey: 'label-building-name', textColor: '#364152', haloColor: 'rgba(246, 244, 239, 0.96)', textSize: 11.8, textRadialOffset: 0.34, textLetterSpacing: 0.01 },
  'label-poi-name': { textStyleKey: 'label-poi-name', textColor: '#3f4f61', haloColor: 'rgba(255, 255, 255, 0.96)', textSize: 11.2, textRadialOffset: 0.56, textLetterSpacing: 0 },
  'label-manual': { textStyleKey: 'label-manual', textColor: '#314155', haloColor: 'rgba(255, 255, 255, 0.96)', textSize: 11.6, textRadialOffset: 0.46, textLetterSpacing: 0 }
};

function normalizeGeometryKind(value: string | null | undefined): GeometryKind {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized.includes('line')) {
    return 'line';
  }

  if (normalized.includes('polygon')) {
    return 'polygon';
  }

  return 'point';
}

function resolveFallbackRenderType(sourceType: string, geometryType: GeometryKind): string {
  const normalizedSourceType = sourceType.trim().toLowerCase();
  if (normalizedSourceType === 'label') {
    return 'point-label';
  }

  if (normalizedSourceType === 'boundary') {
    return geometryType === 'line' ? 'line-boundary' : 'polygon-fill';
  }

  if (normalizedSourceType === 'area' || normalizedSourceType === 'drawn-building') {
    return 'polygon-fill';
  }

  if (geometryType === 'polygon') {
    return 'polygon-fill';
  }

  if (geometryType === 'line') {
    return 'line-road';
  }

  return 'point-icon';
}

function resolveFallbackStyleKey(sourceType: string, renderType: string, geometryType: GeometryKind): string {
  switch (renderType) {
    case 'label-road-name':
      return 'label-road-name';
    case 'label-water-name':
      return 'label-water-name';
    case 'label-settlement-name':
      return 'label-settlement-name';
    case 'label-building-name':
      return 'label-building-name';
    case 'line-boundary':
      return sourceType === 'boundary' ? 'boundary-admin' : 'boundary-town';
    case 'line-water':
      return 'water-river';
    default:
      break;
  }

  if (geometryType === 'polygon') {
    return sourceType === 'boundary' ? 'boundary-admin' : sourceType === 'drawn-building' ? 'building-block' : 'settlement-compound';
  }

  if (geometryType === 'line') {
    return renderType === 'line-road' ? 'road-local' : 'boundary-admin';
  }

  return sourceType === 'label' ? 'label-manual' : 'poi-generic';
}

function resolveFallbackIconKey(styleKey: string, renderType: string): string | null {
  if (renderType === 'point-label') {
    return null;
  }

  return styleKey === 'label-manual' ? 'pin' : 'poi';
}

function resolveFallbackTextStyleKey(renderType: string, sourceType: string): string {
  switch (renderType) {
    case 'label-road-name':
      return 'label-road-name';
    case 'label-water-name':
      return 'label-water-name';
    case 'label-settlement-name':
      return 'label-settlement-name';
    case 'label-building-name':
      return 'label-building-name';
    default:
      return sourceType === 'label' ? 'label-manual' : 'label-poi-name';
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function applyPointState(token: PointStyleToken, state: RenderState): PointStyleToken {
  if (state === 'editing') {
    return {
      ...token,
      markerColor: '#2563eb',
      markerStrokeColor: '#dbeafe',
      markerOpacity: 0.98,
      markerRadius: token.markerRadius + 1.4
    };
  }

  if (state === 'selected') {
    return {
      ...token,
      markerOpacity: 0.98,
      markerRadius: token.markerRadius + 0.8
    };
  }

  return token;
}

function applyPolygonState(token: PolygonStyleToken, state: RenderState): PolygonStyleToken {
  if (state === 'editing') {
    return {
      ...token,
      fillColorHint: 'rgba(37, 99, 235, 0.22)',
      fillOpacityHint: Math.max(token.fillOpacityHint, 0.2),
      lineColorHint: '#2563eb',
      lineWidthHint: token.lineWidthHint + 1.2,
      lineOpacityHint: 1
    };
  }

  if (state === 'selected') {
    return {
      ...token,
      fillOpacityHint: clamp(token.fillOpacityHint + 0.08, 0.08, 0.32),
      lineWidthHint: token.lineWidthHint + 0.6,
      lineOpacityHint: clamp(token.lineOpacityHint + 0.08, 0.6, 1)
    };
  }

  return token;
}

function applyLineState(token: LineStyleToken, state: RenderState): LineStyleToken {
  if (state === 'editing') {
    return {
      ...token,
      lineColorHint: '#2563eb',
      lineWidthHint: token.lineWidthHint + 1.2,
      lineOpacityHint: 1
    };
  }

  if (state === 'selected') {
    return {
      ...token,
      lineWidthHint: token.lineWidthHint + 0.7,
      lineOpacityHint: clamp(token.lineOpacityHint + 0.08, 0.6, 1)
    };
  }

  return token;
}

function applyTextState(token: TextStyleToken, state: RenderState): TextStyleToken {
  if (state === 'editing') {
    return {
      ...token,
      textColor: '#1f4fa3',
      haloColor: 'rgba(255, 255, 255, 0.98)',
      textSize: token.textSize + 0.6
    };
  }

  if (state === 'selected') {
    return {
      ...token,
      textColor: '#273646',
      textSize: token.textSize + 0.3
    };
  }

  return token;
}

function resolveTypeDefinition(
  schema: MapFeatureSchema | null | undefined,
  typeCode: string | null | undefined
): MapFeatureTypeDefinition | null {
  return findFeatureTypeDefinition(schema, typeCode);
}

function resolveVisualDefinition(schema: MapFeatureSchema | null | undefined, input: SemanticRenderInput): SemanticVisualDefinition {
  const definition = resolveTypeDefinition(schema, input.typeCode);
  const geometryType = normalizeGeometryKind(input.geometryType || definition?.geometryType);
  const renderType = input.renderType || definition?.renderType || resolveFallbackRenderType(input.sourceType, geometryType);
  const styleKey = definition?.styleKey || resolveFallbackStyleKey(input.sourceType, renderType, geometryType);
  const iconKey = definition?.iconKey || resolveFallbackIconKey(styleKey, renderType);

  return {
    typeCode: definition?.typeCode ?? input.typeCode ?? null,
    typeName: definition?.typeName ?? null,
    iconKey,
    styleKey,
    renderType,
    geometryType,
    minZoom: typeof definition?.defaultMinZoom === 'number' ? definition.defaultMinZoom : 0,
    maxZoom: typeof definition?.defaultMaxZoom === 'number' ? definition.defaultMaxZoom : 24,
    priority: typeof definition?.defaultPriority === 'number' ? definition.defaultPriority : 160
  };
}

export function resolveFeatureRenderProperties(
  schema: MapFeatureSchema | null | undefined,
  input: SemanticRenderInput
): SemanticRenderProperties {
  const state = input.state ?? 'default';
  const visual = resolveVisualDefinition(schema, input);
  const textStyleKey = resolveFallbackTextStyleKey(visual.renderType, input.sourceType);
  const pointToken = applyPointState(POINT_STYLE_TOKENS[visual.styleKey || ''] ?? DEFAULT_POINT_STYLE, state);
  const polygonToken = applyPolygonState(POLYGON_STYLE_TOKENS[visual.styleKey || ''] ?? DEFAULT_POLYGON_STYLE, state);
  const lineToken = applyLineState(LINE_STYLE_TOKENS[visual.styleKey || ''] ?? DEFAULT_LINE_STYLE, state);
  const textToken = applyTextState(TEXT_STYLE_TOKENS[textStyleKey] ?? DEFAULT_TEXT_STYLE, state);

  return {
    iconKey: visual.iconKey,
    styleKey: visual.styleKey,
    textStyleKey: textToken.textStyleKey,
    colorHint: pointToken.markerColor,
    semanticMinZoom: visual.minZoom,
    semanticMaxZoom: visual.maxZoom,
    semanticPriority: visual.priority,
    markerColor: pointToken.markerColor,
    markerStrokeColor: pointToken.markerStrokeColor,
    markerGlyph: pointToken.markerGlyph,
    markerGlyphColor: pointToken.markerGlyphColor,
    markerOpacity: pointToken.markerOpacity,
    markerRadius: pointToken.markerRadius,
    fillColorHint: polygonToken.fillColorHint,
    fillOpacityHint: polygonToken.fillOpacityHint,
    lineColorHint: visual.geometryType === 'line' ? lineToken.lineColorHint : polygonToken.lineColorHint,
    lineWidthHint: visual.geometryType === 'line' ? lineToken.lineWidthHint : polygonToken.lineWidthHint,
    lineOpacityHint: visual.geometryType === 'line' ? lineToken.lineOpacityHint : polygonToken.lineOpacityHint,
    lineDashKey: visual.geometryType === 'line' ? lineToken.lineDashKey ?? null : polygonToken.lineDashKey ?? null,
    textColor: textToken.textColor,
    haloColor: textToken.haloColor,
    textSize: textToken.textSize,
    textRadialOffset: textToken.textRadialOffset,
    textLetterSpacing: textToken.textLetterSpacing,
    isSelected: state === 'selected',
    isEditing: state === 'editing'
  };
}

function resolveFeatureIdentifier(feature: Feature<Geometry, Record<string, unknown>>): string | null {
  const properties = feature.properties ?? {};
  const candidates = [properties.labelId, properties.areaId, properties.businessId, properties.sourceId, feature.id];
  const rawId = candidates.find((value) => value !== undefined && value !== null && String(value).trim());
  return rawId === undefined || rawId === null ? null : String(rawId).trim();
}

export function decorateSemanticFeatureCollection<TGeometry extends Geometry, TProperties extends Record<string, unknown>>(
  schema: MapFeatureSchema | null | undefined,
  sourceType: string,
  data: FeatureCollection<TGeometry, TProperties>,
  options?: {
    selectedId?: string | null;
    editingId?: string | null;
  }
): FeatureCollection<TGeometry, TProperties & SemanticRenderProperties> {
  return {
    type: data.type,
    features: data.features.map((feature) => {
      const featureId = resolveFeatureIdentifier(feature as Feature<Geometry, Record<string, unknown>>);
      const state: RenderState = options?.editingId && featureId === options.editingId
        ? 'editing'
        : options?.selectedId && featureId === options.selectedId
          ? 'selected'
          : 'default';
      const properties = (feature.properties ?? {}) as TProperties & Record<string, unknown>;
      const hints = resolveFeatureRenderProperties(schema, {
        sourceType,
        categoryCode: typeof properties.categoryCode === 'string' ? properties.categoryCode : null,
        typeCode: typeof properties.typeCode === 'string' ? properties.typeCode : null,
        renderType: typeof properties.renderType === 'string' ? properties.renderType : null,
        geometryType: typeof properties.geometryType === 'string' ? properties.geometryType : feature.geometry.type,
        state
      });

      return {
        ...feature,
        properties: {
          ...properties,
          ...hints
        }
      };
    })
  };
}

export function resolveLabelRenderProperties(
  schema: MapFeatureSchema | null | undefined,
  label: Pick<MapLabel, 'categoryCode' | 'typeCode' | 'renderType' | 'geometryType' | 'textColor' | 'haloColor' | 'minZoom' | 'maxZoom' | 'priority'>,
  options?: {
    state?: RenderState;
  }
): SemanticRenderProperties {
  const hints = resolveFeatureRenderProperties(schema, {
    sourceType: 'label',
    categoryCode: label.categoryCode,
    typeCode: label.typeCode,
    renderType: label.renderType,
    geometryType: label.geometryType,
    state: options?.state
  });

  return {
    ...hints,
    textColor: label.textColor?.trim() || hints.textColor,
    haloColor: label.haloColor?.trim() || hints.haloColor,
    semanticMinZoom: label.minZoom,
    semanticMaxZoom: label.maxZoom,
    semanticPriority: label.priority
  };
}

export function resolveDrawnBuildingAreaRenderProperties(
  schema: MapFeatureSchema | null | undefined,
  area: Pick<DrawnBuildingArea, 'categoryCode' | 'typeCode' | 'renderType' | 'fillColor' | 'lineColor' | 'lineWidth'>,
  options?: {
    state?: RenderState;
  }
): SemanticRenderProperties {
  const hints = resolveFeatureRenderProperties(schema, {
    sourceType: 'drawn-building',
    categoryCode: area.categoryCode,
    typeCode: area.typeCode,
    renderType: area.renderType,
    geometryType: 'polygon',
    state: options?.state
  });

  return {
    ...hints,
    fillColorHint:
      area.fillColor?.trim() && area.fillColor.trim() !== 'rgba(70, 141, 247, 0.18)'
        ? area.fillColor
        : hints.fillColorHint,
    lineColorHint:
      area.lineColor?.trim() && area.lineColor.trim().toLowerCase() !== '#2f7df6'
        ? area.lineColor
        : hints.lineColorHint,
    lineWidthHint:
      typeof area.lineWidth === 'number' && Math.abs(area.lineWidth - 2.2) > 0.01
        ? area.lineWidth
        : hints.lineWidthHint
  };
}

export function resolveDrawnBuildingLabelRenderProperties(
  schema: MapFeatureSchema | null | undefined,
  area: Pick<DrawnBuildingArea, 'categoryCode' | 'typeCode' | 'renderType'>,
  options?: {
    state?: RenderState;
  }
): SemanticRenderProperties {
  return resolveFeatureRenderProperties(schema, {
    sourceType: 'label',
    categoryCode: area.categoryCode,
    typeCode: area.typeCode,
    renderType: area.renderType === 'polygon-fill' ? 'label-building-name' : area.renderType,
    geometryType: 'point',
    state: options?.state
  });
}

export function getLabelSemanticDefaults(definition: MapFeatureTypeDefinition | null | undefined): Pick<SemanticRenderProperties, 'textColor' | 'haloColor' | 'semanticMinZoom' | 'semanticMaxZoom' | 'semanticPriority'> {
  if (!definition) {
    return {};
  }

  return resolveFeatureRenderProperties(
    {
      generatedAtUtc: '',
      categories: [],
      types: [definition]
    },
    {
      sourceType: 'label',
      typeCode: definition.typeCode,
      renderType: definition.renderType,
      geometryType: definition.geometryType
    }
  );
}

export function getDrawnBuildingSemanticDefaults(definition: MapFeatureTypeDefinition | null | undefined): Pick<SemanticRenderProperties, 'fillColorHint' | 'lineColorHint' | 'lineWidthHint'> {
  if (!definition) {
    return {};
  }

  return resolveFeatureRenderProperties(
    {
      generatedAtUtc: '',
      categories: [],
      types: [definition]
    },
    {
      sourceType: 'drawn-building',
      typeCode: definition.typeCode,
      renderType: definition.renderType,
      geometryType: 'polygon'
    }
  );
}
