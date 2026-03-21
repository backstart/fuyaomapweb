export type MapImportTaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

// 与后端导入任务 DTO 对齐，页面直接用它渲染列表、详情和轮询状态。
export interface MapImportTask {
  id: string;
  importType: string;
  fileName?: string | null;
  filePath?: string | null;
  fileSize?: number | null;
  bbox?: string | null;
  importShops: boolean;
  importAreas: boolean;
  status: MapImportTaskStatus | string;
  progress: number;
  totalCount: number;
  successCount: number;
  failedCount: number;
  message?: string | null;
  startedTime?: string | null;
  finishedTime?: string | null;
  createTime: string;
  createBy?: string | null;
}

export interface MapImportTaskLog {
  id: string;
  taskId: string;
  level: 'info' | 'warn' | 'error' | string;
  message: string;
  createTime: string;
}

export interface MapImportUploadedFile {
  fileName: string;
  filePath: string;
  fileSize: number;
}

export interface CreateMapImportTaskPayload {
  importType?: string;
  fileName?: string;
  filePath: string;
  bbox?: string;
  importShops: boolean;
  importAreas: boolean;
  createBy?: string;
}

export interface QueryMapImportTasksParams {
  status?: string;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface ImportTaskCreateOptions {
  fileName?: string;
  bbox?: string;
  importShops: boolean;
  importAreas: boolean;
  createBy?: string;
  autoStart: boolean;
}

export interface UploadImportSubmitPayload extends ImportTaskCreateOptions {
  file: File;
}

export interface ServerPathImportSubmitPayload extends ImportTaskCreateOptions {
  filePath: string;
}
