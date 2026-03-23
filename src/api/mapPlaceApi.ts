import type { AxiosRequestConfig } from 'axios';
import type { PagedResult } from '@/types/api';
import type { EntityId } from '@/types/entity';
import type { MapPlace, MapPlaceListItem, PlaceFeatureCollection, QueryMapPlaceParams, SaveMapPlacePayload } from '@/types/place';
import { deleteRequest, getRequest, postRequest, putRequest } from '@/api/http';

export function getMapPlaces(params: QueryMapPlaceParams): Promise<PagedResult<MapPlaceListItem>> {
  return getRequest('/map/places', {
    params
  });
}

export function getMapPlaceById(id: EntityId): Promise<MapPlace> {
  return getRequest(`/map/places/${id}`);
}

export function getMapPlacesGeoJson(
  params: QueryMapPlaceParams,
  config?: AxiosRequestConfig
): Promise<PlaceFeatureCollection> {
  return getRequest('/map/places/geojson', {
    params,
    ...config
  });
}

export function createMapPlace(payload: SaveMapPlacePayload): Promise<MapPlace> {
  return postRequest('/map/places', payload);
}

export function updateMapPlace(id: EntityId, payload: SaveMapPlacePayload): Promise<MapPlace> {
  return putRequest(`/map/places/${id}`, payload);
}

export function deleteMapPlace(id: EntityId): Promise<boolean> {
  return deleteRequest(`/map/places/${id}`);
}
