import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '@/layouts/MainLayout.vue';
import MapView from '@/views/map/MapView.vue';
import ShopListView from '@/views/shops/ShopListView.vue';
import AreaListView from '@/views/areas/AreaListView.vue';
import ImportManageView from '@/views/imports/ImportManageView.vue';
import LoginView from '@/views/auth/LoginView.vue';
import NotFoundView from '@/views/error/NotFoundView.vue';
import { pinia } from '@/stores';
import { useAuthStore } from '@/stores/authStore';

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
            title: '店铺管理'
          }
        },
        {
          path: 'areas',
          name: 'areas',
          component: AreaListView,
          meta: {
            title: '区域管理'
          }
        },
        {
          path: 'imports',
          name: 'imports',
          component: ImportManageView,
          meta: {
            title: '导入管理'
          }
        }
      ]
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        title: '地图服务',
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

  return true;
});

router.afterEach((to) => {
  // 统一维护页面标题，避免每个页面自己手动改 document.title。
  const title = typeof to.meta.title === 'string' ? to.meta.title : 'Fuyao Map Web';
  document.title = to.name === 'login' ? title : `${title} | Fuyao Map Web`;
});

export default router;
