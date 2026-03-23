<template>
  <!-- Search UI is intentionally dumb: actual API calls and result handling stay in the map view/store. -->
  <div class="shell-card search-card">
    <div class="search-header">
      <h3>地图搜索</h3>
      <el-button text @click="$emit('clear')">清空</el-button>
    </div>
    <el-input
      :model-value="modelValue"
      placeholder="输入关键字"
      clearable
      @update:model-value="handleUpdate"
      @keyup.enter="$emit('submit')"
      @clear="$emit('clear')"
    >
      <template #append>
        <el-button :loading="loading" @click="$emit('submit')">搜索</el-button>
      </template>
    </el-input>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [];
  clear: [];
}>();

// Element Plus input can emit string or number, but the search contract here is always text.
function handleUpdate(value: string | number): void {
  emit('update:modelValue', String(value));
}
</script>

<style scoped>
.search-card {
  width: min(360px, calc(100vw - 28px));
  padding: 14px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
}

.search-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.search-header h3 {
  margin: 0;
  font-size: 16px;
}
</style>
