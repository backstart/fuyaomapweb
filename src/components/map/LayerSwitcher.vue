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
  width: 240px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
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
