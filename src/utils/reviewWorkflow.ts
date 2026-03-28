import type { RoleCode } from '@/types/auth';
import type { SubmissionFeatureKind, SubmissionStatus } from '@/types/submission';

export function getRoleLabel(roleCode?: string | null): string {
  switch (roleCode) {
    case 'super_admin':
      return '超级管理员';
    case 'admin':
      return '管理员';
    default:
      return '普通用户';
  }
}

export function isAdminRole(roleCode?: string | null): boolean {
  return roleCode === 'super_admin' || roleCode === 'admin';
}

export function isRoleAllowed(roleCode: RoleCode, roles?: readonly RoleCode[]): boolean {
  if (!roles?.length) {
    return true;
  }

  return roles.includes(roleCode);
}

export function getSubmissionStatusLabel(status?: string | null): string {
  switch (status) {
    case 'draft':
      return '草稿';
    case 'pending':
      return '待审核';
    case 'approved':
      return '已通过';
    case 'rejected':
      return '已驳回';
    default:
      return '未知状态';
  }
}

export function getSubmissionStatusTagType(status?: SubmissionStatus | string | null): '' | 'info' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'draft':
      return 'info';
    case 'pending':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    default:
      return '';
  }
}

export function getSubmissionFeatureKindLabel(featureKind?: SubmissionFeatureKind | string | null): string {
  switch (featureKind) {
    case 'label':
      return '手工标注';
    case 'manual_building_area':
      return '手工建筑区域';
    default:
      return featureKind || '未知类型';
  }
}

export function canEditSubmission(status?: SubmissionStatus | string | null): boolean {
  return status === 'draft' || status === 'rejected';
}
