import type { AuthUserInfo } from '@/types/auth';

const AUTH_STORAGE_KEY = 'fuyaomapweb-auth-session';

interface PersistedAuthSession {
  token: string;
  userInfo: AuthUserInfo;
  expiresAt: number;
  rememberMe: boolean;
}

function readFromStorage(storage: Storage): PersistedAuthSession | null {
  const raw = storage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedAuthSession;
    if (!parsed.token || !parsed.userInfo || !parsed.expiresAt) {
      storage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    if (parsed.expiresAt <= Date.now()) {
      storage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    storage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function readPersistedAuthSession(): PersistedAuthSession | null {
  if (!canUseStorage()) {
    return null;
  }

  return readFromStorage(window.localStorage) ?? readFromStorage(window.sessionStorage);
}

export function persistAuthSession(session: PersistedAuthSession): void {
  if (!canUseStorage()) {
    return;
  }

  clearPersistedAuthSession();
  const storage = session.rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearPersistedAuthSession(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getStoredAccessToken(): string {
  return readPersistedAuthSession()?.token ?? '';
}
