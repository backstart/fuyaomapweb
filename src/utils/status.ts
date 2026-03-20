import type { TagProps } from 'element-plus';

// Backend currently uses `1=enabled` and `0=disabled`; unknown values stay visible for debugging.
export function getStatusLabel(status: number): string {
  switch (status) {
    case 1:
      return '启用';
    case 0:
      return '停用';
    default:
      return `状态 ${status}`;
  }
}

// Tag colors mirror the same backend status semantics used in tables and popups.
export function getStatusTagType(status: number): TagProps['type'] {
  switch (status) {
    case 1:
      return 'success';
    case 0:
      return 'info';
    default:
      return 'warning';
  }
}
