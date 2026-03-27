import type { EntityType, MapFocusTarget, MapSearchItem } from '@/types/map';

const ENTITY_LABELS: Record<EntityType, string> = {
  shop: '店铺',
  area: '区域',
  poi: 'POI',
  place: '地名',
  boundary: '边界',
  label: '标注'
};

export function getEntityTypeLabel(entityType: EntityType): string {
  return ENTITY_LABELS[entityType];
}

export function getSearchItemSubtitle(item: MapSearchItem): string {
  const semanticLabel = item.typeName || item.categoryName || item.classification || '未分类';
  return `${getEntityTypeLabel(item.itemType)} · ${semanticLabel}`;
}

export function getFocusTargetSubtitle(target: MapFocusTarget): string {
  switch (target.entityType) {
    case 'shop':
      return `${getEntityTypeLabel(target.entityType)} · ${target.typeName || target.categoryName || target.category || '未分类'}`;
    case 'area':
      return `${getEntityTypeLabel(target.entityType)} · ${target.typeName || target.categoryName || target.type || '未分类'}`;
    case 'poi':
      return `${getEntityTypeLabel(target.entityType)} · ${target.typeName || target.categoryName || target.subcategory || target.category || '未分类'}`;
    case 'place':
      return `${getEntityTypeLabel(target.entityType)} · ${target.typeName || target.categoryName || target.placeType || '未分类'}`;
    case 'boundary':
      return `${getEntityTypeLabel(target.entityType)} · ${target.typeName || target.categoryName || target.boundaryType || '未分类'}`;
    case 'label':
      return `${getEntityTypeLabel(target.entityType)} · ${target.typeName || target.categoryName || target.classification || '未分类'}`;
    default:
      return '';
  }
}

export function isPointEntityType(entityType: EntityType): boolean {
  return entityType === 'shop' || entityType === 'poi' || entityType === 'label';
}
