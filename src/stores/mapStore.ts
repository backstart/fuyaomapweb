import { computed, ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { LayerVisibility, MapFocusTarget, MapSearchItem, MapViewportState } from '@/types/map';

export const useMapStore = defineStore('map', () => {
  const mapInstance = shallowRef<MapLibreMap | null>(null);
  const layerVisibility = ref<LayerVisibility>({
    shops: true,
    areas: true
  });
  const selectedEntity = ref<MapFocusTarget | null>(null);
  const searchResults = ref<MapSearchItem[]>([]);
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
