<template>
  <div class="popup-card">
    <div class="popup-header">
      <div>
        <p class="popup-label">区域</p>
        <h3>{{ area.name }}</h3>
      </div>
      <el-tag :type="getStatusTagType(area.status)" effect="light">
        {{ getStatusLabel(area.status) }}
      </el-tag>
    </div>
    <dl class="popup-grid">
      <div>
        <dt>类型</dt>
        <dd>{{ area.type || '-' }}</dd>
      </div>
      <div>
        <dt>备注</dt>
        <dd>{{ area.remark || '-' }}</dd>
      </div>
      <div>
        <dt>样式 JSON</dt>
        <dd class="popup-code">{{ area.styleJson || '-' }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
import type { AreaFocusTarget } from '@/types/map';
import { getStatusLabel, getStatusTagType } from '@/utils/status';

defineProps<{
  area: AreaFocusTarget;
}>();
</script>

<style scoped>
.popup-card {
  width: 320px;
  padding: 16px;
  background: #fff;
}

.popup-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.popup-label {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

h3 {
  margin: 0;
  font-size: 18px;
}

.popup-grid {
  display: grid;
  gap: 10px;
  margin: 0;
}

dt {
  font-size: 12px;
  color: var(--text-secondary);
}

dd {
  margin: 2px 0 0;
  font-weight: 600;
  color: var(--text-primary);
}

.popup-code {
  max-height: 90px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: "Consolas", "SFMono-Regular", monospace;
  font-size: 12px;
}
</style>
