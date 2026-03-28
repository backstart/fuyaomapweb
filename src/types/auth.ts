export type RoleCode = 'super_admin' | 'admin' | 'user';

export interface AuthUserInfo {
  id: string;
  username: string;
  displayName?: string | null;
  status: string;
  roleCode: RoleCode;
  isAdmin: boolean;
  lastLoginTime?: string | null;
}

export interface LoginRequestPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  userInfo: AuthUserInfo;
}
