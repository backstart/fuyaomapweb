<template>
  <div class="login-view">
    <div class="login-aura aura-left"></div>
    <div class="login-aura aura-right"></div>

    <div class="login-shell">
      <section class="login-showcase">
        <GlassFlowerScene />
      </section>

      <section class="login-side">
        <div class="login-panel">
          <div class="panel-sheen"></div>
          <p class="panel-kicker">Secure Spatial Access</p>
          <h1>地图服务</h1>
          <p class="panel-subtitle">内网地图服务平台</p>
          <p class="panel-description">店铺、区域、导入与管理一体化平台。</p>

          <div v-if="errorMessage" class="panel-error">
            <span class="panel-error-dot"></span>
            <span>{{ errorMessage }}</span>
          </div>

          <el-form class="login-form" @submit.prevent="handleSubmit">
            <el-form-item label="用户名">
              <el-input
                v-model="form.username"
                placeholder="请输入用户名"
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
                placeholder="请输入密码"
                autocomplete="current-password"
                show-password
                @keyup.enter="handleSubmit"
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <div class="panel-options">
              <el-checkbox v-model="form.rememberMe">记住我</el-checkbox>
              <span class="panel-hint">开发环境默认管理员：admin / admin123456</span>
            </div>

            <el-button
              class="login-button"
              size="large"
              native-type="submit"
              :loading="authStore.loading"
            >
              <span>进入系统</span>
              <i class="button-shine"></i>
            </el-button>
          </el-form>

          <div class="panel-footer">
            <span>JWT 安全认证</span>
            <span>登录后默认进入地图总览</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Lock, UserFilled } from '@element-plus/icons-vue';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import GlassFlowerScene from '@/components/auth/GlassFlowerScene.vue';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const errorMessage = ref('');
const form = reactive({
  username: 'admin',
  password: 'admin123456',
  rememberMe: true
});

async function handleSubmit(): Promise<void> {
  errorMessage.value = '';

  try {
    await authStore.signIn(form.username.trim(), form.password, form.rememberMe);
    await router.replace(resolveRedirect(route.query.redirect));
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败，请稍后重试';
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
  background:
    radial-gradient(circle at 22% 32%, rgba(255, 233, 190, 0.08), transparent 18%),
    radial-gradient(circle at 76% 22%, rgba(119, 191, 255, 0.14), transparent 24%),
    linear-gradient(135deg, #020305 0%, #030509 42%, #07111a 100%);
}

.login-aura {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.5;
  pointer-events: none;
}

.aura-left {
  left: -6%;
  top: 8%;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(255, 223, 175, 0.22), rgba(255, 223, 175, 0.02) 70%, transparent);
}

.aura-right {
  right: -4%;
  top: 18%;
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, rgba(105, 179, 255, 0.18), rgba(105, 179, 255, 0.02) 72%, transparent);
}

.login-shell {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(380px, 0.88fr);
  align-items: center;
  gap: clamp(28px, 4vw, 64px);
  max-width: 1520px;
  margin: 0 auto;
  padding: clamp(18px, 3vw, 42px);
}

.login-showcase {
  min-width: 0;
}

.login-side {
  display: flex;
  justify-content: center;
}

.login-panel {
  position: relative;
  width: min(100%, 460px);
  padding: 34px 32px 26px;
  border-radius: 30px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(12, 18, 30, 0.84) 0%, rgba(8, 12, 21, 0.72) 100%);
  border: 1px solid rgba(154, 190, 238, 0.2);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 30px 80px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(24px) saturate(130%);
}

.panel-sheen {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.1), transparent 28%),
    radial-gradient(circle at top right, rgba(146, 205, 255, 0.18), transparent 28%);
  pointer-events: none;
}

.panel-kicker,
.login-panel h1,
.panel-subtitle,
.panel-description,
.panel-footer,
.panel-options {
  position: relative;
  z-index: 1;
}

.panel-kicker {
  margin: 0 0 14px;
  color: rgba(160, 213, 255, 0.78);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.login-panel h1 {
  margin: 0;
  color: rgba(248, 251, 255, 0.98);
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.06;
}

.panel-subtitle {
  margin: 14px 0 0;
  color: rgba(255, 239, 202, 0.84);
  font-size: 16px;
}

.panel-description {
  margin: 10px 0 0;
  color: rgba(218, 228, 241, 0.72);
  font-size: 14px;
}

.panel-error {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 22px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(93, 18, 24, 0.34);
  border: 1px solid rgba(255, 145, 145, 0.18);
  color: rgba(255, 225, 225, 0.94);
  font-size: 13px;
  line-height: 1.5;
}

.panel-error-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #ff9f9f;
  box-shadow: 0 0 10px rgba(255, 159, 159, 0.42);
}

.login-form {
  position: relative;
  z-index: 1;
  margin-top: 26px;
}

.panel-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin: 6px 0 20px;
  color: rgba(221, 232, 244, 0.74);
  font-size: 13px;
}

.panel-hint {
  text-align: right;
  color: rgba(255, 233, 193, 0.72);
}

.login-button {
  position: relative;
  width: 100%;
  height: 50px;
  overflow: hidden;
  border: none;
  border-radius: 16px;
  color: #08111b;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: linear-gradient(135deg, #d8f6ff 0%, #8bc8ff 34%, #7aa6ff 68%, #d0e7ff 100%);
  box-shadow:
    0 18px 34px rgba(85, 144, 255, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: transform 220ms ease, box-shadow 220ms ease;
}

.login-button span,
.button-shine {
  position: relative;
  z-index: 1;
}

.button-shine {
  position: absolute;
  inset: 1px;
  border-radius: 15px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.52), transparent);
  transform: translateX(-120%);
  opacity: 0.8;
  transition: transform 480ms ease;
}

.login-button:hover .button-shine {
  transform: translateX(120%);
}

.login-button:hover {
  transform: translateY(-1px);
  box-shadow:
    0 22px 42px rgba(85, 144, 255, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.panel-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  color: rgba(196, 210, 226, 0.56);
  font-size: 12px;
}

.login-panel :deep(.el-form-item) {
  margin-bottom: 20px;
}

.login-panel :deep(.el-form-item__label) {
  color: rgba(228, 236, 247, 0.8);
  font-size: 13px;
}

.login-panel :deep(.el-input__wrapper) {
  min-height: 46px;
  background: rgba(6, 12, 21, 0.54);
  box-shadow:
    inset 0 0 0 1px rgba(162, 188, 227, 0.14),
    inset 0 10px 20px rgba(255, 255, 255, 0.02);
}

.login-panel :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    inset 0 0 0 1px rgba(163, 212, 255, 0.42),
    0 0 0 3px rgba(87, 148, 255, 0.12),
    0 0 20px rgba(140, 211, 255, 0.18);
}

.login-panel :deep(.el-input__inner) {
  color: rgba(246, 250, 255, 0.96);
}

.login-panel :deep(.el-input__inner::placeholder) {
  color: rgba(164, 179, 199, 0.62);
}

.login-panel :deep(.el-input__prefix-inner),
.login-panel :deep(.el-input__suffix-inner),
.login-panel :deep(.el-icon) {
  color: rgba(190, 213, 240, 0.62);
}

.login-panel :deep(.el-checkbox__label) {
  color: rgba(224, 234, 245, 0.82);
}

.login-panel :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #79b8ff;
  border-color: #79b8ff;
}

.login-panel :deep(.el-checkbox__inner) {
  background: rgba(9, 16, 28, 0.72);
  border-color: rgba(156, 184, 222, 0.34);
}

@media (max-width: 1180px) {
  .login-shell {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .login-showcase,
  .login-side {
    width: 100%;
  }

  .login-panel {
    width: min(100%, 560px);
  }
}

@media (max-width: 720px) {
  .login-shell {
    padding: 18px 14px 28px;
    gap: 20px;
  }

  .login-panel {
    padding: 28px 20px 22px;
    border-radius: 24px;
  }

  .panel-options,
  .panel-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .panel-hint {
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .button-shine,
  .login-button {
    transition: none;
  }

  .login-button:hover {
    transform: none;
  }
}
</style>
