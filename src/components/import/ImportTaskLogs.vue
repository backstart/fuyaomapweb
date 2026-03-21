<template>
  <el-scrollbar height="420px" v-loading="loading">
    <el-empty v-if="!logs.length" description="当前任务暂无日志" />
    <div v-else class="log-list">
      <article v-for="log in logs" :key="log.id" class="log-item">
        <div class="log-meta">
          <el-tag :type="getLevelTagType(log.level)" effect="light" size="small">
            {{ log.level.toUpperCase() }}
          </el-tag>
          <span>{{ formatDateTime(log.createTime) }}</span>
        </div>
        <p>{{ log.message }}</p>
      </article>
    </div>
  </el-scrollbar>
</template>

<script setup lang="ts">
import type { MapImportTaskLog } from '@/types/import';
import { formatDateTime } from '@/utils/format';

defineProps<{
  logs: MapImportTaskLog[];
  loading: boolean;
}>();

function getLevelTagType(level: string): 'info' | 'warning' | 'danger' {
  switch (level) {
    case 'warn':
      return 'warning';
    case 'error':
      return 'danger';
    default:
      return 'info';
  }
}
</script>

<style scoped>
.log-list {
  display: grid;
  gap: 12px;
}

.log-item {
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: #fbfdff;
}

.log-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 12px;
}

.log-item p {
  margin: 10px 0 0;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
