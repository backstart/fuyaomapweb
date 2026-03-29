<template>
  <div :class="['layout-root', { 'layout-root--collapsed': isSidebarCollapsed, 'layout-root--map': isMapRoute }]">
    <aside :class="['layout-sidebar', isMapRoute ? 'layout-sidebar--map' : 'shell-card', { 'layout-sidebar--collapsed': isSidebarCollapsed }]">
      <div class="brand-block">
        <div class="brand-title">
          <h1 v-if="!isSidebarCollapsed">地图平台</h1>
          <span v-else class="brand-mark">地</span>
        </div>
        <el-button
          circle
          class="sidebar-toggle"
          @click="toggleSidebar"
        >
          <el-icon><component :is="isSidebarCollapsed ? Expand : Fold" /></el-icon>
        </el-button>
      </div>

      <el-menu
        class="sidebar-menu"
        :default-active="activeMenu"
        :collapse="isSidebarCollapsed"
        :collapse-transition="false"
        router
      >
        <el-menu-item v-for="item in navigationItems" :key="item.index" :index="item.index">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>

    </aside>

    <main :class="['layout-main', { 'layout-main--map': isMapRoute }]">
      <header :class="['layout-topbar', isMapRoute ? 'layout-topbar--map' : 'shell-card']">
        <h2 v-if="!isMapRoute">{{ pageTitle }}</h2>
        <div class="topbar-meta">
          <div class="user-chip">
            <span>{{ authStore.displayName }}</span>
            <small>{{ roleLabel }}</small>
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
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { CollectionTag, Connection, DataLine, Expand, Files, Fold, Guide, Location, Place, Promotion, Sell, Shop, UploadFilled, UserFilled } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/authStore';
import { useCurrentUserRole } from '@/composables/useCurrentUserRole';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { canManageFormalData, canManageUsers, canReviewSubmissions, isNormalUser, roleLabel } = useCurrentUserRole();
const SIDEBAR_STORAGE_KEY = 'fuyaomap.sidebar.collapsed';
const isSidebarCollapsed = ref(false);

// Route segments already map cleanly to menu indexes, so no separate menu config is needed for V1.
const activeMenu = computed(() => `/${route.path.split('/')[1] ?? 'map'}`);
const isMapRoute = computed(() => activeMenu.value === '/map');
const pageTitle = computed(() => String(route.meta.title || '地图总览'));
const navigationItems = computed(() => [
  {
    index: '/map',
    label: '地图总览',
    icon: Location,
    visible: true
  },
  {
    index: '/my-submissions',
    label: '我的提交',
    icon: Files,
    visible: isNormalUser.value
  },
  {
    index: '/review-center',
    label: '审核中心',
    icon: CollectionTag,
    visible: canReviewSubmissions.value
  },
  {
    index: '/shops',
    label: '店铺管理',
    icon: Shop,
    visible: canManageFormalData.value
  },
  {
    index: '/areas',
    label: '区域管理',
    icon: Connection,
    visible: canManageFormalData.value
  },
  {
    index: '/pois',
    label: 'POI 管理',
    icon: Place,
    visible: canManageFormalData.value
  },
  {
    index: '/places',
    label: '地名管理',
    icon: Guide,
    visible: canManageFormalData.value
  },
  {
    index: '/boundaries',
    label: '边界管理',
    icon: DataLine,
    visible: canManageFormalData.value
  },
  {
    index: '/imports',
    label: '导入管理',
    icon: UploadFilled,
    visible: canManageFormalData.value
  },
  {
    index: '/basemap-publish',
    label: '底图发布',
    icon: Promotion,
    visible: canManageFormalData.value
  },
  {
    index: '/basemap-versions',
    label: '底图版本',
    icon: Sell,
    visible: canManageFormalData.value
  },
  {
    index: '/users',
    label: '用户管理',
    icon: UserFilled,
    visible: canManageUsers.value
  }
].filter((item) => item.visible));

onMounted(() => {
  if (typeof window === 'undefined') {
    return;
  }

  isSidebarCollapsed.value = window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
});

watch(isSidebarCollapsed, (value) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SIDEBAR_STORAGE_KEY, value ? '1' : '0');
});

function toggleSidebar(): void {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

async function handleLogout(): Promise<void> {
  await authStore.signOut();
  await router.replace('/login');
}
</script>

<style scoped>
.layout-root {
  height: 100vh;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
  overflow: hidden;
  transition: grid-template-columns 0.22s ease;
}

.layout-root--collapsed {
  grid-template-columns: 84px minmax(0, 1fr);
}

.layout-root--map {
  grid-template-columns: 232px minmax(0, 1fr);
  gap: 0;
  padding: 0;
}

.layout-root--map.layout-root--collapsed {
  grid-template-columns: 72px minmax(0, 1fr);
}

.layout-sidebar {
  display: flex;
  flex-direction: column;
  padding: 14px;
  min-height: 0;
  overflow: hidden;
  transition: padding 0.22s ease;
}

.layout-sidebar--collapsed {
  padding: 14px 10px;
}

.layout-sidebar--map {
  padding: 18px 12px 14px;
  background: rgba(255, 255, 255, 0.96);
  border-right: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: none;
  border-radius: 0;
}

.layout-sidebar--map.layout-sidebar--collapsed {
  padding: 18px 8px 14px;
}

.brand-block {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 10px 16px;
}

.layout-sidebar--map .brand-block {
  padding: 8px 8px 14px;
}

.layout-sidebar--collapsed .brand-block {
  flex-direction: column;
  gap: 10px;
  padding-inline: 0;
}

.brand-title {
  min-width: 0;
}

.brand-block h1,
.brand-mark {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(22, 100, 216, 0.08);
  color: var(--brand);
  font-weight: 800;
}

.sidebar-toggle {
  flex: none;
}

.sidebar-menu {
  flex: 1;
  background: transparent;
  min-height: 0;
  overflow-y: auto;
}

.layout-sidebar--collapsed :deep(.el-menu) {
  border-right: none;
}

.layout-sidebar--collapsed :deep(.el-menu-item) {
  justify-content: center;
  padding-inline: 0 !important;
}

.layout-sidebar--collapsed :deep(.el-menu-item .el-icon) {
  margin-right: 0;
}

.layout-main {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.layout-main--map {
  position: relative;
  height: 100vh;
  gap: 0;
  min-height: 0;
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
  overflow: hidden;
}

.layout-content--map {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.layout-root--map .layout-content--map {
  height: 100vh;
}

.layout-topbar--map .topbar-meta {
  pointer-events: auto;
}

@media (max-width: 1100px) {
  .layout-root {
    height: auto;
    grid-template-columns: 1fr;
    overflow: visible;
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

  .layout-main--map {
    height: auto;
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

