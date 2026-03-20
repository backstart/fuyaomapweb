<template>
  <div class="shell-card switcher-card">
    <div class="switcher-title">
      <h3>图层控制</h3>
      <p>切换业务图层显示状态</p>
    </div>
    <div class="switcher-list">
      <div class="switcher-item">
        <span>店铺点位</span>
        <el-switch :model-value="modelValue.shops" @change="onShopsChange" />
      </div>
      <div class="switcher-item">
        <span>区域面</span>
        <el-switch :model-value="modelValue.areas" @change="onAreasChange" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LayerVisibility } from '@/types/map';

const props = defineProps<{
  modelValue: LayerVisibility;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: LayerVisibility];
}>();

function emitChange(key: keyof LayerVisibility, value: string | number | boolean): void {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: Boolean(value)
  });
}

function onShopsChange(value: string | number | boolean): void {
  emitChange('shops', value);
}

function onAreasChange(value: string | number | boolean): void {
  emitChange('areas', value);
}
</script>

<style scoped>
.switcher-card {
  width: 240px;
  padding: 16px;
}

.switcher-title h3 {
  margin: 0;
  font-size: 16px;
}

.switcher-title p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.switcher-list {
  margin-top: 14px;
  display: grid;
  gap: 12px;
}

.switcher-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
