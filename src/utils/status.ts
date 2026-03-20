import type { TagProps } from 'element-plus';

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
