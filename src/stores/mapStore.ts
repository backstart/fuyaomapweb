import { computed, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { LayerVisibility, MapFocusTarget, MapSearchItem, MapViewportState } from '@/types/map';

export const useMapStore = defineStore('map', () => {
  // 地图实例放在全局 store 里，方便后续扩展绘制、编辑或外部控制。
  const mapInstance = shallowRef<MapLibreMap | null>(null);
  const layerVisibility = ref<LayerVisibility>({
    shops: true,
    areas: true,
    pois: false,
    places: false,
    boundaries: false
  });
  // 当前选中的要素既可能来自地图点击，也可能来自列表页或搜索结果。
  const selectedEntity = ref<MapFocusTarget | null>(null);
  const searchResults = ref<MapSearchItem[]>([]);
  // 记录当前视口，供 bbox 查询和刷新 GeoJSON 使用。
  const viewport = ref<MapViewportState>({
    bbox: undefined,
    center: [121.4737, 31.2304],
    zoom: 10.5
  });

  const hasSearchResults = computed(() => searchResults.value.length > 0);

  function setMap(map: MapLibreMap | null): void {
    mapInstance.value = map;
  }

  function setLayerVisibility(patch: Partial<LayerVisibility>): void {
    // 允许局部更新，避免每次都手动传完整对象。
    layerVisibility.value = {
      ...layerVisibility.value,
      ...patch
    };
  }

  function setSelectedEntity(target: MapFocusTarget | null): void {
    selectedEntity.value = target;
  }

  function setSearchResults(items: MapSearchItem[]): void {
    searchResults.value = items;
  }

  function setViewport(nextViewport: Partial<MapViewportState>): void {
    viewport.value = {
      ...viewport.value,
      ...nextViewport
    };
  }

  return {
    mapInstance,
    layerVisibility,
    selectedEntity,
    searchResults,
    viewport,
    hasSearchResults,
    setMap,
    setLayerVisibility,
    setSelectedEntity,
    setSearchResults,
    setViewport
  };
});
