import type { PagedResult } from '@/types/api';
import type { MapPlace, MapPlaceListItem, PlaceFeatureCollection, QueryMapPlaceParams, SaveMapPlacePayload } from '@/types/place';
import { deleteRequest, getRequest, postRequest, putRequest } from '@/api/http';

export function getMapPlaces(params: QueryMapPlaceParams): Promise<PagedResult<MapPlaceListItem>> {
  return getRequest('/map/places', {
    params
  });
}

export function getMapPlaceById(id: number): Promise<MapPlace> {
  return getRequest(`/map/places/${id}`);
}

export function getMapPlacesGeoJson(params: QueryMapPlaceParams): Promise<PlaceFeatureCollection> {
  return getRequest('/map/places/geojson', {
    params
  });
}

export function createMapPlace(payload: SaveMapPlacePayload): Promise<MapPlace> {
  return postRequest('/map/places', payload);
}

export function updateMapPlace(id: number, payload: SaveMapPlacePayload): Promise<MapPlace> {
  return putRequest(`/map/places/${id}`, payload);
}

export function deleteMapPlace(id: number): Promise<boolean> {
  return deleteRequest(`/map/places/${id}`);
}
