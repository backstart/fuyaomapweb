import type { PagedResult } from '@/types/api';
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

export function getMapBoundaryById(id: number): Promise<MapBoundary> {
  return getRequest(`/map/boundaries/${id}`);
}

export function getMapBoundariesGeoJson(params: QueryMapBoundaryParams): Promise<BoundaryFeatureCollection> {
  return getRequest('/map/boundaries/geojson', {
    params
  });
}

export function createMapBoundary(payload: SaveMapBoundaryPayload): Promise<MapBoundary> {
  return postRequest('/map/boundaries', payload);
}

export function updateMapBoundary(id: number, payload: SaveMapBoundaryPayload): Promise<MapBoundary> {
  return putRequest(`/map/boundaries/${id}`, payload);
}

export function deleteMapBoundary(id: number): Promise<boolean> {
  return deleteRequest(`/map/boundaries/${id}`);
}
