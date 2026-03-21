<template>
  <PageContainer
    title="导入管理"
    eyebrow="Imports"
    description="从 Web 页面上传或指定服务器上的 OSM 原始数据文件，异步导入店铺与区域业务表。"
  >
    <template #actions>
      <el-button :loading="listLoading" @click="refreshNow">刷新任务</el-button>
    </template>

    <div class="import-page">
      <ImportUploadPanel
        :upload-loading="uploadLoading"
        :path-loading="pathLoading"
        @upload-submit="handleUploadSubmit"
        @path-submit="handleServerPathSubmit"
      />

      <el-card shadow="never" class="filter-card">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="状态">
            <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 150px">
              <el-option label="待执行" value="pending" />
              <el-option label="执行中" value="running" />
              <el-option label="成功" value="success" />
              <el-option label="失败" value="failed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键字">
            <el-input
              v-model="filters.keyword"
              placeholder="按文件名、路径或消息搜索"
              clearable
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="listLoading" @click="search">查询</el-button>
            <el-button @click="reset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <ImportTaskTable
        :tasks="tasks"
        :loading="listLoading"
        :page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        @detail="openTaskDetail"
        @logs="openTaskLogs"
        @start="startTask"
        @cancel="cancelTask"
        @page-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <el-dialog v-model="detailDialogVisible" title="导入任务详情" width="860px">
      <el-skeleton v-if="detailLoading" :rows="8" animated />
      <template v-else-if="selectedTask">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务ID">{{ selectedTask.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(selectedTask.status)" effect="light">
              {{ getStatusLabel(selectedTask.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="文件名">{{ selectedTask.fileName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ formatFileSize(selectedTask.fileSize) }}</el-descriptions-item>
          <el-descriptions-item label="文件路径" :span="2">{{ selectedTask.filePath || '-' }}</el-descriptions-item>
          <el-descriptions-item label="BBox" :span="2">{{ selectedTask.bbox || '-' }}</el-descriptions-item>
          <el-descriptions-item label="导入目标">
            {{ formatImportTargets(selectedTask.importShops, selectedTask.importAreas) }}
          </el-descriptions-item>
          <el-descriptions-item label="创建人">{{ selectedTask.createBy || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(selectedTask.createTime) }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatDateTime(selectedTask.startedTime) }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ formatDateTime(selectedTask.finishedTime) }}</el-descriptions-item>
          <el-descriptions-item label="统计">
            总 {{ selectedTask.totalCount }} / 成 {{ selectedTask.successCount }} / 败 {{ selectedTask.failedCount }}
          </el-descriptions-item>
          <el-descriptions-item label="进度" :span="2">
            <el-progress
              :percentage="selectedTask.progress"
              :status="getProgressStatus(selectedTask.status)"
              :stroke-width="10"
            />
          </el-descriptions-item>
          <el-descriptions-item label="消息" :span="2">
            <span class="task-message">{{ selectedTask.message || '-' }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>

    <el-dialog v-model="logsDialogVisible" title="导入日志" width="900px">
      <ImportTaskLogs :logs="taskLogs" :loading="logsLoading" />
    </el-dialog>
  </PageContainer>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import PageContainer from '@/components/common/PageContainer.vue';
import ImportUploadPanel from '@/components/import/ImportUploadPanel.vue';
import ImportTaskTable from '@/components/import/ImportTaskTable.vue';
import ImportTaskLogs from '@/components/import/ImportTaskLogs.vue';
import { ApiError } from '@/api/http';
import {
  cancelMapImportTask,
  createMapImportTask,
  getMapImportTask,
  getMapImportTaskLogs,
  getMapImportTasks,
  startMapImportTask,
  uploadMapImportFile
} from '@/api/mapImportApi';
import type { PaginationState } from '@/types/api';
import type {
  CreateMapImportTaskPayload,
  MapImportTask,
  MapImportTaskLog,
  ServerPathImportSubmitPayload,
  UploadImportSubmitPayload
} from '@/types/import';
import { formatDateTime } from '@/utils/format';

const tasks = ref<MapImportTask[]>([]);
const taskLogs = ref<MapImportTaskLog[]>([]);

const listLoading = ref(false);
const uploadLoading = ref(false);
const pathLoading = ref(false);
const detailLoading = ref(false);
const logsLoading = ref(false);

const filters = reactive({
  status: '',
  keyword: ''
});

const pagination = reactive<PaginationState>({
  page: 1,
  pageSize: 20,
  total: 0
});

const detailDialogVisible = ref(false);
const logsDialogVisible = ref(false);
const selectedTask = ref<MapImportTask | null>(null);
const selectedLogsTaskId = ref<string | null>(null);
let pollTimer: number | null = null;

async function fetchTasks(options?: { silent?: boolean; page?: number; pageSize?: number }): Promise<void> {
  const silent = options?.silent ?? false;
  if (!silent) {
    listLoading.value = true;
  }

  try {
    const page = options?.page ?? pagination.page;
    const pageSize = options?.pageSize ?? pagination.pageSize;
    const result = await getMapImportTasks({
      status: filters.status || undefined,
      keyword: filters.keyword || undefined,
      page,
      pageSize
    });

    tasks.value = result.items;
    pagination.page = result.page;
    pagination.pageSize = result.pageSize;
    pagination.total = result.total;

    if (selectedTask.value) {
      const matched = result.items.find((item) => item.id === selectedTask.value?.id);
      if (matched) {
        selectedTask.value = matched;
      }
    }
  } finally {
    if (!silent) {
      listLoading.value = false;
    }
  }
}

async function search(): Promise<void> {
  try {
    await fetchTasks({ page: 1 });
  } catch (error) {
    showError(error, '导入任务列表加载失败');
  }
}

async function reset(): Promise<void> {
  filters.status = '';
  filters.keyword = '';
  await search();
}

async function refreshNow(): Promise<void> {
  try {
    await fetchTasks();
    if (selectedTask.value) {
      await refreshTaskDetail(selectedTask.value.id, true);
    }
    if (selectedLogsTaskId.value) {
      await refreshTaskLogs(selectedLogsTaskId.value, true);
    }
    ElMessage.success('任务列表已刷新');
  } catch (error) {
    showError(error, '刷新导入任务失败');
  }
}

async function handleUploadSubmit(payload: UploadImportSubmitPayload): Promise<void> {
  uploadLoading.value = true;
  try {
    const uploaded = await uploadMapImportFile(payload.file);
    const task = await createTask({
      fileName: uploaded.fileName,
      filePath: uploaded.filePath,
      bbox: payload.bbox,
      importShops: payload.importShops,
      importAreas: payload.importAreas,
      createBy: payload.createBy
    }, payload.autoStart);

    ElMessage.success(`导入任务 ${task.id} 已创建`);
    await fetchTasks({ page: 1 });
  } catch (error) {
    showError(error, '上传并创建导入任务失败');
  } finally {
    uploadLoading.value = false;
  }
}

async function handleServerPathSubmit(payload: ServerPathImportSubmitPayload): Promise<void> {
  pathLoading.value = true;
  try {
    const task = await createTask({
      fileName: payload.fileName,
      filePath: payload.filePath,
      bbox: payload.bbox,
      importShops: payload.importShops,
      importAreas: payload.importAreas,
      createBy: payload.createBy
    }, payload.autoStart);

    ElMessage.success(`导入任务 ${task.id} 已创建`);
    await fetchTasks({ page: 1 });
  } catch (error) {
    showError(error, '创建导入任务失败');
  } finally {
    pathLoading.value = false;
  }
}

async function createTask(payload: CreateMapImportTaskPayload, autoStart: boolean): Promise<MapImportTask> {
  const task = await createMapImportTask(payload);
  if (!autoStart) {
    return task;
  }

  return startMapImportTask(task.id);
}

async function startTask(id: string): Promise<void> {
  try {
    await startMapImportTask(id);
    ElMessage.success(`任务 ${id} 已启动`);
    await fetchTasks({ silent: true });
    if (selectedTask.value?.id === id) {
      await refreshTaskDetail(id, true);
    }
  } catch (error) {
    showError(error, '启动导入任务失败');
  }
}

async function cancelTask(id: string): Promise<void> {
  try {
    await cancelMapImportTask(id);
    ElMessage.success(`任务 ${id} 已取消`);
    await fetchTasks({ silent: true });
    if (selectedTask.value?.id === id) {
      await refreshTaskDetail(id, true);
    }
  } catch (error) {
    showError(error, '取消导入任务失败');
  }
}

async function openTaskDetail(id: string): Promise<void> {
  detailDialogVisible.value = true;
  await refreshTaskDetail(id);
}

async function refreshTaskDetail(id: string, silent = false): Promise<void> {
  if (!silent) {
    detailLoading.value = true;
  }

  try {
    selectedTask.value = await getMapImportTask(id);
  } catch (error) {
    if (!silent) {
      showError(error, '导入任务详情加载失败');
    }
  } finally {
    if (!silent) {
      detailLoading.value = false;
    }
  }
}

async function openTaskLogs(id: string): Promise<void> {
  logsDialogVisible.value = true;
  selectedLogsTaskId.value = id;
  await refreshTaskLogs(id);
}

async function refreshTaskLogs(id: string, silent = false): Promise<void> {
  if (!silent) {
    logsLoading.value = true;
  }

  try {
    taskLogs.value = await getMapImportTaskLogs(id);
  } catch (error) {
    if (!silent) {
      showError(error, '导入日志加载失败');
    }
  } finally {
    if (!silent) {
      logsLoading.value = false;
    }
  }
}

async function handlePageChange(page: number): Promise<void> {
  try {
    await fetchTasks({ page });
  } catch (error) {
    showError(error, '导入任务列表加载失败');
  }
}

async function handleSizeChange(pageSize: number): Promise<void> {
  try {
    await fetchTasks({ page: 1, pageSize });
  } catch (error) {
    showError(error, '导入任务列表加载失败');
  }
}

function startPolling(): void {
  stopPolling();
  pollTimer = window.setInterval(() => {
    void pollTaskState();
  }, 5000);
}

function stopPolling(): void {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function pollTaskState(): Promise<void> {
  const hasActiveTask = tasks.value.some((item) => item.status === 'pending' || item.status === 'running');
  const detailActive = selectedTask.value && (selectedTask.value.status === 'pending' || selectedTask.value.status === 'running');

  if (!hasActiveTask && !detailActive) {
    return;
  }

  try {
    await fetchTasks({ silent: true });
    if (selectedTask.value) {
      await refreshTaskDetail(selectedTask.value.id, true);
    }
    if (selectedLogsTaskId.value) {
      await refreshTaskLogs(selectedLogsTaskId.value, true);
    }
  } catch {
    // 轮询失败不打断页面交互，下一轮继续重试。
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return '待执行';
    case 'running':
      return '执行中';
    case 'success':
      return '成功';
    case 'failed':
      return '失败';
    case 'cancelled':
      return '已取消';
    default:
      return status;
  }
}

function getStatusTagType(status: string): 'info' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'running':
      return 'warning';
    case 'success':
      return 'success';
    case 'failed':
      return 'danger';
    default:
      return 'info';
  }
}

function getProgressStatus(status: string): '' | 'success' | 'warning' | 'exception' {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
      return 'exception';
    case 'running':
      return 'warning';
    default:
      return '';
  }
}

function formatImportTargets(importShops: boolean, importAreas: boolean): string {
  if (importShops && importAreas) {
    return '店铺 + 区域';
  }

  if (importShops) {
    return '仅店铺';
  }

  if (importAreas) {
    return '仅区域';
  }

  return '-';
}

function formatFileSize(fileSize?: number | null): string {
  if (!fileSize || fileSize <= 0) {
    return '-';
  }

  if (fileSize >= 1024 * 1024 * 1024) {
    return `${(fileSize / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  if (fileSize >= 1024 * 1024) {
    return `${(fileSize / 1024 / 1024).toFixed(2)} MB`;
  }

  if (fileSize >= 1024) {
    return `${(fileSize / 1024).toFixed(2)} KB`;
  }

  return `${fileSize} B`;
}

function showError(error: unknown, fallback: string): void {
  if (error instanceof ApiError && error.status === 413) {
    ElMessage.error('文件过大，建议改用“服务器已有文件”方式导入，或联系管理员提高上传限制。');
    return;
  }

  const message = error instanceof Error ? error.message : fallback;
  ElMessage.error(message);
}

onMounted(() => {
  void fetchTasks();
  startPolling();
});

onBeforeUnmount(() => {
  stopPolling();
});
</script>

<style scoped>
.import-page {
  display: grid;
  gap: 18px;
}

.filter-card :deep(.el-card__body) {
  padding-bottom: 6px;
}

.task-message {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
