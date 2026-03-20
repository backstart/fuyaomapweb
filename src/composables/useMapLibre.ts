import { ref, shallowRef } from 'vue';
import maplibregl, { type Map, type MapOptions } from 'maplibre-gl';
import { resolveMapStyle } from '@/utils/mapStyle';

const DEFAULT_CENTER: [number, number] = [121.4737, 31.2304];
const DEFAULT_ZOOM = 10.5;

export function useMapLibre() {
  const map = shallowRef<Map | null>(null);
  const ready = ref(false);

  async function initMap(container: HTMLElement, options: Partial<MapOptions> = {}): Promise<Map> {
    const style = await resolveMapStyle(import.meta.env.VITE_MAP_BASE_URL || '');

    const instance = new maplibregl.Map({
      container,
      style,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      ...options
    });

    instance.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: false
      }),
      'top-right'
    );
    instance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    instance.once('load', () => {
      ready.value = true;
    });

    map.value = instance;
    return instance;
  }

  function destroyMap(): void {
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
