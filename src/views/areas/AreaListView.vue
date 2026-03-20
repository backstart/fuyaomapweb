<template>
  <PageContainer
    title="区域管理"
    eyebrow="Areas"
    description="对应后端接口 `/api/v1/map/areas`，支持关键字、类型、状态和分页查询。"
  >
    <div class="list-page">
      <el-card shadow="never" class="list-filters">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="关键字">
            <el-input
              v-model="areaStore.filters.keyword"
              placeholder="输入区域名称"
              clearable
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="类型">
            <el-input
              v-model="areaStore.filters.type"
              placeholder="例如 business / commercial"
              clearable
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="areaStore.filters.status" placeholder="全部状态" clearable style="width: 140px">
              <el-option label="启用" :value="1" />
              <el-option label="停用" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="areaStore.loadingList" @click="search">查询</el-button>
            <el-button @click="reset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="list-table-card">
        <el-table
          :data="areaStore.list"
          stripe
          height="100%"
          v-loading="areaStore.loadingList"
          @row-click="openOnMap"
        >
          <el-table-column prop="name" label="区域名称" min-width="180" />
          <el-table-column prop="type" label="类型" min-width="150" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" effect="light">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="styleJson" label="样式 JSON" min-width="220" show-overflow-tooltip />
          <el-table-column label="更新时间" min-width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.updateTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click.stop="openOnMap(row)">地图定位</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination
            background
            layout="total, sizes, prev, pager, next"
            :current-page="areaStore.pagination.page"
            :page-size="areaStore.pagination.pageSize"
            :total="areaStore.pagination.total"
            :page-sizes="[10, 20, 50, 100]"
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </el-card>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import { useAreaStore } from '@/stores/areaStore';
import type { MapAreaListItem } from '@/types/area';
import { formatDateTime } from '@/utils/format';
import { getStatusLabel, getStatusTagType } from '@/utils/status';

const router = useRouter();
const areaStore = useAreaStore();

async function search(): Promise<void> {
  try {
    // 重新查询时总是回到第一页，避免筛选条件变化后页码越界。
    areaStore.updateFilters({ page: 1 });
    await areaStore.fetchList({ page: 1 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '区域列表加载失败';
    ElMessage.error(message);
  }
}

async function handlePageChange(page: number): Promise<void> {
  try {
    areaStore.updateFilters({ page });
    await areaStore.fetchList({ page });
  } catch (error) {
    const message = error instanceof Error ? error.message : '区域列表加载失败';
    ElMessage.error(message);
  }
}

async function handleSizeChange(pageSize: number): Promise<void> {
  try {
    areaStore.updateFilters({ page: 1, pageSize });
    await areaStore.fetchList({ page: 1, pageSize });
  } catch (error) {
    const message = error instanceof Error ? error.message : '区域列表加载失败';
    ElMessage.error(message);
  }
}

async function reset(): Promise<void> {
  areaStore.resetFilters();
  await search();
}

function openOnMap(row: MapAreaListItem): void {
  // 地图页通过 query 参数读取要定位的实体，列表页只负责把约定写进去。
  void router.push({
    name: 'map',
    query: {
      entity: 'area',
      id: String(row.id)
    }
  });
}

onMounted(() => {
  // 进入列表页即自动加载一次，保持页面行为确定。
  void search();
});
</script>

<style scoped>
.list-page {
  display: grid;
  gap: 18px;
  height: 100%;
}

.list-filters :deep(.el-card__body) {
  padding-bottom: 6px;
}

.list-table-card {
  min-height: 540px;
}

.list-table-card :deep(.el-card__body) {
  height: 100%;
  min-height: 540px;
  display: flex;
  flex-direction: column;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}
</style>
