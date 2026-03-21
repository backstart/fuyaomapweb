<template>
  <div class="login-view">
    <FluidBackground />
    <div class="login-overlay"></div>

    <div class="login-content">
      <section class="login-hero">
        <p class="hero-kicker">Fuyao Map Platform</p>
        <h1>地图服务</h1>
        <p class="hero-subtitle">内网地图服务平台，店铺、区域、导入与管理一体化平台。</p>
        <div class="hero-tags">
          <el-tag effect="light" round>地图总览</el-tag>
          <el-tag effect="light" round>区域管理</el-tag>
          <el-tag effect="light" round>OSM 导入</el-tag>
        </div>
      </section>

      <section class="login-panel shell-card">
        <header class="panel-header">
          <div>
            <p class="panel-kicker">Sign In</p>
            <h2>登录系统</h2>
          </div>
          <el-tag type="info" effect="light" round>JWT</el-tag>
        </header>

        <el-alert
          v-if="errorMessage"
          :title="errorMessage"
          type="error"
          show-icon
          :closable="false"
          class="panel-alert"
        />

        <el-form @submit.prevent="handleSubmit">
          <el-form-item label="用户名">
            <el-input
              v-model="form.username"
              placeholder="请输入用户名"
              autocomplete="username"
              @keyup.enter="handleSubmit"
            />
          </el-form-item>

          <el-form-item label="密码">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              autocomplete="current-password"
              show-password
              @keyup.enter="handleSubmit"
            />
          </el-form-item>

          <div class="panel-options">
            <el-checkbox v-model="form.rememberMe">记住我</el-checkbox>
            <span>默认管理员：admin / admin123456</span>
          </div>

          <el-button
            class="login-button"
            type="primary"
            size="large"
            :loading="authStore.loading"
            @click="handleSubmit"
          >
            登录
          </el-button>
        </el-form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import FluidBackground from '@/components/auth/FluidBackground.vue';
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
}

.login-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(6, 14, 26, 0.4) 0%, rgba(6, 14, 26, 0.12) 42%, rgba(6, 14, 26, 0.48) 100%);
}

.login-content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) 420px;
  align-items: center;
  gap: 36px;
  padding: 40px 6vw;
}

.login-hero {
  color: rgba(255, 255, 255, 0.96);
}

.hero-kicker {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(155, 215, 255, 0.88);
}

.login-hero h1 {
  margin: 0;
  font-size: clamp(3rem, 5vw, 5rem);
  line-height: 1.02;
}

.hero-subtitle {
  max-width: 580px;
  margin: 18px 0 0;
  color: rgba(225, 235, 248, 0.86);
  font-size: 18px;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 26px;
}

.hero-tags :deep(.el-tag) {
  border-color: rgba(167, 199, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
}

.login-panel {
  padding: 28px 28px 24px;
  background: rgba(244, 248, 255, 0.82);
  border-color: rgba(202, 216, 245, 0.3);
  box-shadow: 0 24px 70px rgba(5, 12, 24, 0.26);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-kicker {
  margin: 0 0 6px;
  color: var(--brand);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.panel-header h2 {
  margin: 0;
  font-size: 28px;
}

.panel-alert {
  margin-bottom: 16px;
}

.panel-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
  color: var(--text-secondary);
  font-size: 13px;
}

.login-button {
  width: 100%;
  height: 46px;
  border-radius: 14px;
}

@media (max-width: 1080px) {
  .login-content {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .login-hero {
    text-align: center;
  }

  .hero-subtitle {
    margin-left: auto;
    margin-right: auto;
  }

  .hero-tags {
    justify-content: center;
  }

  .login-panel {
    width: min(100%, 420px);
  }
}

@media (max-width: 640px) {
  .login-content {
    padding: 26px 16px;
    gap: 24px;
  }

  .panel-options {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
