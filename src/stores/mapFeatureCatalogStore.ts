import { ref } from 'vue';
import { defineStore } from 'pinia';
import { getMapFeatureSchema } from '@/api/mapFeatureTypeApi';
import type { MapFeatureSchema } from '@/types/mapFeatureType';

export const useMapFeatureCatalogStore = defineStore('mapFeatureCatalog', () => {
  const schema = ref<MapFeatureSchema | null>(null);
  const loading = ref(false);
  const loaded = ref(false);
  const loadError = ref<string | null>(null);

  async function ensureLoaded(force = false): Promise<MapFeatureSchema> {
    if (schema.value && loaded.value && !force) {
      return schema.value;
    }

    loading.value = true;
    loadError.value = null;
    try {
      const nextSchema = await getMapFeatureSchema();
      schema.value = nextSchema;
      loaded.value = true;
      return nextSchema;
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : '地图要素分类字典加载失败';
      throw error;
    } finally {
      loading.value = false;
    }
  }

  return {
    schema,
    loading,
    loaded,
    loadError,
    ensureLoaded
  };
});
