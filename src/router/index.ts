import { createRouter, createWebHistory } from 'vue-router';
import type { RoleCode } from '@/types/auth';
import MainLayout from '@/layouts/MainLayout.vue';
import MapView from '@/views/map/MapView.vue';
import ShopListView from '@/views/shops/ShopListView.vue';
import AreaListView from '@/views/areas/AreaListView.vue';
import PoiListView from '@/views/pois/PoiListView.vue';
import PlaceListView from '@/views/places/PlaceListView.vue';
import BoundaryListView from '@/views/boundaries/BoundaryListView.vue';
import ImportManageView from '@/views/imports/ImportManageView.vue';
import BasemapPublishView from '@/views/basemap/BasemapPublishView.vue';
import BasemapVersionsView from '@/views/basemap/BasemapVersionsView.vue';
import UserManagementView from '@/views/users/UserManagementView.vue';
import MySubmissionsView from '@/views/submissions/MySubmissionsView.vue';
import ReviewCenterView from '@/views/reviews/ReviewCenterView.vue';
import LoginView from '@/views/auth/LoginView.vue';
import NotFoundView from '@/views/error/NotFoundView.vue';
import { pinia } from '@/stores';
import { useAuthStore } from '@/stores/authStore';
import { isRoleAllowed } from '@/utils/reviewWorkflow';

// 路由保持简单：一个主布局承载三类业务页，未引入额外权限或嵌套路由复杂度。
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      redirect: '/map',
      meta: {
        requiresAuth: true
      },
      children: [
        {
          path: 'map',
          name: 'map',
          component: MapView,
          meta: {
            title: '地图总览'
          }
        },
        {
          path: 'shops',
          name: 'shops',
          component: ShopListView,
          meta: {
            title: '店铺管理',
            roles: ['admin', 'super_admin'] as RoleCode[]
          }
        },
        {
          path: 'areas',
          name: 'areas',
          component: AreaListView,
          meta: {
            title: '区域管理',
            roles: ['admin', 'super_admin'] as RoleCode[]
          }
        },
        {
          path: 'pois',
          name: 'pois',
          component: PoiListView,
          meta: {
            title: 'POI 管理',
            roles: ['admin', 'super_admin'] as RoleCode[]
          }
        },
        {
          path: 'places',
          name: 'places',
          component: PlaceListView,
          meta: {
            title: '地名管理',
            roles: ['admin', 'super_admin'] as RoleCode[]
          }
        },
        {
          path: 'boundaries',
          name: 'boundaries',
          component: BoundaryListView,
          meta: {
            title: '边界管理',
            roles: ['admin', 'super_admin'] as RoleCode[]
          }
        },
        {
          path: 'imports',
          name: 'imports',
          component: ImportManageView,
          meta: {
            title: '导入管理',
            roles: ['admin', 'super_admin'] as RoleCode[]
          }
        },
        {
          path: 'basemap-publish',
          name: 'basemap-publish',
          component: BasemapPublishView,
          meta: {
            title: '底图发布',
            roles: ['admin', 'super_admin'] as RoleCode[]
          }
        },
        {
          path: 'basemap-versions',
          name: 'basemap-versions',
          component: BasemapVersionsView,
          meta: {
            title: '底图版本',
            roles: ['admin', 'super_admin'] as RoleCode[]
          }
        },
        {
          path: 'review-center',
          name: 'review-center',
          component: ReviewCenterView,
          meta: {
            title: '审核中心',
            roles: ['admin', 'super_admin'] as RoleCode[]
          }
        },
        {
          path: 'users',
          name: 'users',
          component: UserManagementView,
          meta: {
            title: '用户管理',
            roles: ['super_admin'] as RoleCode[]
          }
        },
        {
          path: 'my-submissions',
          name: 'my-submissions',
          component: MySubmissionsView,
          meta: {
            title: '我的提交',
            roles: ['user'] as RoleCode[]
          }
        }
      ]
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        title: '地图平台',
        public: true,
        guestOnly: true
      }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
      meta: {
        title: '页面未找到',
        public: true
      }
    }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore(pinia);
  authStore.hydrate();

  const isGuestOnly = to.matched.some((record) => record.meta.guestOnly === true);
  const isPublicRoute = to.matched.some((record) => record.meta.public === true);

  if (authStore.isAuthenticated && isGuestOnly) {
    const redirect = typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/')
      ? to.query.redirect
      : '/map';
    return redirect;
  }

  if (!authStore.isAuthenticated && !isPublicRoute) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    };
  }

  if (authStore.isAuthenticated) {
    const requiredRoles = to.matched.find((record) => Array.isArray(record.meta.roles))?.meta.roles as RoleCode[] | undefined;
    if (requiredRoles && !isRoleAllowed(authStore.roleCode, requiredRoles)) {
      return resolveAuthorizedHome(authStore.roleCode);
    }
  }

  return true;
});

router.afterEach((to) => {
  // 统一维护页面标题，避免每个页面自己手动改 document.title。
  const title = typeof to.meta.title === 'string' ? to.meta.title : '地图平台';
  document.title = to.name === 'login' ? title : `${title} | 地图平台`;
});

export default router;

function resolveAuthorizedHome(roleCode: RoleCode): string {
  if (roleCode === 'super_admin') {
    return '/users';
  }

  if (roleCode === 'admin') {
    return '/review-center';
  }

  return '/my-submissions';
}
