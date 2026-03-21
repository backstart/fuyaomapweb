import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@/styles/index.css';
import App from '@/App.vue';
import router from '@/router';
import { pinia } from '@/stores';
import { useAuthStore } from '@/stores/authStore';

const app = createApp(App);

// Global plugins are registered here once so route views stay focused on business concerns.
useAuthStore(pinia).hydrate();
app.use(pinia);
app.use(router);
app.use(ElementPlus, {
  locale: zhCn
});

app.mount('#app');
