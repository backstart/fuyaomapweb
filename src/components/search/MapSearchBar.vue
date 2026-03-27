<template>
  <div class="shell-card search-card">
    <div class="search-row">
      <el-select
        v-if="semanticTypeGroups?.length"
        :model-value="semanticTypeValue"
        class="search-type-select"
        clearable
        filterable
        :placeholder="semanticTypePlaceholder || '全部类型'"
        @update:model-value="$emit('update:semanticTypeValue', $event ?? '')"
      >
        <el-option-group
          v-for="group in semanticTypeGroups"
          :key="group.categoryCode"
          :label="group.categoryName"
        >
          <el-option
            v-for="option in group.options"
            :key="option.typeCode"
            :label="option.typeName"
            :value="option.typeCode"
          />
        </el-option-group>
      </el-select>
      <el-input
        :model-value="modelValue"
        class="search-input"
        placeholder="搜索门店、POI、地名、道路"
        clearable
        @update:model-value="handleUpdate"
        @keyup.enter="$emit('submit')"
        @clear="$emit('clear')"
      >
        <template #prefix>
          <el-icon class="search-input-icon"><Search /></el-icon>
        </template>
      </el-input>
      <el-button
        v-if="modelValue"
        text
        class="search-clear"
        @click="$emit('clear')"
      >
        清空
      </el-button>
      <el-button
        class="search-submit"
        :loading="loading"
        circle
        @click="$emit('submit')"
      >
        <el-icon><Search /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue';
import type { FeatureTypeOptionGroup } from '@/utils/mapFeatureTypes';

defineProps<{
  modelValue: string;
  loading?: boolean;
  semanticTypeValue?: string;
  semanticTypePlaceholder?: string;
  semanticTypeGroups?: FeatureTypeOptionGroup[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:semanticTypeValue': [value: string];
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
  width: min(420px, calc(100vw - 28px));
  padding: 8px 10px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(12px);
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
}

.search-type-select {
  width: 168px;
  flex: none;
}

.search-input-icon {
  color: #64748b;
  font-size: 16px;
}

.search-input :deep(.el-input__wrapper) {
  box-shadow: none;
  border-radius: 14px;
  background: transparent;
}

.search-clear {
  padding-inline: 6px;
  color: #64748b;
}

.search-submit {
  flex: none;
  width: 36px;
  height: 36px;
  border: none;
  color: #ffffff;
  background: linear-gradient(135deg, #1f8cff, #2979ff);
  box-shadow: 0 8px 18px rgba(41, 121, 255, 0.28);
}

.search-submit:hover,
.search-submit:focus {
  color: #ffffff;
  background: linear-gradient(135deg, #177ef2, #206ef5);
}

@media (max-width: 768px) {
  .search-card {
    width: min(100%, calc(100vw - 28px));
  }

  .search-row {
    flex-wrap: wrap;
  }

  .search-type-select {
    width: 100%;
  }
}
</style>
