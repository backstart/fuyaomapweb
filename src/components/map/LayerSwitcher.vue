<template>
  <div class="shell-card switcher-card">
    <div class="switcher-title">
      <h3>图层控制</h3>
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
      <div class="switcher-item">
        <span>POI 点位</span>
        <el-switch :model-value="modelValue.pois" @change="onPoisChange" />
      </div>
      <div class="switcher-item">
        <span>地名点/聚落</span>
        <el-switch :model-value="modelValue.places" @change="onPlacesChange" />
      </div>
      <div class="switcher-item">
        <span>边界面/边界线</span>
        <el-switch :model-value="modelValue.boundaries" @change="onBoundariesChange" />
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

// Emits a fresh object so parent watchers can react predictably to layer visibility changes.
function emitChange(key: keyof LayerVisibility, value: string | number | boolean): void {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: Boolean(value)
  });
}

// Element Plus switch payloads are normalized to boolean before updating the shared state.
function onShopsChange(value: string | number | boolean): void {
  emitChange('shops', value);
}

function onAreasChange(value: string | number | boolean): void {
  emitChange('areas', value);
}

function onPoisChange(value: string | number | boolean): void {
  emitChange('pois', value);
}

function onPlacesChange(value: string | number | boolean): void {
  emitChange('places', value);
}

function onBoundariesChange(value: string | number | boolean): void {
  emitChange('boundaries', value);
}
</script>

<style scoped>
.switcher-card {
  width: 204px;
  padding: 10px 11px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
}

.switcher-title h3 {
  margin: 0;
  font-size: 14px;
}

.switcher-list {
  margin-top: 8px;
  display: grid;
  gap: 8px;
}

.switcher-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  line-height: 1.3;
}

.switcher-item :deep(.el-switch) {
  flex: none;
}
</style>
