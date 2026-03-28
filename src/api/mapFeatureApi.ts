import type { AxiosRequestConfig } from 'axios';
import { getRequest } from '@/api/http';
import type { MapViewportFeature, MapViewportFeatureCollection, QueryMapViewportFeaturesParams } from '@/types/mapFeature';

type MapViewportFeatureResponse = Omit<MapViewportFeature, 'id' | 'aliasNames'> & {
  id: string | number;
  aliasNames?: string[] | null;
};

type MapViewportFeatureCollectionResponse = {
  items?: MapViewportFeatureResponse[] | null;
  limit?: number;
  hasMore?: boolean;
};

function normalizeFeature(item: MapViewportFeatureResponse): MapViewportFeature {
  return {
    ...item,
    id: String(item.id),
    aliasNames: Array.isArray(item.aliasNames) ? item.aliasNames : []
  };
}

export async function queryMapViewportFeatures(
  params: QueryMapViewportFeaturesParams,
  config?: AxiosRequestConfig
): Promise<MapViewportFeatureCollection> {
  const response = await getRequest<MapViewportFeatureCollectionResponse>('/map/features/viewport', {
    ...config,
    params
  });

  return {
    items: Array.isArray(response.items) ? response.items.map(normalizeFeature) : [],
    limit: typeof response.limit === 'number' ? response.limit : params.limit ?? 0,
    hasMore: Boolean(response.hasMore)
  };
}
