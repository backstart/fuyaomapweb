<template>
  <PageContainer
    title="底图发布"
    eyebrow="Basemap Publish"
    description="审核通过只代表正式入库；只有这里发布生成新版本后，基础地理变更才会进入底图底层。"
  >
    <template #actions>
      <el-button @click="reloadAll">刷新</el-button>
      <el-button type="primary" @click="openPublishDialog(false)">发布全部待发布变更</el-button>
      <el-button type="success" plain :disabled="!selectedReadyChangeIds.length" @click="openPublishDialog(true)">发布已选变更</el-button>
    </template>

    <div class="page-grid">
      <el-card shadow="never">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="状态">
            <el-select v-model="filters.publishStatus" clearable placeholder="全部状态" style="width: 170px">
              <el-option label="待发布" value="ready_for_basemap_publish" />
              <el-option label="已发布" value="published_to_basemap" />
            </el-select>
          </el-form-item>
          <el-form-item label="对象">
            <el-select v-model="filters.featureKind" clearable placeholder="全部对象" style="width: 150px">
              <el-option label="建筑" value="building" />
              <el-option label="道路" value="road" />
              <el-option label="水系" value="water" />
              <el-option label="边界" value="boundary" />
            </el-select>
          </el-form-item>
          <el-form-item label="动作">
            <el-select v-model="filters.actionType" clearable placeholder="全部动作" style="width: 140px">
              <el-option label="新增" value="create" />
              <el-option label="修正" value="update" />
              <el-option label="删除" value="delete" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键字">
            <el-input v-model="filters.keyword" placeholder="名称、来源对象或底图对象标识" clearable @keyup.enter="loadChanges" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="loadChanges">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <div class="side-by-side">
        <el-card shadow="never">
          <template #header>将正式建筑区域加入底图发布</template>
          <el-form label-position="top" @submit.prevent>
            <el-form-item label="正式区域 ID">
              <el-input v-model="areaPublishForm.areaId" placeholder="例如：193842234234" />
            </el-form-item>
            <el-form-item label="动作">
              <el-select v-model="areaPublishForm.actionType">
                <el-option label="新增建筑" value="create" />
                <el-option label="修正建筑" value="update" />
              </el-select>
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="areaPublishForm.remark" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="例如：审核通过后纳入下一版底图建筑轮廓" />
            </el-form-item>
            <el-button type="primary" :loading="submittingAreaPublish" @click="submitAreaPublish">加入待发布队列</el-button>
          </el-form>
        </el-card>

        <el-card shadow="never">
          <template #header>标记底图对象删除/拆除</template>
          <el-form label-position="top" @submit.prevent>
            <el-form-item label="底图对象类型">
              <el-select v-model="manualChangeForm.featureKind">
                <el-option label="建筑" value="building" />
                <el-option label="道路" value="road" />
                <el-option label="水系" value="water" />
                <el-option label="边界" value="boundary" />
              </el-select>
            </el-form-item>
            <el-form-item label="动作">
              <el-select v-model="manualChangeForm.actionType">
                <el-option label="删除" value="delete" />
                <el-option label="修正" value="update" />
                <el-option label="新增" value="create" />
              </el-select>
            </el-form-item>
            <el-form-item label="目标底图对象标识">
              <el-input v-model="manualChangeForm.targetBasemapObjectId" placeholder="例如：osm-way-3489321" />
            </el-form-item>
            <el-form-item v-if="manualChangeForm.actionType !== 'delete'" label="几何类型">
              <el-select v-model="manualChangeForm.geometryType">
                <el-option label="polygon" value="polygon" />
                <el-option label="line" value="line" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="manualChangeForm.actionType !== 'delete'" label="GeoJSON 几何">
              <el-input
                v-model="manualChangeForm.geometryGeoJson"
                type="textarea"
                :autosize="{ minRows: 4, maxRows: 8 }"
                placeholder='例如：{"type":"Polygon","coordinates":[...]}' 
              />
            </el-form-item>
            <el-form-item label="显示名称">
              <el-input v-model="manualChangeForm.displayName" placeholder="例如：幸福小区旧楼栋" />
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="manualChangeForm.remark" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="例如：现场已拆迁，下一版底图移除" />
            </el-form-item>
            <el-button type="primary" :loading="submittingManualChange" @click="submitManualChange">创建底图变更</el-button>
          </el-form>
        </el-card>
      </div>

      <el-card shadow="never" class="table-card">
        <el-table :data="changes" stripe height="100%" v-loading="loading" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="46" :selectable="isReadyChange" />
          <el-table-column label="名称" min-width="180">
            <template #default="{ row }">
              {{ row.displayName || row.targetBasemapObjectId || '(未命名变更)' }}
            </template>
          </el-table-column>
          <el-table-column label="对象" width="120">
            <template #default="{ row }">
              {{ getBasemapFeatureKindLabel(row.featureKind) }}
            </template>
          </el-table-column>
          <el-table-column label="动作" width="100">
            <template #default="{ row }">
              {{ getBasemapActionLabel(row.actionType) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getBasemapPublishStatusTagType(row.publishStatus)" effect="light">
                {{ getBasemapPublishStatusLabel(row.publishStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="来源对象" min-width="170">
            <template #default="{ row }">
              {{ row.sourceDataTable && row.sourceDataId ? `${row.sourceDataTable}:${row.sourceDataId}` : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="底图对象标识" min-width="170">
            <template #default="{ row }">
              {{ row.targetBasemapObjectId || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="待发布时间" min-width="170">
            <template #default="{ row }">
              {{ formatDateTime(row.readyForPublishAt || row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column label="已发布版本" min-width="150">
            <template #default="{ row }">
              {{ row.publishedVersionId || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="220">
            <template #default="{ row }">
              {{ row.remark || '-' }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-dialog v-model="publishDialogVisible" title="发布到底图" width="520px">
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="版本标题" required>
          <el-input v-model="publishForm.title" placeholder="例如：2026-03 建筑更新批次" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="publishForm.description" type="textarea" :autosize="{ minRows: 3, maxRows: 5 }" placeholder="说明这版底图包含哪些基础地理变更" />
        </el-form-item>
        <el-form-item label="发布范围">
          <el-alert
            :title="publishSelectedOnly ? `将发布 ${selectedReadyChangeIds.length} 条已选待发布变更` : `将发布当前全部 ${readyChangeCount} 条待发布变更`"
            type="info"
            :closable="false"
          />
        </el-form-item>
        <el-form-item label="发布后切为当前版本">
          <el-switch v-model="publishForm.activateOnSuccess" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="submitPublish">开始构建底图版本</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import PageContainer from '@/components/common/PageContainer.vue';
import { createBasemapFeatureChange, enqueueBasemapArea, publishBasemapVersion, queryBasemapFeatureChanges } from '@/api/basemapApi';
import type { BasemapActionType, BasemapFeatureChange, BasemapFeatureKind, BasemapPublishStatus } from '@/types/basemap';
import { formatDateTime } from '@/utils/format';
import {
  getBasemapActionLabel,
  getBasemapFeatureKindLabel,
  getBasemapPublishStatusLabel,
  getBasemapPublishStatusTagType
} from '@/utils/basemapPublish';

const loading = ref(false);
const publishing = ref(false);
const submittingAreaPublish = ref(false);
const submittingManualChange = ref(false);
const publishDialogVisible = ref(false);
const publishSelectedOnly = ref(false);
const changes = ref<BasemapFeatureChange[]>([]);
const selectedReadyChangeIds = ref<string[]>([]);

const filters = reactive({
  publishStatus: 'ready_for_basemap_publish' as BasemapPublishStatus | '',
  featureKind: '' as BasemapFeatureKind | '',
  actionType: '' as BasemapActionType | '',
  keyword: ''
});

const areaPublishForm = reactive({
  areaId: '',
  actionType: 'create' as Extract<BasemapActionType, 'create' | 'update'>,
  remark: ''
});

const manualChangeForm = reactive({
  featureKind: 'building' as BasemapFeatureKind,
  actionType: 'delete' as BasemapActionType,
  targetBasemapObjectId: '',
  geometryType: 'polygon',
  geometryGeoJson: '',
  displayName: '',
  remark: ''
});

const publishForm = reactive({
  title: '',
  description: '',
  activateOnSuccess: true
});

const readyChangeCount = computed(() =>
  changes.value.filter((item) => item.publishStatus === 'ready_for_basemap_publish').length
);

async function loadChanges(): Promise<void> {
  loading.value = true;
  try {
    changes.value = await queryBasemapFeatureChanges({
      publishStatus: filters.publishStatus || undefined,
      featureKind: filters.featureKind || undefined,
      actionType: filters.actionType || undefined,
      keyword: filters.keyword.trim() || undefined
    });
    selectedReadyChangeIds.value = [];
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '底图变更列表加载失败');
  } finally {
    loading.value = false;
  }
}

function resetFilters(): void {
  filters.publishStatus = 'ready_for_basemap_publish';
  filters.featureKind = '';
  filters.actionType = '';
  filters.keyword = '';
  void loadChanges();
}

function handleSelectionChange(rows: BasemapFeatureChange[]): void {
  selectedReadyChangeIds.value = rows
    .filter((item) => item.publishStatus === 'ready_for_basemap_publish')
    .map((item) => item.id);
}

function isReadyChange(row: BasemapFeatureChange): boolean {
  return row.publishStatus === 'ready_for_basemap_publish';
}

async function submitAreaPublish(): Promise<void> {
  if (!areaPublishForm.areaId.trim()) {
    ElMessage.warning('请先填写正式区域 ID');
    return;
  }

  submittingAreaPublish.value = true;
  try {
    await enqueueBasemapArea(areaPublishForm.areaId.trim(), {
      actionType: areaPublishForm.actionType,
      remark: areaPublishForm.remark.trim() || null
    });
    ElMessage.success('建筑区域已加入底图待发布队列');
    areaPublishForm.areaId = '';
    areaPublishForm.remark = '';
    await loadChanges();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '建筑区域入底图队列失败');
  } finally {
    submittingAreaPublish.value = false;
  }
}

async function submitManualChange(): Promise<void> {
  if (!manualChangeForm.targetBasemapObjectId.trim() && manualChangeForm.actionType === 'delete') {
    ElMessage.warning('删除底图对象时必须填写底图对象标识');
    return;
  }

  if (manualChangeForm.actionType !== 'delete' && !manualChangeForm.geometryGeoJson.trim()) {
    ElMessage.warning('新增或修正底图对象时必须提供 GeoJSON 几何');
    return;
  }

  submittingManualChange.value = true;
  try {
    await createBasemapFeatureChange({
      featureKind: manualChangeForm.featureKind,
      actionType: manualChangeForm.actionType,
      targetBasemapObjectId: manualChangeForm.targetBasemapObjectId.trim() || null,
      geometryType: manualChangeForm.actionType === 'delete' ? null : manualChangeForm.geometryType,
      geometryGeoJson: manualChangeForm.actionType === 'delete' ? null : manualChangeForm.geometryGeoJson.trim(),
      displayName: manualChangeForm.displayName.trim() || null,
      remark: manualChangeForm.remark.trim() || null,
      payload: {
        source: 'manual-basemap-change',
        requestedAt: new Date().toISOString()
      }
    });
    ElMessage.success('底图变更已创建并进入待发布队列');
    manualChangeForm.targetBasemapObjectId = '';
    manualChangeForm.geometryGeoJson = '';
    manualChangeForm.displayName = '';
    manualChangeForm.remark = '';
    await loadChanges();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '创建底图变更失败');
  } finally {
    submittingManualChange.value = false;
  }
}

function openPublishDialog(selectedOnly: boolean): void {
  if (selectedOnly && !selectedReadyChangeIds.value.length) {
    ElMessage.warning('请先勾选待发布变更');
    return;
  }

  publishSelectedOnly.value = selectedOnly;
  publishForm.title = `底图发布 ${new Date().toLocaleString()}`;
  publishForm.description = '';
  publishForm.activateOnSuccess = true;
  publishDialogVisible.value = true;
}

async function submitPublish(): Promise<void> {
  if (!publishForm.title.trim()) {
    ElMessage.warning('请填写版本标题');
    return;
  }

  publishing.value = true;
  try {
    const version = await publishBasemapVersion({
      title: publishForm.title.trim(),
      description: publishForm.description.trim() || null,
      changeIds: publishSelectedOnly.value ? selectedReadyChangeIds.value : [],
      publishAllReadyChanges: !publishSelectedOnly.value,
      activateOnSuccess: publishForm.activateOnSuccess
    });
    publishDialogVisible.value = false;
    await loadChanges();
    ElMessage.success(
      version.buildStatus === 'success'
        ? `底图版本 ${version.versionCode} 已构建完成`
        : `底图版本 ${version.versionCode} 已创建，请到版本页查看构建状态`
    );
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '底图发布失败');
  } finally {
    publishing.value = false;
  }
}

async function reloadAll(): Promise<void> {
  await loadChanges();
}

onMounted(() => {
  void loadChanges();
});
</script>

<style scoped>
.page-grid {
  display: grid;
  gap: 16px;
}

.side-by-side {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.table-card {
  min-height: 480px;
}

@media (max-width: 1100px) {
  .side-by-side {
    grid-template-columns: 1fr;
  }
}
</style>
