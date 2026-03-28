import type { SaveMapAreaPayload } from '@/types/area';
import type { SaveMapLabelPayload } from '@/types/mapLabel';

export type SubmissionFeatureKind = 'label' | 'manual_building_area';
export type SubmissionStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type SubmissionScope = 'mine' | 'assigned' | 'all';
export type SubmissionPayload = SaveMapLabelPayload | SaveMapAreaPayload | Record<string, unknown>;

export interface MapFeatureSubmission {
  id: string;
  submitterUserId: string;
  submitterDisplayName: string;
  reviewerAdminId: string;
  reviewerAdminDisplayName: string;
  featureKind: SubmissionFeatureKind;
  actionType: string;
  displayName?: string | null;
  categoryCode?: string | null;
  typeCode?: string | null;
  geometryType?: string | null;
  status: SubmissionStatus;
  rejectionReason?: string | null;
  reviewComment?: string | null;
  reviewedByUserId?: string | null;
  reviewedByDisplayName?: string | null;
  approvedTargetTable?: string | null;
  approvedTargetId?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  createTime: string;
  updateTime: string;
  payload: SubmissionPayload;
}

export interface MapFeatureSubmissionReview {
  id: string;
  submissionId: string;
  action: string;
  fromStatus?: string | null;
  toStatus: string;
  comment?: string | null;
  operatorUserId: string;
  operatorDisplayName: string;
  operatorRoleCode: string;
  createTime: string;
}

export interface QueryMapFeatureSubmissionsParams {
  scope?: SubmissionScope;
  status?: SubmissionStatus | '';
  featureKind?: SubmissionFeatureKind | '';
  keyword?: string;
}

export interface CreateMapFeatureSubmissionPayload {
  featureKind: SubmissionFeatureKind;
  actionType?: 'create';
  status?: 'draft' | 'pending';
  payload: SubmissionPayload;
}

export interface UpdateMapFeatureSubmissionPayload {
  status?: 'draft' | 'pending';
  payload: SubmissionPayload;
}

export interface ApproveMapFeatureSubmissionPayload {
  reviewComment?: string | null;
}

export interface RejectMapFeatureSubmissionPayload {
  reviewComment: string;
}
