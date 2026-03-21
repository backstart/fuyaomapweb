<template>
  <PageContainer
    title="POI 管理"
    eyebrow="POIs"
    description="对应后端接口 `/api/map/pois`，支持 POI 的列表查询、分页管理和基础维护。"
  >
    <template #actions>
      <el-button type="primary" @click="openCreateDialog">新增 POI</el-button>
    </template>

    <div class="list-page">
      <el-card shadow="never" class="list-filters">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="关键字">
            <el-input
              v-model="poiStore.filters.keyword"
              placeholder="输入 POI 名称"
              clearable
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="分类">
            <el-input
              v-model="poiStore.filters.category"
              placeholder="例如 amenity / tourism"
              clearable
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="子类">
            <el-input
              v-model="poiStore.filters.subcategory"
              placeholder="例如 school / hospital"
              clearable
              @keyup.enter="search"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="poiStore.filters.status" placeholder="全部状态" clearable style="width: 140px">
              <el-option label="启用" :value="1" />
              <el-option label="停用" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="poiStore.loadingList" @click="search">查询</el-button>
            <el-button @click="reset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="list-table-card">
        <el-table
          :data="poiStore.list"
          stripe
          height="100%"
          v-loading="poiStore.loadingList"
          @row-click="openOnMap"
        >
          <el-table-column prop="name" label="POI 名称" min-width="180" />
          <el-table-column prop="category" label="分类" min-width="140" />
          <el-table-column prop="subcategory" label="子类" min-width="150" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)" effect="light">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="longitude" label="经度" min-width="120" />
          <el-table-column prop="latitude" label="纬度" min-width="120" />
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
            :current-page="poiStore.pagination.page"
            :page-size="poiStore.pagination.pageSize"
            :total="poiStore.pagination.total"
            :page-sizes="[10, 20, 50, 100]"
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </el-card>
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="720px" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="请输入 POI 名称" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分类">
              <el-input v-model="form.category" placeholder="例如 amenity" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="子类">
              <el-input v-model="form.subcategory" placeholder="例如 hospital" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="图标">
              <el-input v-model="form.icon" placeholder="例如 hospital" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="启用" :value="1" />
                <el-option label="停用" :value="0" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="经度" required>
              <el-input-number v-model="form.longitude" :precision="6" :step="0.0001" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="纬度" required>
              <el-input-number v-model="form.latitude" :precision="6" :step="0.0001" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址">
          <el-input v-model="form.address" placeholder="可选" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="form.phone" placeholder="可选" />
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
import { usePoiStore } from '@/stores/poiStore';
import type { MapPoi, MapPoiListItem, SaveMapPoiPayload } from '@/types/poi';
import { formatDateTime } from '@/utils/format';
import { getStatusLabel, getStatusTagType } from '@/utils/status';

const router = useRouter();
const poiStore = usePoiStore();

const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = reactive<SaveMapPoiPayload>({
  name: '',
  category: '',
  subcategory: '',
  remark: '',
  icon: '',
  status: 1,
  address: '',
  phone: '',
  longitude: 113.2644,
  latitude: 23.1291
});

const dialogTitle = computed(() => (editingId.value ? '编辑 POI' : '新增 POI'));

function fillForm(detail?: MapPoi | null): void {
  form.name = detail?.name ?? '';
  form.category = detail?.category ?? '';
  form.subcategory = detail?.subcategory ?? '';
  form.remark = detail?.remark ?? '';
  form.icon = detail?.icon ?? '';
  form.status = detail?.status ?? 1;
  form.address = detail?.address ?? '';
  form.phone = detail?.phone ?? '';
  form.longitude = detail?.longitude ?? 113.2644;
  form.latitude = detail?.latitude ?? 23.1291;
}

async function search(): Promise<void> {
  try {
    poiStore.updateFilters({ page: 1 });
    await poiStore.fetchList({ page: 1 });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'POI 列表加载失败');
  }
}

async function handlePageChange(page: number): Promise<void> {
  try {
    poiStore.updateFilters({ page });
    await poiStore.fetchList({ page });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'POI 列表加载失败');
  }
}

async function handleSizeChange(pageSize: number): Promise<void> {
  try {
    poiStore.updateFilters({ page: 1, pageSize });
    await poiStore.fetchList({ page: 1, pageSize });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'POI 列表加载失败');
  }
}

async function reset(): Promise<void> {
  poiStore.resetFilters();
  await search();
}

function openOnMap(row: MapPoiListItem): void {
  void router.push({
    name: 'map',
    query: {
      entity: 'poi',
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
    const detail = await poiStore.getPoiDetail(id);
    editingId.value = id;
    fillForm(detail);
    dialogVisible.value = true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'POI 详情加载失败');
  }
}

async function submitForm(): Promise<void> {
  if (!form.name.trim()) {
    ElMessage.warning('请输入 POI 名称');
    return;
  }

  saving.value = true;
  try {
    const payload: SaveMapPoiPayload = {
      ...form,
      name: form.name.trim(),
      category: form.category?.trim() || undefined,
      subcategory: form.subcategory?.trim() || undefined,
      remark: form.remark?.trim() || undefined,
      icon: form.icon?.trim() || undefined,
      address: form.address?.trim() || undefined,
      phone: form.phone?.trim() || undefined
    };

    if (editingId.value) {
      await poiStore.editPoi(editingId.value, payload);
      ElMessage.success('POI 已更新');
    } else {
      await poiStore.createPoi(payload);
      ElMessage.success('POI 已创建');
    }

    dialogVisible.value = false;
    await search();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'POI 保存失败');
  } finally {
    saving.value = false;
  }
}

async function removeItem(id: number): Promise<void> {
  try {
    await ElMessageBox.confirm('删除后将无法恢复，是否继续？', '删除 POI', {
      type: 'warning'
    });
    await poiStore.removePoi(id);
    ElMessage.success('POI 已删除');
    await search();
  } catch (error) {
    if (error === 'cancel') {
      return;
    }

    ElMessage.error(error instanceof Error ? error.message : 'POI 删除失败');
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
