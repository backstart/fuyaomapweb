import { getRequest, postRequest, putRequest } from '@/api/http';
import type {
  AssignUserReviewerPayload,
  CreateUserPayload,
  PlatformUser,
  QueryUsersParams,
  ReviewerOption,
  UpdateUserPayload
} from '@/types/userManagement';

export function queryUsers(params: QueryUsersParams): Promise<PlatformUser[]> {
  return getRequest('/users', {
    params
  });
}

export function createUser(payload: CreateUserPayload): Promise<PlatformUser> {
  return postRequest('/users', payload);
}

export function updateUser(id: string, payload: UpdateUserPayload): Promise<PlatformUser> {
  return putRequest(`/users/${id}`, payload);
}

export function assignUserReviewer(id: string, payload: AssignUserReviewerPayload): Promise<PlatformUser> {
  return putRequest(`/users/${id}/reviewer`, payload);
}

export function getReviewerOptions(): Promise<ReviewerOption[]> {
  return getRequest('/users/reviewer-options');
}
