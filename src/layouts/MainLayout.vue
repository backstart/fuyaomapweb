<template>
  <div class="layout-root">
    <aside class="layout-sidebar shell-card">
      <div class="brand-block">
        <h1>地图平台</h1>
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
        <el-menu-item index="/pois">
          <el-icon><Place /></el-icon>
          <span>POI 管理</span>
        </el-menu-item>
        <el-menu-item index="/places">
          <el-icon><Guide /></el-icon>
          <span>地名管理</span>
        </el-menu-item>
        <el-menu-item index="/boundaries">
          <el-icon><DataLine /></el-icon>
          <span>边界管理</span>
        </el-menu-item>
        <el-menu-item index="/imports">
          <el-icon><UploadFilled /></el-icon>
          <span>导入管理</span>
        </el-menu-item>
      </el-menu>

    </aside>

    <main :class="['layout-main', { 'layout-main--map': isMapRoute }]">
      <header :class="['layout-topbar shell-card', { 'layout-topbar--map': isMapRoute }]">
        <h2 v-if="!isMapRoute">{{ pageTitle }}</h2>
        <div class="topbar-meta">
          <div class="user-chip">
            <span>{{ authStore.displayName }}</span>
            <small>{{ authStore.userInfo?.isAdmin ? '管理员' : '用户' }}</small>
          </div>
          <el-button round @click="handleLogout">退出登录</el-button>
        </div>
      </header>

      <section :class="['layout-content', { 'layout-content--map': isMapRoute }]">
        <RouterView />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Connection, DataLine, Guide, Location, Place, Shop, UploadFilled } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/authStore';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// Route segments already map cleanly to menu indexes, so no separate menu config is needed for V1.
const activeMenu = computed(() => `/${route.path.split('/')[1] ?? 'map'}`);
const isMapRoute = computed(() => activeMenu.value === '/map');
const pageTitle = computed(() => String(route.meta.title || '地图总览'));

async function handleLogout(): Promise<void> {
  await authStore.signOut();
  await router.replace('/login');
}
</script>

<style scoped>
.layout-root {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
}

.layout-sidebar {
  display: flex;
  flex-direction: column;
  padding: 14px;
}

.brand-block {
  padding: 10px 10px 16px;
}

.brand-block h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
}

.sidebar-menu {
  flex: 1;
  background: transparent;
}

.layout-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.layout-main--map {
  position: relative;
  gap: 0;
  min-height: calc(100vh - 32px);
}

.layout-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
}

.layout-topbar--map {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 8;
  justify-content: flex-end;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  backdrop-filter: none;
  pointer-events: none;
}

.layout-topbar h2 {
  margin: 0;
  font-size: 24px;
  line-height: 1.15;
}

.topbar-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.user-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 5px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.user-chip span {
  font-size: 13px;
  font-weight: 700;
}

.user-chip small {
  color: var(--text-secondary);
  font-size: 12px;
}

.layout-content {
  min-height: 0;
  flex: 1;
}

.layout-content--map {
  display: flex;
  flex: 1;
  min-height: 0;
}

.layout-topbar--map .topbar-meta {
  pointer-events: auto;
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

  .layout-topbar--map {
    padding: 12px 14px;
    align-items: flex-end;
  }

  .topbar-meta {
    justify-content: flex-start;
  }

  .layout-topbar--map .topbar-meta {
    justify-content: flex-end;
    width: 100%;
  }
}
</style>

