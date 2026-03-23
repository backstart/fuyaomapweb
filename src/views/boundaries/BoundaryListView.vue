<template>
  <PageContainer
    title="边界管理"
    eyebrow="Boundaries"
    description="对应后端接口 `/api/map/boundaries`，支持边界对象的查询、分页和基础维护。"
  >
    <template #actions>
      <el-button type="primary" @click="openCreateDialog">新增边界</el-button>
    </template>

    <div class="list-page">
      <el-card shadow="never" class="list-filters">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="关键字">
            <el-input
              v-model="boundaryStore.filters.keyword"
              placeholder="输入边界名称"
              clearable
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="类型">
            <el-input
              v-model="boundaryStore.filters.boundaryType"
              placeholder="例如 administrative"
              clearable
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="行政级别">
            <el-input-number
              v-model="boundaryStore.filters.adminLevel"
              :min="1"
              :max="20"
              controls-position="right"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="boundaryStore.filters.status" placeholder="全部状态" clearable style="width: 140px">
              <el-option label="启用" :value="1" />
              <el-option label="停用" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="boundaryStore.loadingList" @click="search">查询</el-button>
            <el-button @click="reset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="list-table-card">
        <el-table
          :data="boundaryStore.list"
          stripe
          height="100%"
          v-loading="boundaryStore.loadingList"
          @row-click="openOnMap"
        >
          <el-table-column prop="name" label="边界名称" min-width="180" />
          <el-table-column prop="boundaryType" label="类型" min-width="150" />
          <el-table-column prop="adminLevel" label="行政级别" width="110" />
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
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click.stop="openOnMap(row)">地图定位</el-button>
              <el-button type="primary" link @click.stop="openEditDialog(row.id)">编辑</el-button>
              <el-button type="danger" link @click.stop="removeItem(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination
            background
            layout="total, sizes, prev, pager, next"
            :current-page="boundaryStore.pagination.page"
            :page-size="boundaryStore.pagination.pageSize"
            :total="boundaryStore.pagination.total"
            :page-sizes="[10, 20, 50, 100]"
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </el-card>
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="780px" destroy-on-close>
      <el-form :model="form" label-width="110px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="请输入边界名称" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="类型">
              <el-input v-model="form.boundaryType" placeholder="例如 administrative" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="行政级别">
              <el-input-number v-model="form.adminLevel" :min="1" :max="20" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="样式 JSON">
          <el-input v-model="form.styleJson" type="textarea" :rows="3" placeholder="可选" />
        </el-form-item>
        <el-form-item label="GeoJSON" required>
          <el-input
            v-model="form.geoJson"
            type="textarea"
            :rows="7"
            placeholder='请输入 Polygon 或 MultiPolygon GeoJSON 几何字符串'
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="可选" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import { useBoundaryStore } from '@/stores/boundaryStore';
import type { EntityId } from '@/types/entity';
import type { MapBoundary, MapBoundaryListItem, SaveMapBoundaryPayload } from '@/types/boundary';
import { formatDateTime } from '@/utils/format';
import { getStatusLabel, getStatusTagType } from '@/utils/status';

const router = useRouter();
const boundaryStore = useBoundaryStore();

const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref<EntityId | null>(null);
const form = reactive<SaveMapBoundaryPayload>({
  name: '',
  boundaryType: '',
  adminLevel: undefined,
  remark: '',
  styleJson: '',
  status: 1,
  geoJson: ''
});

const dialogTitle = computed(() => (editingId.value ? '编辑边界' : '新增边界'));

function fillForm(detail?: MapBoundary | null): void {
  form.name = detail?.name ?? '';
  form.boundaryType = detail?.boundaryType ?? '';
  form.adminLevel = detail?.adminLevel ?? undefined;
  form.remark = detail?.remark ?? '';
  form.styleJson = detail?.styleJson ?? '';
  form.status = detail?.status ?? 1;
  form.geoJson = detail?.geometryGeoJson ?? '';
}

async function search(): Promise<void> {
  try {
    boundaryStore.updateFilters({ page: 1 });
    await boundaryStore.fetchList({ page: 1 });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '边界列表加载失败');
  }
}

async function handlePageChange(page: number): Promise<void> {
  try {
    boundaryStore.updateFilters({ page });
    await boundaryStore.fetchList({ page });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '边界列表加载失败');
  }
}

async function handleSizeChange(pageSize: number): Promise<void> {
  try {
    boundaryStore.updateFilters({ page: 1, pageSize });
    await boundaryStore.fetchList({ page: 1, pageSize });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '边界列表加载失败');
  }
}

async function reset(): Promise<void> {
  boundaryStore.resetFilters();
  await search();
}

function openOnMap(row: MapBoundaryListItem): void {
  void router.push({
    name: 'map',
    query: {
      entity: 'boundary',
      id: String(row.id),
      name: row.name,
      boundaryType: row.boundaryType || undefined,
      adminLevel: row.adminLevel != null ? String(row.adminLevel) : undefined,
      status: String(row.status)
    }
  });
}

function openCreateDialog(): void {
  editingId.value = null;
  fillForm(null);
  dialogVisible.value = true;
}

async function openEditDialog(id: EntityId): Promise<void> {
  try {
    const detail = await boundaryStore.getBoundaryDetail(id);
    editingId.value = id;
    fillForm(detail);
    dialogVisible.value = true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '边界详情加载失败');
  }
}

async function submitForm(): Promise<void> {
  if (!form.name.trim()) {
    ElMessage.warning('请输入边界名称');
    return;
  }

  if (!form.geoJson.trim()) {
    ElMessage.warning('请输入边界 GeoJSON');
    return;
  }

  saving.value = true;
  try {
    const payload: SaveMapBoundaryPayload = {
      ...form,
      name: form.name.trim(),
      boundaryType: form.boundaryType?.trim() || undefined,
      remark: form.remark?.trim() || undefined,
      styleJson: form.styleJson?.trim() || undefined,
      geoJson: form.geoJson.trim()
    };

    if (editingId.value) {
      await boundaryStore.editBoundary(editingId.value, payload);
      ElMessage.success('边界已更新');
    } else {
      await boundaryStore.createBoundary(payload);
      ElMessage.success('边界已创建');
    }

    dialogVisible.value = false;
    await search();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '边界保存失败');
  } finally {
    saving.value = false;
  }
}

async function removeItem(id: EntityId): Promise<void> {
  try {
    await ElMessageBox.confirm('删除后将无法恢复，是否继续？', '删除边界', {
      type: 'warning'
    });
    await boundaryStore.removeBoundary(id);
    ElMessage.success('边界已删除');
    await search();
  } catch (error) {
    if (error === 'cancel') {
      return;
    }

    ElMessage.error(error instanceof Error ? error.message : '边界删除失败');
  }
}

onMounted(() => {
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
