export type BasemapFeatureKind = 'building' | 'road' | 'water' | 'boundary';
export type BasemapActionType = 'create' | 'update' | 'delete';
export type BasemapPublishStatus = 'ready_for_basemap_publish' | 'published_to_basemap' | 'superseded' | 'rolled_back';
export type BasemapBuildStatus = 'building' | 'success' | 'failed';

export interface BasemapFeatureChange {
  id: string;
  featureKind: BasemapFeatureKind | string;
  actionType: BasemapActionType | string;
  displayName?: string | null;
  sourceDataTable?: string | null;
  sourceDataId?: string | null;
  originSubmissionId?: string | null;
  targetBasemapObjectId?: string | null;
  categoryCode?: string | null;
  typeCode?: string | null;
  geometryType?: string | null;
  publishStatus: BasemapPublishStatus | string;
  approvedByUserId?: string | null;
  approvedByDisplayName?: string | null;
  approvedAt?: string | null;
  readyForPublishAt?: string | null;
  publishedVersionId?: string | null;
  publishedAt?: string | null;
  remark?: string | null;
  createTime: string;
  updateTime: string;
  payload: Record<string, unknown>;
  geometryGeoJson?: string | null;
}

export interface BasemapVersion {
  id: string;
  versionCode: string;
  title: string;
  description?: string | null;
  buildStatus: BasemapBuildStatus | string;
  totalChangeCount: number;
  tilesPath?: string | null;
  tilesUrl?: string | null;
  styleUrl?: string | null;
  sourceSnapshotPath?: string | null;
  buildLog?: string | null;
  isCurrent: boolean;
  builtAt?: string | null;
  activatedAt?: string | null;
  builtByUserId?: string | null;
  builtByDisplayName?: string | null;
  createTime: string;
  updateTime: string;
}

export interface QueryBasemapFeatureChangesParams {
  publishStatus?: BasemapPublishStatus | '';
  featureKind?: BasemapFeatureKind | '';
  actionType?: BasemapActionType | '';
  keyword?: string;
}

export interface CreateBasemapFeatureChangePayload {
  featureKind: BasemapFeatureKind;
  actionType: BasemapActionType;
  displayName?: string | null;
  sourceDataTable?: string | null;
  sourceDataId?: string | null;
  targetBasemapObjectId?: string | null;
  categoryCode?: string | null;
  typeCode?: string | null;
  geometryType?: string | null;
  geometryGeoJson?: string | null;
  payload?: Record<string, unknown>;
  remark?: string | null;
}

export interface CreateBasemapAreaPublishPayload {
  actionType?: Extract<BasemapActionType, 'create' | 'update'>;
  remark?: string | null;
}

export interface PublishBasemapVersionPayload {
  title: string;
  description?: string | null;
  changeIds?: string[];
  publishAllReadyChanges?: boolean;
  activateOnSuccess?: boolean;
}
