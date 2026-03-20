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

// Raw geometry is intentionally omitted from the popup UI; only business metadata is surfaced.
defineProps<{
  area: AreaFocusTarget;
}>();
</script>

<style scoped>
.popup-card {
  width: 320px;
  padding: 18px 18px 16px;
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
  color: #7b8794;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

h3 {
  margin: 0;
  font-size: 17px;
  color: #1f2d3d;
}

.popup-grid {
  display: grid;
  gap: 12px;
  margin: 0;
}

dt {
  font-size: 12px;
  color: #8793a1;
}

dd {
  margin: 2px 0 0;
  font-weight: 500;
  color: #1f2d3d;
}

.popup-code {
  max-height: 90px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f7f8fa;
  border: 1px solid rgba(15, 23, 42, 0.06);
  font-family: "Consolas", "SFMono-Regular", monospace;
  font-size: 12px;
}
</style>
