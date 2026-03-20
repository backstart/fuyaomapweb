<template>
  <div class="shell-card search-card">
    <div class="search-header">
      <div>
        <h3>地图搜索</h3>
        <p>按店铺或区域名称检索并联动定位</p>
      </div>
      <el-button text @click="$emit('clear')">清空</el-button>
    </div>
    <el-input
      :model-value="modelValue"
      placeholder="输入关键字，例如门店名、区域名"
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

function handleUpdate(value: string | number): void {
  emit('update:modelValue', String(value));
}
</script>

<style scoped>
.search-card {
  width: min(420px, calc(100vw - 32px));
  padding: 16px;
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

.search-header p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
