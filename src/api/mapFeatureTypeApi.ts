import { getRequest } from '@/api/http';
import type { MapFeatureSchema } from '@/types/mapFeatureType';

export function getMapFeatureSchema(): Promise<MapFeatureSchema> {
  return getRequest('/map/feature-types');
}
