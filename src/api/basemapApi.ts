import { getRequest, postRequest } from '@/api/http';
import type {
  BasemapFeatureChange,
  BasemapVersion,
  CreateBasemapAreaPublishPayload,
  CreateBasemapFeatureChangePayload,
  PublishBasemapVersionPayload,
  QueryBasemapFeatureChangesParams
} from '@/types/basemap';
import type { EntityId } from '@/types/entity';

export function queryBasemapFeatureChanges(params: QueryBasemapFeatureChangesParams): Promise<BasemapFeatureChange[]> {
  return getRequest('/basemap/changes', {
    params
  });
}

export function getBasemapFeatureChange(id: EntityId): Promise<BasemapFeatureChange> {
  return getRequest(`/basemap/changes/${id}`);
}

export function createBasemapFeatureChange(payload: CreateBasemapFeatureChangePayload): Promise<BasemapFeatureChange> {
  return postRequest('/basemap/changes', {
    ...payload,
    payload: payload.payload ?? {}
  });
}

export function enqueueBasemapArea(areaId: EntityId, payload: CreateBasemapAreaPublishPayload): Promise<BasemapFeatureChange> {
  return postRequest(`/basemap/changes/areas/${areaId}`, payload);
}

export function queryBasemapVersions(): Promise<BasemapVersion[]> {
  return getRequest('/basemap/versions');
}

export function getCurrentBasemapVersion(): Promise<BasemapVersion> {
  return getRequest('/basemap/versions/current');
}

export function getBasemapVersion(id: EntityId): Promise<BasemapVersion> {
  return getRequest(`/basemap/versions/${id}`);
}

export function getBasemapVersionChanges(id: EntityId): Promise<BasemapFeatureChange[]> {
  return getRequest(`/basemap/versions/${id}/changes`);
}

export function publishBasemapVersion(payload: PublishBasemapVersionPayload): Promise<BasemapVersion> {
  return postRequest('/basemap/versions/publish', {
    title: payload.title,
    description: payload.description ?? null,
    changeIds: payload.changeIds ?? [],
    publishAllReadyChanges: payload.publishAllReadyChanges ?? true,
    activateOnSuccess: payload.activateOnSuccess ?? true
  });
}

export function activateBasemapVersion(id: EntityId): Promise<BasemapVersion> {
  return postRequest(`/basemap/versions/${id}/activate`);
}
