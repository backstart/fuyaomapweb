import { getRequest, postRequest, putRequest } from '@/api/http';
import type { MapLabel, QueryMapLabelParams, SaveMapLabelPayload } from '@/types/mapLabel';

export function queryMapLabels(params: QueryMapLabelParams): Promise<MapLabel[]> {
  return getRequest('/map/labels', {
    params
  });
}

export function getMapLabelDetail(id: string | number): Promise<MapLabel> {
  return getRequest(`/map/labels/${id}`);
}

export function createMapLabel(payload: SaveMapLabelPayload): Promise<MapLabel> {
  return postRequest('/map/labels', payload);
}

export function updateMapLabel(id: string | number, payload: SaveMapLabelPayload): Promise<MapLabel> {
  return putRequest(`/map/labels/${id}`, payload);
}
