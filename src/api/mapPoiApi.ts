import type { AxiosRequestConfig } from 'axios';
import type { PagedResult } from '@/types/api';
import type { EntityId } from '@/types/entity';
import type { MapPoi, MapPoiListItem, PoiFeatureCollection, QueryMapPoiParams, SaveMapPoiPayload } from '@/types/poi';
import { deleteRequest, getRequest, postRequest, putRequest } from '@/api/http';

export function getMapPois(params: QueryMapPoiParams): Promise<PagedResult<MapPoiListItem>> {
  return getRequest('/map/pois', {
    params
  });
}

export function getMapPoiById(id: EntityId): Promise<MapPoi> {
  return getRequest(`/map/pois/${id}`);
}

export function getMapPoisGeoJson(
  params: QueryMapPoiParams,
  config?: AxiosRequestConfig
): Promise<PoiFeatureCollection> {
  return getRequest('/map/pois/geojson', {
    params,
    ...config
  });
}

export function createMapPoi(payload: SaveMapPoiPayload): Promise<MapPoi> {
  return postRequest('/map/pois', payload);
}

export function updateMapPoi(id: EntityId, payload: SaveMapPoiPayload): Promise<MapPoi> {
  return putRequest(`/map/pois/${id}`, payload);
}

export function deleteMapPoi(id: EntityId): Promise<boolean> {
  return deleteRequest(`/map/pois/${id}`);
}
