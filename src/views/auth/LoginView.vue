<template>
  <div class="login-view">
    <ParticleMorphBackground />

    <div class="login-shell">
      <section class="login-panel">
        <h1>地图平台</h1>

        <el-form class="login-form" @submit.prevent="handleSubmit">
          <el-form-item label="用户名">
            <el-input
              v-model="form.username"
              autocomplete="username"
              @keyup.enter="handleSubmit"
            >
              <template #prefix>
                <el-icon><UserFilled /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="密码">
            <el-input
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              show-password
              @keyup.enter="handleSubmit"
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-button
            class="login-button"
            size="large"
            native-type="submit"
            :loading="authStore.loading"
          >
            进入系统
          </el-button>
        </el-form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Lock, UserFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ParticleMorphBackground from '@/components/auth/ParticleMorphBackground.vue';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const form = reactive({
  username: '',
  password: ''
});

async function handleSubmit(): Promise<void> {
  try {
    await authStore.signIn(form.username.trim(), form.password, true);
    await router.replace(resolveRedirect(route.query.redirect));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败，请稍后重试');
  }
}

function resolveRedirect(rawRedirect: unknown): string {
  if (typeof rawRedirect === 'string' && rawRedirect.startsWith('/')) {
    return rawRedirect;
  }

  return '/map';
}
</script>

<style scoped>
.login-view {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: #02060b;
}

.login-shell {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  max-width: 1600px;
  margin: 0 auto;
  padding: clamp(20px, 4vw, 56px);
}

.login-panel {
  width: min(100%, 420px);
  padding: 34px 32px 30px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(8, 13, 24, 0.7) 0%, rgba(6, 10, 18, 0.6) 100%);
  border: 1px solid rgba(158, 196, 232, 0.12);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 22px 54px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(18px) saturate(112%);
  user-select: none;
  -webkit-user-select: none;
}

.login-panel h1 {
  margin: 0;
  color: rgba(247, 251, 255, 0.98);
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.06;
  font-weight: 700;
}

.login-form {
  margin-top: 28px;
}

.login-button {
  width: 100%;
  height: 50px;
  margin-top: 8px;
  border: none;
  border-radius: 16px;
  color: #07111a;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: linear-gradient(135deg, #d6f0ff 0%, #97d5ff 42%, #7eaef8 72%, #cce3ff 100%);
  box-shadow:
    0 16px 32px rgba(85, 144, 255, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
  transition: transform 220ms ease, box-shadow 220ms ease;
}

.login-button:hover {
  transform: translateY(-1px);
  box-shadow:
    0 18px 34px rgba(85, 144, 255, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.login-panel :deep(.el-form-item) {
  margin-bottom: 20px;
}

.login-panel :deep(.el-form-item__label) {
  color: rgba(229, 238, 248, 0.84);
  font-size: 13px;
}

.login-panel :deep(.el-input__wrapper) {
  min-height: 46px;
  background: rgba(6, 12, 21, 0.58);
  box-shadow:
    inset 0 0 0 1px rgba(162, 188, 227, 0.14),
    inset 0 10px 20px rgba(255, 255, 255, 0.02);
}

.login-panel :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    inset 0 0 0 1px rgba(163, 212, 255, 0.42),
    0 0 0 3px rgba(87, 148, 255, 0.1),
    0 0 20px rgba(140, 211, 255, 0.16);
}

.login-panel :deep(.el-input__inner) {
  color: rgba(246, 250, 255, 0.96);
  user-select: text;
  -webkit-user-select: text;
}

.login-panel :deep(.el-input__inner::placeholder) {
  color: transparent;
}

.login-panel :deep(.el-input__prefix-inner),
.login-panel :deep(.el-input__suffix-inner),
.login-panel :deep(.el-icon) {
  color: rgba(190, 213, 240, 0.62);
}

@media (max-width: 960px) {
  .login-shell {
    justify-content: center;
    padding: 22px 16px;
  }

  .login-panel {
    width: min(100%, 440px);
    padding: 28px 22px 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-button {
    transition: none;
  }

  .login-button:hover {
    transform: none;
  }
}
</style>
