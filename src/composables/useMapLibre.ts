import { ref, shallowRef } from 'vue';
import type { Map, MapOptions } from 'maplibre-gl';
import { appConfig } from '@/config/appConfig';
import { ensureMapLibreRuntime, maplibreglRuntime } from '@/utils/maplibreRuntime';
import { getPmtilesInitialView, resolveMapStyle } from '@/utils/mapStyle';

// 仅在 PMTiles 头信息不可用时兜底使用。
const DEFAULT_CENTER: [number, number] = [113.2644, 23.1291];
const DEFAULT_ZOOM = 10.5;
export function useMapLibre() {
  const map = shallowRef<Map | null>(null);
  const ready = ref(false);

  async function initMap(container: HTMLElement, options: Partial<MapOptions> = {}): Promise<Map> {
    const pmtilesUrl = appConfig.pmtilesUrl;
    ensureMapLibreRuntime();
    // 样式解析和初始视图读取并行执行，减少地图首屏等待时间。
    const [style, initialView] = await Promise.all([
      resolveMapStyle(pmtilesUrl),
      getPmtilesInitialView(pmtilesUrl)
    ]);

    const instance = new maplibreglRuntime.Map({
      container,
      style,
      center: initialView?.center ?? DEFAULT_CENTER,
      zoom: initialView?.zoom ?? DEFAULT_ZOOM,
      attributionControl: false,
      localIdeographFontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      ...options
    });

    // 这些控件后续如果需要做“纯净模式”，可以在这里集中裁剪。
    instance.addControl(
      new maplibreglRuntime.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: false
      }),
      'top-right'
    );
    instance.addControl(new maplibreglRuntime.AttributionControl({ compact: true }), 'bottom-right');

    instance.once('load', () => {
      ready.value = true;
    });

    map.value = instance;
    return instance;
  }

  function destroyMap(): void {
    // 销毁必须统一从这里走，避免页面切换后残留 WebGL 资源。
    if (map.value) {
      map.value.remove();
      map.value = null;
      ready.value = false;
    }
  }

  return {
    map,
    ready,
    initMap,
    destroyMap
  };
}
