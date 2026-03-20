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

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SelectOption<T extends string | number = string> {
  label: string;
  value: T;
}
