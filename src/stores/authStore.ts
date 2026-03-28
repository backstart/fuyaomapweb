import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { AuthUserInfo, RoleCode } from '@/types/auth';
import { getCurrentUser, login, logout } from '@/api/authApi';
import { clearPersistedAuthSession, persistAuthSession, readPersistedAuthSession } from '@/utils/authSession';

export const useAuthStore = defineStore('auth', () => {
  const persistedSession = readPersistedAuthSession();
  const token = ref(persistedSession?.token ?? '');
  const userInfo = ref<AuthUserInfo | null>(normalizeUserInfo(persistedSession?.userInfo ?? null));
  const expiresAt = ref<number>(persistedSession?.expiresAt ?? 0);
  const rememberMe = ref<boolean>(persistedSession?.rememberMe ?? true);
  const loading = ref(false);

  const isAuthenticated = computed(() => Boolean(token.value) && expiresAt.value > Date.now());
  const displayName = computed(() => userInfo.value?.displayName || userInfo.value?.username || '未登录');
  const roleCode = computed<RoleCode>(() => userInfo.value?.roleCode ?? 'user');
  const isSuperAdmin = computed(() => roleCode.value === 'super_admin');
  const isAdminRole = computed(() => roleCode.value === 'admin' || roleCode.value === 'super_admin');
  const isNormalUser = computed(() => roleCode.value === 'user');

  function hydrate(): void {
    const session = readPersistedAuthSession();
    if (!session) {
      clearState();
      return;
    }

    token.value = session.token;
    userInfo.value = normalizeUserInfo(session.userInfo);
    expiresAt.value = session.expiresAt;
    rememberMe.value = session.rememberMe;
  }

  async function signIn(username: string, password: string, keepSignedIn: boolean): Promise<void> {
    loading.value = true;
    try {
      const response = await login({
        username,
        password
      });

      token.value = response.token;
      const normalizedUser = normalizeUserInfo(response.userInfo);
      if (!normalizedUser) {
        throw new Error('登录返回的用户信息无效');
      }

      userInfo.value = normalizedUser;
      expiresAt.value = Date.now() + response.expiresIn * 1000;
      rememberMe.value = keepSignedIn;

      persistAuthSession({
        token: token.value,
        userInfo: normalizedUser,
        expiresAt: expiresAt.value,
        rememberMe: keepSignedIn
      });
    } finally {
      loading.value = false;
    }
  }

  async function refreshCurrentUser(): Promise<void> {
    if (!isAuthenticated.value) {
      clearState();
      return;
    }

    const currentUser = normalizeUserInfo(await getCurrentUser());
    if (!currentUser) {
      clearState();
      return;
    }

    userInfo.value = currentUser;
    persistAuthSession({
      token: token.value,
      userInfo: currentUser,
      expiresAt: expiresAt.value,
      rememberMe: rememberMe.value
    });
  }

  async function signOut(): Promise<void> {
    try
    {
      if (token.value) {
        await logout();
      }
    }
    catch
    {
      // 纯 JWT 退出不依赖服务端状态，接口失败时仍然清空本地会话。
    }
    finally
    {
      clearState();
    }
  }

  function clearState(): void {
    token.value = '';
    userInfo.value = null;
    expiresAt.value = 0;
    rememberMe.value = true;
    clearPersistedAuthSession();
  }

  function hasRole(...roles: RoleCode[]): boolean {
    return roles.includes(roleCode.value);
  }

  return {
    token,
    userInfo,
    rememberMe,
    loading,
    isAuthenticated,
    displayName,
    roleCode,
    isSuperAdmin,
    isAdminRole,
    isNormalUser,
    hydrate,
    hasRole,
    signIn,
    refreshCurrentUser,
    signOut,
    clearState
  };
});

function normalizeUserInfo(userInfo: AuthUserInfo | null): AuthUserInfo | null {
  if (!userInfo) {
    return null;
  }

  const roleCode = normalizeRoleCode(userInfo.roleCode, userInfo.isAdmin);
  return {
    ...userInfo,
    roleCode,
    isAdmin: roleCode !== 'user'
  };
}

function normalizeRoleCode(roleCode: string | undefined, isAdmin: boolean): RoleCode {
  switch (roleCode) {
    case 'super_admin':
      return 'super_admin';
    case 'admin':
      return 'admin';
    case 'user':
      return 'user';
    default:
      return isAdmin ? 'admin' : 'user';
  }
}
