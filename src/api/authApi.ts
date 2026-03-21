import type { AuthUserInfo, LoginRequestPayload, LoginResponse } from '@/types/auth';
import { getRequest, postRequest } from '@/api/http';

export function login(payload: LoginRequestPayload): Promise<LoginResponse> {
  return postRequest<LoginResponse, LoginRequestPayload>('/auth/login', payload);
}

export function getCurrentUser(): Promise<AuthUserInfo> {
  return getRequest<AuthUserInfo>('/auth/me');
}

export function logout(): Promise<boolean> {
  return postRequest<boolean, undefined>('/auth/logout');
}
