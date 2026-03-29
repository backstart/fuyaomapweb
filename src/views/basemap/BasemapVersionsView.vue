<template>
  <PageContainer
    title="底图版本"
    eyebrow="Basemap Versions"
    description="这里展示每次底图构建产生的版本、当前线上版本和版本包含的基础地理变更。"
  >
    <template #actions>
      <el-button @click="reloadAll">刷新</el-button>
    </template>

    <div class="page-grid">
      <el-card shadow="never">
        <template #header>当前底图版本</template>
        <el-descriptions v-if="currentVersion" :column="2" border>
          <el-descriptions-item label="版本编码">{{ currentVersion.versionCode }}</el-descriptions-item>
          <el-descriptions-item label="标题">{{ currentVersion.title }}</el-descriptions-item>
          <el-descriptions-item label="构建状态">
            <el-tag :type="getBasemapBuildStatusTagType(currentVersion.buildStatus)" effect="light">
              {{ getBasemapBuildStatusLabel(currentVersion.buildStatus) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="底图地址">{{ currentVersion.tilesUrl || '-' }}</el-descriptions-item>
          <el-descriptions-item label="启用时间">{{ formatDateTime(currentVersion.activatedAt || currentVersion.updateTime) }}</el-descriptions-item>
          <el-descriptions-item label="构建人">{{ currentVersion.builtByDisplayName || '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-empty v-else description="当前没有可用底图版本" />
      </el-card>

      <el-card shadow="never" class="table-card">
        <el-table :data="versions" stripe height="100%" v-loading="loading">
          <el-table-column prop="versionCode" label="版本编码" min-width="170" />
          <el-table-column prop="title" label="标题" min-width="180" />
          <el-table-column label="构建状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getBasemapBuildStatusTagType(row.buildStatus)" effect="light">
                {{ getBasemapBuildStatusLabel(row.buildStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="当前版本" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.isCurrent" type="success" effect="light">当前</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="totalChangeCount" label="变更数" width="90" />
          <el-table-column label="构建时间" min-width="170">
            <template #default="{ row }">
              {{ formatDateTime(row.builtAt || row.updateTime) }}
            </template>
          </el-table-column>
          <el-table-column label="启用时间" min-width="170">
            <template #default="{ row }">
              {{ formatDateTime(row.activatedAt) || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="openDetail(row)">查看变更</el-button>
              <el-button
                v-if="!row.isCurrent && row.buildStatus === 'success'"
                type="success"
                link
                :loading="activatingVersionId === row.id"
                @click="activate(row.id)"
              >
                切为当前
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-drawer v-model="detailVisible" title="底图版本详情" size="56%">
      <template v-if="detailVersion">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="版本编码">{{ detailVersion.versionCode }}</el-descriptions-item>
          <el-descriptions-item label="版本标题">{{ detailVersion.title }}</el-descriptions-item>
          <el-descriptions-item label="构建状态">
            <el-tag :type="getBasemapBuildStatusTagType(detailVersion.buildStatus)" effect="light">
              {{ getBasemapBuildStatusLabel(detailVersion.buildStatus) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="底图地址">{{ detailVersion.tilesUrl || '-' }}</el-descriptions-item>
          <el-descriptions-item label="源快照目录">{{ detailVersion.sourceSnapshotPath || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-block">
          <div class="detail-head">
            <h3>版本包含的底图变更</h3>
          </div>
          <el-table :data="detailChanges" stripe size="small" v-loading="detailLoading">
            <el-table-column label="名称" min-width="180">
              <template #default="{ row }">
                {{ row.displayName || row.targetBasemapObjectId || '(未命名变更)' }}
              </template>
            </el-table-column>
            <el-table-column label="对象" width="110">
              <template #default="{ row }">
                {{ getBasemapFeatureKindLabel(row.featureKind) }}
              </template>
            </el-table-column>
            <el-table-column label="动作" width="90">
              <template #default="{ row }">
                {{ getBasemapActionLabel(row.actionType) }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="getBasemapPublishStatusTagType(row.publishStatus)" effect="light">
                  {{ getBasemapPublishStatusLabel(row.publishStatus) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="detail-block">
          <div class="detail-head">
            <h3>构建日志</h3>
          </div>
          <pre class="log-box">{{ detailVersion.buildLog || '暂无构建日志' }}</pre>
        </div>
      </template>
    </el-drawer>
  </PageContainer>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import PageContainer from '@/components/common/PageContainer.vue';
import { activateBasemapVersion, getBasemapVersionChanges, getCurrentBasemapVersion, queryBasemapVersions } from '@/api/basemapApi';
import type { BasemapFeatureChange, BasemapVersion } from '@/types/basemap';
import { formatDateTime } from '@/utils/format';
import {
  getBasemapActionLabel,
  getBasemapBuildStatusLabel,
  getBasemapBuildStatusTagType,
  getBasemapFeatureKindLabel,
  getBasemapPublishStatusLabel,
  getBasemapPublishStatusTagType
} from '@/utils/basemapPublish';

const loading = ref(false);
const detailLoading = ref(false);
const detailVisible = ref(false);
const activatingVersionId = ref<string | null>(null);
const currentVersion = ref<BasemapVersion | null>(null);
const detailVersion = ref<BasemapVersion | null>(null);
const versions = ref<BasemapVersion[]>([]);
const detailChanges = ref<BasemapFeatureChange[]>([]);

async function loadVersions(): Promise<void> {
  loading.value = true;
  try {
    const [allVersions, activeVersion] = await Promise.all([
      queryBasemapVersions(),
      getCurrentBasemapVersion()
    ]);
    versions.value = allVersions;
    currentVersion.value = activeVersion;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '底图版本加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(version: BasemapVersion): Promise<void> {
  detailVisible.value = true;
  detailVersion.value = version;
  detailLoading.value = true;
  try {
    detailChanges.value = await getBasemapVersionChanges(version.id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '底图版本详情加载失败');
  } finally {
    detailLoading.value = false;
  }
}

async function activate(versionId: string): Promise<void> {
  activatingVersionId.value = versionId;
  try {
    const version = await activateBasemapVersion(versionId);
    currentVersion.value = version;
    await loadVersions();
    ElMessage.success(`已切换到底图版本 ${version.versionCode}`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '切换底图版本失败');
  } finally {
    activatingVersionId.value = null;
  }
}

async function reloadAll(): Promise<void> {
  await loadVersions();
}

onMounted(() => {
  void loadVersions();
});
</script>

<style scoped>
.page-grid {
  display: grid;
  gap: 16px;
}

.table-card {
  min-height: 480px;
}

.detail-block {
  margin-top: 20px;
}

.detail-head {
  margin-bottom: 10px;
}

.detail-head h3 {
  margin: 0;
  font-size: 16px;
}

.log-box {
  margin: 0;
  padding: 14px;
  border-radius: 12px;
  background: #0f172a;
  color: #d8e0f0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.6;
}
</style>
