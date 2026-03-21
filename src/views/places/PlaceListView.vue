<template>
  <PageContainer
    title="地名管理"
    eyebrow="Places"
    description="对应后端接口 `/api/map/places`，支持聚落、地名与行政地名对象的查询和维护。"
  >
    <template #actions>
      <el-button type="primary" @click="openCreateDialog">新增地名</el-button>
    </template>

    <div class="list-page">
      <el-card shadow="never" class="list-filters">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="关键字">
            <el-input
              v-model="placeStore.filters.keyword"
              placeholder="输入地名"
              clearable
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="类型">
            <el-input
              v-model="placeStore.filters.placeType"
              placeholder="例如 village / town"
              clearable
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="行政级别">
            <el-input-number
              v-model="placeStore.filters.adminLevel"
              :min="1"
              :max="20"
              controls-position="right"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="placeStore.filters.status" placeholder="全部状态" clearable style="width: 140px">
              <el-option label="启用" :value="1" />
              <el-option label="停用" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="placeStore.loadingList" @click="search">查询</el-button>
            <el-button @click="reset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="list-table-card">
        <el-table
          :data="placeStore.list"
          stripe
          height="100%"
          v-loading="placeStore.loadingList"
          @row-click="openOnMap"
        >
          <el-table-column prop="name" label="地名" min-width="180" />
          <el-table-column prop="placeType" label="类型" min-width="150" />
          <el-table-column prop="adminLevel" label="行政级别" width="110" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" effect="light">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="中心点" min-width="170">
            <template #default="{ row }">
              {{ formatCenter(row.centerLongitude, row.centerLatitude) }}
            </template>
          </el-table-column>
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
            :current-page="placeStore.pagination.page"
            :page-size="placeStore.pagination.pageSize"
            :total="placeStore.pagination.total"
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
          <el-input v-model="form.name" placeholder="请输入地名" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="类型">
              <el-input v-model="form.placeType" placeholder="例如 suburb / village" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="行政级别">
              <el-input-number v-model="form.adminLevel" :min="1" :max="20" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="中心经度">
              <el-input-number v-model="form.centerLongitude" :precision="6" :step="0.0001" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="中心纬度">
              <el-input-number v-model="form.centerLatitude" :precision="6" :step="0.0001" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="GeoJSON">
          <el-input
            v-model="form.geoJson"
            type="textarea"
            :rows="6"
            placeholder='可选，支持 Point / Polygon / MultiPolygon 等 GeoJSON 几何字符串'
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
import { usePlaceStore } from '@/stores/placeStore';
import type { MapPlace, MapPlaceListItem, SaveMapPlacePayload } from '@/types/place';
import { formatDateTime } from '@/utils/format';
import { getStatusLabel, getStatusTagType } from '@/utils/status';

const router = useRouter();
const placeStore = usePlaceStore();

const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = reactive<SaveMapPlacePayload>({
  name: '',
  placeType: '',
  adminLevel: undefined,
  remark: '',
  status: 1,
  geoJson: '',
  centerLongitude: undefined,
  centerLatitude: undefined
});

const dialogTitle = computed(() => (editingId.value ? '编辑地名' : '新增地名'));

function fillForm(detail?: MapPlace | null): void {
  form.name = detail?.name ?? '';
  form.placeType = detail?.placeType ?? '';
  form.adminLevel = detail?.adminLevel ?? undefined;
  form.remark = detail?.remark ?? '';
  form.status = detail?.status ?? 1;
  form.geoJson = detail?.geometryGeoJson ?? '';
  form.centerLongitude = detail?.centerLongitude ?? undefined;
  form.centerLatitude = detail?.centerLatitude ?? undefined;
}

function formatCenter(longitude?: number | null, latitude?: number | null): string {
  if (typeof longitude !== 'number' || typeof latitude !== 'number') {
    return '-';
  }

  return `${longitude.toFixed(6)}, ${latitude.toFixed(6)}`;
}

async function search(): Promise<void> {
  try {
    placeStore.updateFilters({ page: 1 });
    await placeStore.fetchList({ page: 1 });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '地名列表加载失败');
  }
}

async function handlePageChange(page: number): Promise<void> {
  try {
    placeStore.updateFilters({ page });
    await placeStore.fetchList({ page });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '地名列表加载失败');
  }
}

async function handleSizeChange(pageSize: number): Promise<void> {
  try {
    placeStore.updateFilters({ page: 1, pageSize });
    await placeStore.fetchList({ page: 1, pageSize });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '地名列表加载失败');
  }
}

async function reset(): Promise<void> {
  placeStore.resetFilters();
  await search();
}

function openOnMap(row: MapPlaceListItem): void {
  void router.push({
    name: 'map',
    query: {
      entity: 'place',
      id: String(row.id)
    }
  });
}

function openCreateDialog(): void {
  editingId.value = null;
  fillForm(null);
  dialogVisible.value = true;
}

async function openEditDialog(id: number): Promise<void> {
  try {
    const detail = await placeStore.getPlaceDetail(id);
    editingId.value = id;
    fillForm(detail);
    dialogVisible.value = true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '地名详情加载失败');
  }
}

async function submitForm(): Promise<void> {
  if (!form.name.trim()) {
    ElMessage.warning('请输入地名名称');
    return;
  }

  saving.value = true;
  try {
    const payload: SaveMapPlacePayload = {
      ...form,
      name: form.name.trim(),
      placeType: form.placeType?.trim() || undefined,
      remark: form.remark?.trim() || undefined,
      geoJson: form.geoJson?.trim() || undefined
    };

    if (editingId.value) {
      await placeStore.editPlace(editingId.value, payload);
      ElMessage.success('地名已更新');
    } else {
      await placeStore.createPlace(payload);
      ElMessage.success('地名已创建');
    }

    dialogVisible.value = false;
    await search();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '地名保存失败');
  } finally {
    saving.value = false;
  }
}

async function removeItem(id: number): Promise<void> {
  try {
    await ElMessageBox.confirm('删除后将无法恢复，是否继续？', '删除地名', {
      type: 'warning'
    });
    await placeStore.removePlace(id);
    ElMessage.success('地名已删除');
    await search();
  } catch (error) {
    if (error === 'cancel') {
      return;
    }

    ElMessage.error(error instanceof Error ? error.message : '地名删除失败');
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
