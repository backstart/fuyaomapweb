import type { EntityType, MapFocusTarget, MapSearchItem } from '@/types/map';

const ENTITY_LABELS: Record<EntityType, string> = {
  shop: '店铺',
  area: '区域',
  poi: 'POI',
  place: '地名',
  boundary: '边界'
};

export function getEntityTypeLabel(entityType: EntityType): string {
  return ENTITY_LABELS[entityType];
}

export function getSearchItemSubtitle(item: MapSearchItem): string {
  return `${getEntityTypeLabel(item.itemType)} · ${item.classification || '未分类'}`;
}

export function getFocusTargetSubtitle(target: MapFocusTarget): string {
  switch (target.entityType) {
    case 'shop':
      return `${getEntityTypeLabel(target.entityType)} · ${target.category || '未分类'}`;
    case 'area':
      return `${getEntityTypeLabel(target.entityType)} · ${target.type || '未分类'}`;
    case 'poi':
      return `${getEntityTypeLabel(target.entityType)} · ${target.category || '未分类'}`;
    case 'place':
      return `${getEntityTypeLabel(target.entityType)} · ${target.placeType || '未分类'}`;
    case 'boundary':
      return `${getEntityTypeLabel(target.entityType)} · ${target.boundaryType || '未分类'}`;
    default:
      return '';
  }
}

export function isPointEntityType(entityType: EntityType): boolean {
  return entityType === 'shop' || entityType === 'poi';
}
