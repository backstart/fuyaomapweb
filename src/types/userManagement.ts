import type { RoleCode } from '@/types/auth';

export interface PlatformUser {
  id: string;
  username: string;
  displayName?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  roleCode: RoleCode;
  isAdmin: boolean;
  reviewerAdminId?: string | null;
  reviewerAdminDisplayName?: string | null;
  lastLoginTime?: string | null;
  createTime: string;
  updateTime?: string | null;
}

export interface ReviewerOption {
  id: string;
  username: string;
  displayName: string;
  roleCode: RoleCode;
}

export interface QueryUsersParams {
  keyword?: string;
  roleCode?: RoleCode | '';
  status?: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  displayName?: string | null;
  phone?: string | null;
  email?: string | null;
  roleCode: RoleCode;
  status: string;
  reviewerAdminId?: string | null;
}

export interface UpdateUserPayload {
  displayName?: string | null;
  phone?: string | null;
  email?: string | null;
  roleCode: RoleCode;
  status: string;
  password?: string | null;
}

export interface AssignUserReviewerPayload {
  reviewerAdminId: string;
}
