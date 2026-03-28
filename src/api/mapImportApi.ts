import type { PagedResult } from '@/types/api';
import type {
  MapImportAvailableFile,
  CreateMapImportTaskPayload,
  MapImportTask,
  MapImportTaskLog,
  MapImportUploadedFile,
  QueryMapImportTasksParams
} from '@/types/import';
import { deleteRequest, getRequest, postRequest } from '@/api/http';

// 上传接口只负责把文件保存到服务器导入目录，真正的导入任务由后续 create/start 控制。
export function uploadMapImportFile(file: File): Promise<MapImportUploadedFile> {
  const formData = new FormData();
  formData.append('file', file);

  return postRequest<MapImportUploadedFile, FormData>('/map/imports/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    // 大型 OSM 文件上传耗时明显长于普通 JSON 请求，这里单独放宽超时。
    timeout: 30 * 60 * 1000
  });
}

export function getMapImportAvailableFiles(): Promise<MapImportAvailableFile[]> {
  return getRequest<MapImportAvailableFile[]>('/map/imports/files');
}

export function deleteMapImportAvailableFile(filePath: string): Promise<boolean> {
  return deleteRequest<boolean>('/map/imports/files', {
    params: {
      filePath
    }
  });
}

export function createMapImportTask(payload: CreateMapImportTaskPayload): Promise<MapImportTask> {
  return postRequest<MapImportTask, CreateMapImportTaskPayload>('/map/imports', {
    importType: payload.importType ?? 'osm',
    ...payload
  });
}

export function startMapImportTask(id: string): Promise<MapImportTask> {
  return postRequest<MapImportTask, undefined>(`/map/imports/${id}/start`);
}

export function cancelMapImportTask(id: string): Promise<MapImportTask> {
  return postRequest<MapImportTask, undefined>(`/map/imports/${id}/cancel`);
}

export function getMapImportTasks(params: QueryMapImportTasksParams): Promise<PagedResult<MapImportTask>> {
  return getRequest('/map/imports', {
    params
  });
}

export function getMapImportTask(id: string): Promise<MapImportTask> {
  return getRequest(`/map/imports/${id}`);
}

export function getMapImportTaskLogs(id: string): Promise<MapImportTaskLog[]> {
  return getRequest(`/map/imports/${id}/logs`);
}
