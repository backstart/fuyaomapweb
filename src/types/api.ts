// Backend success payloads can arrive either as raw data or wrapped in Result<T>.
// These interfaces describe the wrapped shape and the paging contract used by list APIs.
export interface ApiResult<T> {
  success: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  data?: T | null;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Shared UI pagination state mirrors backend fields so table components can bind directly.
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// Standard option shape reused by filters and selects across views.
export interface SelectOption<T extends string | number = string> {
  label: string;
  value: T;
}
