import type { AxiosRequestConfig } from 'axios';
import type { PagedResult } from '@/types/api';
import type { EntityId } from '@/types/entity';
import type {
  BoundaryFeatureCollection,
  MapBoundary,
  MapBoundaryListItem,
  QueryMapBoundaryParams,
  SaveMapBoundaryPayload
} from '@/types/boundary';
import { deleteRequest, getRequest, postRequest, putRequest } from '@/api/http';

export function getMapBoundaries(params: QueryMapBoundaryParams): Promise<PagedResult<MapBoundaryListItem>> {
  return getRequest('/map/boundaries', {
    params
  });
}

export function getMapBoundaryById(id: EntityId): Promise<MapBoundary> {
  return getRequest(`/map/boundaries/${id}`);
}

export function getMapBoundariesGeoJson(
  params: QueryMapBoundaryParams,
  config?: AxiosRequestConfig
): Promise<BoundaryFeatureCollection> {
  return getRequest('/map/boundaries/geojson', {
    params,
    ...config
  });
}

export function createMapBoundary(payload: SaveMapBoundaryPayload): Promise<MapBoundary> {
  return postRequest('/map/boundaries', payload);
}

export function updateMapBoundary(id: EntityId, payload: SaveMapBoundaryPayload): Promise<MapBoundary> {
  return putRequest(`/map/boundaries/${id}`, payload);
}

export function deleteMapBoundary(id: EntityId): Promise<boolean> {
  return deleteRequest(`/map/boundaries/${id}`);
}
