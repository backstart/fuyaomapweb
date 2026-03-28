import { getRequest, postRequest, putRequest } from '@/api/http';
import type {
  ApproveMapFeatureSubmissionPayload,
  CreateMapFeatureSubmissionPayload,
  MapFeatureSubmission,
  MapFeatureSubmissionReview,
  QueryMapFeatureSubmissionsParams,
  RejectMapFeatureSubmissionPayload,
  UpdateMapFeatureSubmissionPayload
} from '@/types/submission';

export function queryMapFeatureSubmissions(params: QueryMapFeatureSubmissionsParams): Promise<MapFeatureSubmission[]> {
  return getRequest('/map/submissions', {
    params
  });
}

export function getMapFeatureSubmission(id: string): Promise<MapFeatureSubmission> {
  return getRequest(`/map/submissions/${id}`);
}

export function getMapFeatureSubmissionReviews(id: string): Promise<MapFeatureSubmissionReview[]> {
  return getRequest(`/map/submissions/${id}/reviews`);
}

export function createMapFeatureSubmission(payload: CreateMapFeatureSubmissionPayload): Promise<MapFeatureSubmission> {
  return postRequest('/map/submissions', payload);
}

export function updateMapFeatureSubmission(id: string, payload: UpdateMapFeatureSubmissionPayload): Promise<MapFeatureSubmission> {
  return putRequest(`/map/submissions/${id}`, payload);
}

export function approveMapFeatureSubmission(id: string, payload: ApproveMapFeatureSubmissionPayload): Promise<MapFeatureSubmission> {
  return postRequest(`/map/submissions/${id}/approve`, payload);
}

export function rejectMapFeatureSubmission(id: string, payload: RejectMapFeatureSubmissionPayload): Promise<MapFeatureSubmission> {
  return postRequest(`/map/submissions/${id}/reject`, payload);
}
