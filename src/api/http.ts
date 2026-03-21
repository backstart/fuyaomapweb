import axios, { type AxiosRequestConfig } from 'axios';
import { appConfig } from '@/config/appConfig';
import type { ApiResult } from '@/types/api';
import { clearPersistedAuthSession, getStoredAccessToken } from '@/utils/authSession';

// 后端成功时直接返回业务数据，失败时才会返回 Result<T>。
// 这里统一收口两种形态，避免页面层自己判断。
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
  // 成功响应大多数情况下已经是业务对象本身，直接透传。
  if (!isApiResult<T>(payload)) {
    return payload;
  }

  // 错误响应走 Result<T> 时，在这里统一抛成可处理的异常。
  if (payload.success) {
    return payload.data as T;
  }

  throw new ApiError(payload.errorMessage || '请求失败', {
    code: payload.errorCode
  });
}

function resolveApiBaseUrl(rawBaseUrl: string): string {
  // 兼容三种写法：
  // 1. http://host:port      -> 自动补成 /api
  // 2. /api                 -> 保持给 nginx 代理
  // 3. 已带版本号的旧地址     -> 自动归一化成 /api
  const normalized = rawBaseUrl.trim().replace(/\/+$/, '');

  if (!normalized) {
    return '/api';
  }

  if (/\/api\/[^/]+$/i.test(normalized)) {
    return normalized.replace(/\/api\/[^/]+$/i, '/api');
  }

  if (normalized.endsWith('/api')) {
    return normalized;
  }

  return `${normalized}/api`;
}

const http = axios.create({
  baseURL: resolveApiBaseUrl(appConfig.apiBaseUrl),
  timeout: 20000
});

http.interceptors.request.use((config) => {
  const accessToken = getStoredAccessToken();
  if (accessToken) {
    config.headers = config.headers ?? {};
    if (!('Authorization' in config.headers)) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    // 后端校验失败、找不到资源等情况会把 Result<T> 直接返回给前端。
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
      if (error.response.status === 401) {
        clearPersistedAuthSession();

        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          window.location.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
        }
      }

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

// 下面几个薄封装的目标是让业务 API 文件只关心路径和类型。
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
