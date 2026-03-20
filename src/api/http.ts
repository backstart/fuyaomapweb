import axios, { type AxiosRequestConfig } from 'axios';
import type { ApiResult } from '@/types/api';

export class ApiError extends Error {
  public readonly code?: string | null;
  public readonly status?: number;

  public constructor(message: string, options?: { code?: string | null; status?: number }) {
    super(message);
    this.name = 'ApiError';
    this.code = options?.code;
    this.status = options?.status;
  }
}

function isApiResult<T>(value: unknown): value is ApiResult<T> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'success' in value || 'errorCode' in value || 'errorMessage' in value || 'data' in value;
}

function extractData<T>(payload: T | ApiResult<T>): T {
  if (!isApiResult<T>(payload)) {
    return payload;
  }

  if (payload.success) {
    return payload.data as T;
  }

  throw new ApiError(payload.errorMessage || '请求失败', {
    code: payload.errorCode
  });
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 20000
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const payload = error.response?.data;
    if (isApiResult(payload)) {
      return Promise.reject(
        new ApiError(payload.errorMessage || '请求失败', {
          code: payload.errorCode,
          status: error.response?.status
        })
      );
    }

    if (error.response) {
      return Promise.reject(
        new ApiError(`请求失败（HTTP ${error.response.status}）`, {
          status: error.response.status
        })
      );
    }

    return Promise.reject(new ApiError(error.message || '网络连接失败'));
  }
);

export async function getRequest<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await http.get<T | ApiResult<T>>(url, config);
  return extractData(response.data);
}

export async function postRequest<T, TBody>(url: string, body?: TBody, config?: AxiosRequestConfig): Promise<T> {
  const response = await http.post<T | ApiResult<T>>(url, body, config);
  return extractData(response.data);
}

export async function putRequest<T, TBody>(url: string, body?: TBody, config?: AxiosRequestConfig): Promise<T> {
  const response = await http.put<T | ApiResult<T>>(url, body, config);
  return extractData(response.data);
}

export async function deleteRequest<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await http.delete<T | ApiResult<T>>(url, config);
  return extractData(response.data);
}

export default http;
