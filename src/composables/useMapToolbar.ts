import { computed, ref } from 'vue';

export type MapToolbarPanelKey = 'layers' | 'filter' | 'label' | 'building';

export function useMapToolbar() {
  const activePanel = ref<MapToolbarPanelKey | null>(null);
  const isPanelOpen = computed(() => activePanel.value !== null);

  function togglePanel(panel: MapToolbarPanelKey): void {
    activePanel.value = activePanel.value === panel ? null : panel;
  }

  function openPanel(panel: MapToolbarPanelKey): void {
    activePanel.value = panel;
  }

  function closePanel(): void {
    activePanel.value = null;
  }

  return {
    activePanel,
    isPanelOpen,
    togglePanel,
    openPanel,
    closePanel
  };
}
