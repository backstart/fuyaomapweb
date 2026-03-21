import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { AuthUserInfo } from '@/types/auth';
import { getCurrentUser, login, logout } from '@/api/authApi';
import { clearPersistedAuthSession, persistAuthSession, readPersistedAuthSession } from '@/utils/authSession';

export const useAuthStore = defineStore('auth', () => {
  const persistedSession = readPersistedAuthSession();
  const token = ref(persistedSession?.token ?? '');
  const userInfo = ref<AuthUserInfo | null>(persistedSession?.userInfo ?? null);
  const expiresAt = ref<number>(persistedSession?.expiresAt ?? 0);
  const rememberMe = ref<boolean>(persistedSession?.rememberMe ?? true);
  const loading = ref(false);

  const isAuthenticated = computed(() => Boolean(token.value) && expiresAt.value > Date.now());
  const displayName = computed(() => userInfo.value?.displayName || userInfo.value?.username || '未登录');

  function hydrate(): void {
    const session = readPersistedAuthSession();
    if (!session) {
      clearState();
      return;
    }

    token.value = session.token;
    userInfo.value = session.userInfo;
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
      userInfo.value = response.userInfo;
      expiresAt.value = Date.now() + response.expiresIn * 1000;
      rememberMe.value = keepSignedIn;

      persistAuthSession({
        token: token.value,
        userInfo: response.userInfo,
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

    const currentUser = await getCurrentUser();
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

  return {
    token,
    userInfo,
    rememberMe,
    loading,
    isAuthenticated,
    displayName,
    hydrate,
    signIn,
    refreshCurrentUser,
    signOut,
    clearState
  };
});
