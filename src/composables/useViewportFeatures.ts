import { computed, ref } from 'vue';
import { queryMapViewportFeatures } from '@/api/mapFeatureApi';
import type { MapViewportFeature, QueryMapViewportFeaturesParams } from '@/types/mapFeature';
import { buildViewportFeatureCollections } from '@/utils/mapViewportFeatures';
import { isRequestCanceled } from '@/utils/request';

export function useViewportFeatures() {
  const items = ref<MapViewportFeature[]>([]);
  const loading = ref(false);
  let abortController: AbortController | null = null;

  const collections = computed(() => buildViewportFeatureCollections(items.value));

  async function fetchViewportFeatures(params: QueryMapViewportFeaturesParams): Promise<boolean> {
    cancelViewportFeatureRequest('replaced-by-new-viewport');
    const controller = new AbortController();
    abortController = controller;
    loading.value = true;

    try {
      const response = await queryMapViewportFeatures(params, {
        signal: controller.signal
      });

      if (abortController !== controller) {
        return false;
      }

      items.value = response.items;
      return true;
    } catch (error) {
      if (isRequestCanceled(error) || controller.signal.aborted) {
        return false;
      }

      throw error;
    } finally {
      if (abortController === controller) {
        loading.value = false;
        abortController = null;
      }
    }
  }

  function cancelViewportFeatureRequest(reason?: string): void {
    if (!abortController) {
      return;
    }

    if (import.meta.env.DEV) {
      console.debug('[ViewportFeatures] cancel request', reason ?? 'manual');
    }

    abortController.abort();
    abortController = null;
    loading.value = false;
  }

  function clearViewportFeatures(): void {
    items.value = [];
  }

  return {
    items,
    loading,
    collections,
    fetchViewportFeatures,
    cancelViewportFeatureRequest,
    clearViewportFeatures
  };
}
