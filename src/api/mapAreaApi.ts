import type { AxiosRequestConfig } from 'axios';
import type { PagedResult } from '@/types/api';
import type { EntityId } from '@/types/entity';
import type { AreaFeatureCollection, MapArea, MapAreaListItem, QueryMapAreaParams, SaveMapAreaPayload } from '@/types/area';
import { deleteRequest, getRequest, postRequest, putRequest } from '@/api/http';

// 区域列表用于表格分页。
export function getMapAreas(params: QueryMapAreaParams): Promise<PagedResult<MapAreaListItem>> {
  return getRequest('/map/areas', {
    params
  });
}

// 详情接口用于地图 fitBounds、弹窗和后续编辑扩展。
export function getMapAreaById(id: EntityId): Promise<MapArea> {
  return getRequest(`/map/areas/${id}`);
}

// 区域几何由后端直接输出为 FeatureCollection。
export function getMapAreasGeoJson(
  params: QueryMapAreaParams,
  config?: AxiosRequestConfig
): Promise<AreaFeatureCollection> {
  return getRequest('/map/areas/geojson', {
    params,
    ...config
  });
}

export function createMapArea(payload: SaveMapAreaPayload): Promise<MapArea> {
  return postRequest('/map/areas', payload);
}

export function updateMapArea(id: EntityId, payload: SaveMapAreaPayload): Promise<MapArea> {
  return putRequest(`/map/areas/${id}`, payload);
}

export function deleteMapArea(id: EntityId): Promise<boolean> {
  return deleteRequest(`/map/areas/${id}`);
}
