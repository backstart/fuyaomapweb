<template>
  <div class="layout-root">
    <aside class="layout-sidebar shell-card">
      <div class="brand-block">
        <p class="brand-kicker">Fuyao</p>
        <h1>Map Platform</h1>
        <span>Web V1</span>
      </div>

      <el-menu
        class="sidebar-menu"
        :default-active="activeMenu"
        router
      >
        <el-menu-item index="/map">
          <el-icon><Location /></el-icon>
          <span>地图总览</span>
        </el-menu-item>
        <el-menu-item index="/shops">
          <el-icon><Shop /></el-icon>
          <span>店铺管理</span>
        </el-menu-item>
        <el-menu-item index="/areas">
          <el-icon><Connection /></el-icon>
          <span>区域管理</span>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-footer">
        <p>API</p>
        <strong>{{ apiBaseLabel }}</strong>
      </div>
    </aside>

    <main class="layout-main">
      <header class="layout-topbar shell-card">
        <div>
          <p class="topbar-kicker">地图服务平台</p>
          <h2>{{ pageTitle }}</h2>
        </div>
        <div class="topbar-meta">
          <el-tag round effect="light">Vue 3 + MapLibre</el-tag>
          <el-tag round type="success" effect="light">API 已适配 /api/v1</el-tag>
        </div>
      </header>

      <section class="layout-content">
        <RouterView />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Connection, Location, Shop } from '@element-plus/icons-vue';

const route = useRoute();

const activeMenu = computed(() => `/${route.path.split('/')[1] ?? 'map'}`);
const pageTitle = computed(() => String(route.meta.title || '地图总览'));
const apiBaseLabel = computed(() => import.meta.env.VITE_API_BASE_URL || '未配置');
</script>

<style scoped>
.layout-root {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 20px;
  padding: 20px;
}

.layout-sidebar {
  display: flex;
  flex-direction: column;
  padding: 18px;
}

.brand-block {
  padding: 12px 10px 18px;
}

.brand-kicker {
  margin: 0;
  color: var(--brand);
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
}

.brand-block h1 {
  margin: 6px 0 2px;
  font-size: 26px;
}

.brand-block span {
  color: var(--text-secondary);
  font-size: 13px;
}

.sidebar-menu {
  flex: 1;
  background: transparent;
}

.sidebar-footer {
  padding: 14px 10px 6px;
  border-top: 1px solid rgba(148, 163, 184, 0.22);
}

.sidebar-footer p {
  margin: 0 0 4px;
  color: var(--text-secondary);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.sidebar-footer strong {
  display: block;
  font-size: 13px;
  word-break: break-all;
}

.layout-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.layout-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
}

.topbar-kicker {
  margin: 0 0 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.layout-topbar h2 {
  margin: 0;
  font-size: 28px;
}

.topbar-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.layout-content {
  min-height: 0;
  flex: 1;
}

@media (max-width: 1100px) {
  .layout-root {
    grid-template-columns: 1fr;
  }

  .layout-sidebar {
    min-height: unset;
  }
}

@media (max-width: 768px) {
  .layout-root {
    padding: 14px;
    gap: 14px;
  }

  .layout-topbar {
    padding: 18px;
    flex-direction: column;
    align-items: flex-start;
  }

  .topbar-meta {
    justify-content: flex-start;
  }
}
</style>
