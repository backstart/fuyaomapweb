import type { PagedResult } from '@/types/api';
import type { MapSearchItem, MapSearchParams } from '@/types/map';
import { getRequest } from '@/api/http';

export function searchMap(params: MapSearchParams): Promise<PagedResult<MapSearchItem>> {
  return getRequest('/map/search', {
    params
  });
}
