import type { BasemapActionType, BasemapBuildStatus, BasemapFeatureKind, BasemapPublishStatus } from '@/types/basemap';

export function getBasemapFeatureKindLabel(value?: BasemapFeatureKind | string | null): string {
  switch (value) {
    case 'building':
      return '建筑';
    case 'road':
      return '道路';
    case 'water':
      return '水系';
    case 'boundary':
      return '边界';
    default:
      return value || '未知对象';
  }
}

export function getBasemapActionLabel(value?: BasemapActionType | string | null): string {
  switch (value) {
    case 'create':
      return '新增';
    case 'update':
      return '修正';
    case 'delete':
      return '删除';
    default:
      return value || '未知动作';
  }
}

export function getBasemapPublishStatusLabel(value?: BasemapPublishStatus | string | null): string {
  switch (value) {
    case 'ready_for_basemap_publish':
      return '待发布';
    case 'published_to_basemap':
      return '已发布';
    case 'superseded':
      return '已被替代';
    case 'rolled_back':
      return '已回滚';
    default:
      return value || '未知状态';
  }
}

export function getBasemapPublishStatusTagType(value?: BasemapPublishStatus | string | null): '' | 'info' | 'warning' | 'success' | 'danger' {
  switch (value) {
    case 'ready_for_basemap_publish':
      return 'warning';
    case 'published_to_basemap':
      return 'success';
    case 'rolled_back':
      return 'danger';
    case 'superseded':
      return 'info';
    default:
      return '';
  }
}

export function getBasemapBuildStatusLabel(value?: BasemapBuildStatus | string | null): string {
  switch (value) {
    case 'building':
      return '构建中';
    case 'success':
      return '构建成功';
    case 'failed':
      return '构建失败';
    default:
      return value || '未知状态';
  }
}

export function getBasemapBuildStatusTagType(value?: BasemapBuildStatus | string | null): '' | 'info' | 'warning' | 'success' | 'danger' {
  switch (value) {
    case 'building':
      return 'warning';
    case 'success':
      return 'success';
    case 'failed':
      return 'danger';
    default:
      return '';
  }
}
