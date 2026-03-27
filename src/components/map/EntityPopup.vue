<template>
  <div class="popup-card">
    <div class="popup-header">
      <div>
        <p class="popup-label">{{ getEntityTypeLabel(entity.entityType) }}</p>
        <h3>{{ entity.name }}</h3>
      </div>
      <span :class="['popup-status', `popup-status--${getStatusTagType(entity.status)}`]">
        {{ getStatusLabel(entity.status) }}
      </span>
    </div>
    <dl class="popup-grid">
      <template v-if="entity.entityType === 'shop'">
        <div>
          <dt>语义类型</dt>
          <dd>{{ entity.typeName || entity.categoryName || entity.category || '-' }}</dd>
        </div>
        <div>
          <dt>分类</dt>
          <dd>{{ entity.category || '-' }}</dd>
        </div>
        <div>
          <dt>图标</dt>
          <dd>{{ entity.icon || '-' }}</dd>
        </div>
        <div>
          <dt>经纬度</dt>
          <dd>{{ formatLonLat(entity.longitude, entity.latitude) }}</dd>
        </div>
        <div>
          <dt>备注</dt>
          <dd>{{ entity.remark || '-' }}</dd>
        </div>
      </template>

      <template v-else-if="entity.entityType === 'poi'">
        <div>
          <dt>语义类型</dt>
          <dd>{{ entity.typeName || entity.categoryName || entity.subcategory || entity.category || '-' }}</dd>
        </div>
        <div>
          <dt>分类</dt>
          <dd>{{ entity.category || '-' }}</dd>
        </div>
        <div>
          <dt>子类</dt>
          <dd>{{ entity.subcategory || '-' }}</dd>
        </div>
        <div>
          <dt>地址</dt>
          <dd>{{ entity.address || '-' }}</dd>
        </div>
        <div>
          <dt>电话</dt>
          <dd>{{ entity.phone || '-' }}</dd>
        </div>
        <div>
          <dt>经纬度</dt>
          <dd>{{ formatLonLat(entity.longitude, entity.latitude) }}</dd>
        </div>
        <div>
          <dt>备注</dt>
          <dd>{{ entity.remark || '-' }}</dd>
        </div>
      </template>

      <template v-else-if="entity.entityType === 'area'">
        <div>
          <dt>语义类型</dt>
          <dd>{{ entity.typeName || entity.categoryName || entity.type || '-' }}</dd>
        </div>
        <div>
          <dt>类型</dt>
          <dd>{{ entity.type || '-' }}</dd>
        </div>
        <div>
          <dt>备注</dt>
          <dd>{{ entity.remark || '-' }}</dd>
        </div>
        <div>
          <dt>样式 JSON</dt>
          <dd class="popup-code">{{ entity.styleJson || '-' }}</dd>
        </div>
      </template>

      <template v-else-if="entity.entityType === 'place'">
        <div>
          <dt>语义类型</dt>
          <dd>{{ entity.typeName || entity.categoryName || entity.placeType || '-' }}</dd>
        </div>
        <div>
          <dt>类型</dt>
          <dd>{{ entity.placeType || '-' }}</dd>
        </div>
        <div>
          <dt>行政级别</dt>
          <dd>{{ entity.adminLevel ?? '-' }}</dd>
        </div>
        <div>
          <dt>中心点</dt>
          <dd>{{ formatOptionalCenter(entity.centerLongitude, entity.centerLatitude) }}</dd>
        </div>
        <div>
          <dt>备注</dt>
          <dd>{{ entity.remark || '-' }}</dd>
        </div>
      </template>

      <template v-else-if="entity.entityType === 'label'">
        <div>
          <dt>语义类型</dt>
          <dd>{{ entity.typeName || entity.categoryName || entity.classification || '-' }}</dd>
        </div>
        <div>
          <dt>来源</dt>
          <dd>{{ entity.source || entity.sourceType || '-' }}</dd>
        </div>
        <div>
          <dt>经纬度</dt>
          <dd>{{ formatLonLat(entity.longitude, entity.latitude) }}</dd>
        </div>
      </template>

      <template v-else>
        <div>
          <dt>语义类型</dt>
          <dd>{{ entity.typeName || entity.categoryName || entity.boundaryType || '-' }}</dd>
        </div>
        <div>
          <dt>类型</dt>
          <dd>{{ entity.boundaryType || '-' }}</dd>
        </div>
        <div>
          <dt>行政级别</dt>
          <dd>{{ entity.adminLevel ?? '-' }}</dd>
        </div>
        <div>
          <dt>备注</dt>
          <dd>{{ entity.remark || '-' }}</dd>
        </div>
        <div>
          <dt>样式 JSON</dt>
          <dd class="popup-code">{{ entity.styleJson || '-' }}</dd>
        </div>
      </template>
    </dl>
  </div>
</template>

<script setup lang="ts">
import type { MapFocusTarget } from '@/types/map';
import { getEntityTypeLabel } from '@/utils/mapEntities';
import { getStatusLabel, getStatusTagType } from '@/utils/status';

defineProps<{
  entity: MapFocusTarget;
}>();

function formatLonLat(longitude: number, latitude: number): string {
  return `${longitude.toFixed(6)}, ${latitude.toFixed(6)}`;
}

function formatOptionalCenter(longitude?: number | null, latitude?: number | null): string {
  if (typeof longitude !== 'number' || typeof latitude !== 'number') {
    return '-';
  }

  return formatLonLat(longitude, latitude);
}
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

.popup-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.popup-status--success {
  background: #ecfdf3;
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.24);
}

.popup-status--warning {
  background: #fff7ed;
  color: #c2410c;
  border-color: rgba(249, 115, 22, 0.22);
}

.popup-status--danger {
  background: #fef2f2;
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.22);
}

.popup-status--info {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.22);
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
