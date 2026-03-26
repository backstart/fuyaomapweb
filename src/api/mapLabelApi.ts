import { getRequest, postRequest, putRequest } from '@/api/http';
import type { MapLabel, QueryMapLabelParams, SaveMapLabelPayload } from '@/types/mapLabel';

type MapLabelResponse = Omit<MapLabel, 'id'> & {
  id: string | number;
};

function normalizeMapLabel(item: MapLabelResponse): MapLabel {
  return {
    ...item,
    id: String(item.id)
  };
}

export async function queryMapLabels(params: QueryMapLabelParams): Promise<MapLabel[]> {
  const items = await getRequest<MapLabelResponse[]>('/map/labels', {
    params
  });

  return items.map(normalizeMapLabel);
}

export async function getMapLabelDetail(id: string | number): Promise<MapLabel> {
  const item = await getRequest<MapLabelResponse>(`/map/labels/${id}`);
  return normalizeMapLabel(item);
}

export async function createMapLabel(payload: SaveMapLabelPayload): Promise<MapLabel> {
  const item = await postRequest<MapLabelResponse, SaveMapLabelPayload>('/map/labels', payload);
  return normalizeMapLabel(item);
}

export async function updateMapLabel(id: string | number, payload: SaveMapLabelPayload): Promise<MapLabel> {
  const item = await putRequest<MapLabelResponse, SaveMapLabelPayload>(`/map/labels/${id}`, payload);
  return normalizeMapLabel(item);
}
