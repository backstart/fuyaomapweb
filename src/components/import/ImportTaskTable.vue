<template>
  <el-card shadow="never" class="table-card">
    <el-table :data="tasks" stripe height="100%" v-loading="loading">
      <el-table-column prop="id" label="任务ID" width="110" />
      <el-table-column prop="fileName" label="文件名" min-width="220" show-overflow-tooltip />
      <el-table-column label="状态" width="140">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)" effect="light">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="进度" min-width="180">
        <template #default="{ row }">
          <el-progress
            :percentage="row.progress"
            :status="getProgressStatus(row.status)"
            :stroke-width="10"
          />
        </template>
      </el-table-column>
      <el-table-column label="统计" min-width="180">
        <template #default="{ row }">
          <div class="stat-cell">
            <span>总 {{ row.totalCount }}</span>
            <span>成 {{ row.successCount }}</span>
            <span>败 {{ row.failedCount }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="开始时间" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.startedTime) }}</template>
      </el-table-column>
      <el-table-column label="结束时间" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.finishedTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <div class="action-group">
            <el-button type="primary" link @click="$emit('detail', row.id)">详情</el-button>
            <el-button type="primary" link @click="$emit('logs', row.id)">日志</el-button>
            <el-button
              v-if="canStart(row.status)"
              type="success"
              link
              @click="$emit('start', row.id)"
            >
              启动
            </el-button>
            <el-button
              v-if="canCancel(row.status)"
              type="warning"
              link
              @click="$emit('cancel', row.id)"
            >
              取消
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="$emit('page-change', $event)"
        @size-change="$emit('size-change', $event)"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import type { MapImportTask } from '@/types/import';
import { formatDateTime } from '@/utils/format';

defineProps<{
  tasks: MapImportTask[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
}>();

defineEmits<{
  (event: 'detail', id: number): void;
  (event: 'logs', id: number): void;
  (event: 'start', id: number): void;
  (event: 'cancel', id: number): void;
  (event: 'page-change', page: number): void;
  (event: 'size-change', pageSize: number): void;
}>();

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

function canStart(status: string): boolean {
  return status === 'pending' || status === 'failed';
}

function canCancel(status: string): boolean {
  return status === 'pending';
}
</script>

<style scoped>
.table-card {
  min-height: 580px;
}

.table-card :deep(.el-card__body) {
  min-height: 580px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.stat-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 13px;
}

.action-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}
</style>
