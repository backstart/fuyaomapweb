export interface SemanticRenderProperties {
  iconKey?: string | null;
  styleKey?: string | null;
  textStyleKey?: string | null;
  colorHint?: string | null;
  semanticMinZoom?: number | null;
  semanticMaxZoom?: number | null;
  semanticPriority?: number | null;
  markerColor?: string | null;
  markerStrokeColor?: string | null;
  markerGlyph?: string | null;
  markerGlyphColor?: string | null;
  markerOpacity?: number | null;
  markerRadius?: number | null;
  fillColorHint?: string | null;
  fillOpacityHint?: number | null;
  lineColorHint?: string | null;
  lineWidthHint?: number | null;
  lineOpacityHint?: number | null;
  lineDashKey?: string | null;
  textColor?: string | null;
  haloColor?: string | null;
  textSize?: number | null;
  textRadialOffset?: number | null;
  textLetterSpacing?: number | null;
  isSelected?: boolean;
  isEditing?: boolean;
}
