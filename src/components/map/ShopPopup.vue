<template>
  <div class="popup-card">
    <div class="popup-header">
      <div>
        <p class="popup-label">店铺</p>
        <h3>{{ shop.name }}</h3>
      </div>
      <el-tag :type="getStatusTagType(shop.status)" effect="light">
        {{ getStatusLabel(shop.status) }}
      </el-tag>
    </div>
    <dl class="popup-grid">
      <div>
        <dt>分类</dt>
        <dd>{{ shop.category || '-' }}</dd>
      </div>
      <div>
        <dt>图标</dt>
        <dd>{{ shop.icon || '-' }}</dd>
      </div>
      <div>
        <dt>经纬度</dt>
        <dd>{{ shop.longitude.toFixed(6) }}, {{ shop.latitude.toFixed(6) }}</dd>
      </div>
      <div>
        <dt>备注</dt>
        <dd>{{ shop.remark || '-' }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
import type { ShopFocusTarget } from '@/types/map';
import { getStatusLabel, getStatusTagType } from '@/utils/status';

defineProps<{
  shop: ShopFocusTarget;
}>();
</script>

<style scoped>
.popup-card {
  width: 300px;
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
</style>
