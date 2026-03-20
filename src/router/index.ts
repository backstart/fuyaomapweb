import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '@/layouts/MainLayout.vue';
import MapView from '@/views/map/MapView.vue';
import ShopListView from '@/views/shops/ShopListView.vue';
import AreaListView from '@/views/areas/AreaListView.vue';
import NotFoundView from '@/views/not-found/NotFoundView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      redirect: '/map',
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
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
      meta: {
        title: '页面未找到'
      }
    }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : 'Fuyao Map Web';
  document.title = `${title} | Fuyao Map Web`;
});

export default router;
