import { ref, shallowRef } from 'vue';
import type { Map, MapOptions } from 'maplibre-gl';
import { appConfig } from '@/config/appConfig';
import { getCurrentBasemapVersion } from '@/api/basemapApi';
import { resolveInitialMapView, type MapViewState, ZHONGSHAN_DEFAULT_CENTER, ZHONGSHAN_DEFAULT_ZOOM } from '@/map/defaultMapView';
import { ensureMapLibreRuntime, maplibreglRuntime } from '@/utils/maplibreRuntime';
import { resolveMapStyle } from '@/utils/mapStyle';
import type { MapViewportState } from '@/types/map';
import type { BasemapVersion } from '@/types/basemap';

interface InitMapOptions extends Partial<MapOptions> {
  persistedViewport?: MapViewportState | null;
}

const VIEW_CENTER_EPSILON = 0.0001;
const VIEW_ZOOM_EPSILON = 0.05;

function isSameView(left: MapViewState, right: MapViewState): boolean {
  return (
    Math.abs(left.center[0] - right.center[0]) <= VIEW_CENTER_EPSILON &&
    Math.abs(left.center[1] - right.center[1]) <= VIEW_CENTER_EPSILON &&
    Math.abs(left.zoom - right.zoom) <= VIEW_ZOOM_EPSILON
  );
}

export function useMapLibre() {
  const map = shallowRef<Map | null>(null);
  const ready = ref(false);
  let initSequence = 0;

  async function initMap(container: HTMLElement, options: InitMapOptions = {}): Promise<Map> {
    const basemapVersion = await resolveRuntimeBasemapVersion();
    const pmtilesUrl = basemapVersion?.tilesUrl?.trim() || appConfig.pmtilesUrl;
    const staticStyleUrl = basemapVersion?.styleUrl?.trim() || appConfig.mapStyleUrl;
    const { persistedViewport, ...mapOptions } = options;
    ensureMapLibreRuntime();
    const initialViewResolution = resolveInitialMapView({ persistedViewport });
    const style = await resolveMapStyle(pmtilesUrl, {
      staticStyleUrl
    });
    const initToken = ++initSequence;
    const initialView = initialViewResolution.initialView;

    const instance = new maplibreglRuntime.Map({
      container,
      style,
      center: initialView.center ?? ZHONGSHAN_DEFAULT_CENTER,
      zoom: initialView.zoom ?? ZHONGSHAN_DEFAULT_ZOOM,
      attributionControl: false,
      localIdeographFontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      ...mapOptions
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

    if (initialViewResolution.pendingLocatedView) {
      let userInteracted = false;
      const interactionEvents: Array<'dragstart' | 'zoomstart' | 'rotatestart' | 'pitchstart'> = [
        'dragstart',
        'zoomstart',
        'rotatestart',
        'pitchstart'
      ];
      const markUserInteracted = (): void => {
        userInteracted = true;
      };

      interactionEvents.forEach((eventName) => {
        instance.once(eventName, markUserInteracted);
      });

      void initialViewResolution.pendingLocatedView.then((locatedView) => {
        if (!locatedView || userInteracted || initToken !== initSequence || map.value !== instance) {
          return;
        }

        if (isSameView(locatedView, initialView)) {
          return;
        }

        instance.easeTo({
          center: locatedView.center,
          zoom: locatedView.zoom,
          duration: 800,
          essential: true
        });
      });
    }

    map.value = instance;
    return instance;
  }

  function destroyMap(): void {
    // 销毁必须统一从这里走，避免页面切换后残留 WebGL 资源。
    if (map.value) {
      initSequence++;
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

async function resolveRuntimeBasemapVersion(): Promise<BasemapVersion | null> {
  try {
    return await getCurrentBasemapVersion();
  } catch {
    return null;
  }
}
