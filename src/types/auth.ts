export interface AuthUserInfo {
  id: string;
  username: string;
  displayName?: string | null;
  status: string;
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
