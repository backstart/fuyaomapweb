import type { PagedResult } from '@/types/api';
import type { MapSearchItem, MapSearchParams } from '@/types/map';
import { getRequest } from '@/api/http';

// 搜索接口会同时命中店铺和区域，前端再按 itemType 分流定位逻辑。
export function searchMap(params: MapSearchParams): Promise<PagedResult<MapSearchItem>> {
  return getRequest('/map/search', {
    params
  });
}
