import type { PagedResult } from '@/types/api';
import type { AreaFeatureCollection, MapArea, MapAreaListItem, QueryMapAreaParams } from '@/types/area';
import { getRequest } from '@/api/http';

export function getMapAreas(params: QueryMapAreaParams): Promise<PagedResult<MapAreaListItem>> {
  return getRequest('/map/areas', {
    params
  });
}

export function getMapAreaById(id: number): Promise<MapArea> {
  return getRequest(`/map/areas/${id}`);
}

export function getMapAreasGeoJson(params: QueryMapAreaParams): Promise<AreaFeatureCollection> {
  return getRequest('/map/areas/geojson', {
    params
  });
}
