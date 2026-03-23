import type { PagedResult } from '@/types/api';
import type { EntityId } from '@/types/entity';
import type { AreaFeatureCollection, MapArea, MapAreaListItem, QueryMapAreaParams } from '@/types/area';
import { getRequest } from '@/api/http';

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
export function getMapAreasGeoJson(params: QueryMapAreaParams): Promise<AreaFeatureCollection> {
  return getRequest('/map/areas/geojson', {
    params
  });
}
