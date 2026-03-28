<template>
  <PageContainer
    title="我的提交"
    eyebrow="Submissions"
    description="普通用户的新增地图数据先进入待审区，审核通过后才会进入正式业务表。"
  >
    <template #actions>
      <el-button @click="loadSubmissions">刷新</el-button>
    </template>

    <div class="page-grid">
      <el-card shadow="never">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="状态">
            <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px">
              <el-option label="草稿" value="draft" />
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="filters.featureKind" clearable placeholder="全部类型" style="width: 180px">
              <el-option label="手工标注" value="label" />
              <el-option label="手工建筑区域" value="manual_building_area" />
            </el-select>
          </el-form-item>
          <el-form-item label="关键字">
            <el-input
              v-model="filters.keyword"
              placeholder="名称或提交内容"
              clearable
              @keyup.enter="loadSubmissions"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="loadSubmissions">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="table-card">
        <el-table :data="submissions" stripe height="100%" v-loading="loading">
          <el-table-column label="名称" min-width="180">
            <template #default="{ row }">
              {{ row.displayName || '(未命名提交)' }}
            </template>
          </el-table-column>
          <el-table-column label="类型" width="150">
            <template #default="{ row }">
              {{ getSubmissionFeatureKindLabel(row.featureKind) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getSubmissionStatusTagType(row.status)" effect="light">
                {{ getSubmissionStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reviewerAdminDisplayName" label="审核管理员" min-width="140" />
          <el-table-column label="提交时间" min-width="170">
            <template #default="{ row }">
              {{ formatDateTime(row.submittedAt || row.updateTime) }}
            </template>
          </el-table-column>
          <el-table-column label="审核时间" min-width="170">
            <template #default="{ row }">
              {{ formatDateTime(row.reviewedAt) || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="驳回原因" min-width="220">
            <template #default="{ row }">
              {{ row.rejectionReason || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="openDetail(row)">详情</el-button>
              <el-button
                v-if="canEditSubmission(row.status)"
                type="primary"
                link
                @click="editSubmission(row)"
              >
                继续编辑
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-drawer v-model="detailVisible" title="提交详情" size="46%">
      <template v-if="currentSubmission">
        <el-alert
          v-if="currentSubmission.rejectionReason"
          type="error"
          :closable="false"
          :title="`驳回原因：${currentSubmission.rejectionReason}`"
          class="detail-alert"
        />

        <el-descriptions :column="1" border class="detail-descriptions">
          <el-descriptions-item label="提交名称">
            {{ currentSubmission.displayName || '(未命名提交)' }}
          </el-descriptions-item>
          <el-descriptions-item label="对象类型">
            {{ getSubmissionFeatureKindLabel(currentSubmission.featureKind) }}
          </el-descriptions-item>
          <el-descriptions-item label="审核状态">
            <el-tag :type="getSubmissionStatusTagType(currentSubmission.status)" effect="light">
              {{ getSubmissionStatusLabel(currentSubmission.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="审核管理员">
            {{ currentSubmission.reviewerAdminDisplayName }}
          </el-descriptions-item>
          <el-descriptions-item label="审核意见">
            {{ currentSubmission.reviewComment || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="正式表落点">
            {{ currentSubmission.approvedTargetTable && currentSubmission.approvedTargetId
              ? `${currentSubmission.approvedTargetTable} / ${currentSubmission.approvedTargetId}`
              : '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="detail-block">
          <div class="detail-block-head">
            <h3>审核历史</h3>
          </div>
          <el-table :data="reviews" stripe size="small" v-loading="reviewsLoading">
            <el-table-column prop="action" label="动作" width="110" />
            <el-table-column prop="operatorDisplayName" label="操作人" min-width="120" />
            <el-table-column label="状态流转" min-width="180">
              <template #default="{ row }">
                {{ row.fromStatus || '-' }} -> {{ row.toStatus }}
              </template>
            </el-table-column>
            <el-table-column prop="comment" label="意见" min-width="180" />
            <el-table-column label="时间" min-width="170">
              <template #default="{ row }">
                {{ formatDateTime(row.createTime) }}
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="detail-block">
          <div class="detail-block-head">
            <h3>提交内容</h3>
          </div>
          <pre class="payload-box">{{ formattedPayload }}</pre>
        </div>
      </template>
    </el-drawer>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import { getMapFeatureSubmission, getMapFeatureSubmissionReviews, queryMapFeatureSubmissions } from '@/api/submissionApi';
import type { MapFeatureSubmission, MapFeatureSubmissionReview, SubmissionFeatureKind, SubmissionStatus } from '@/types/submission';
import { formatDateTime } from '@/utils/format';
import {
  canEditSubmission,
  getSubmissionFeatureKindLabel,
  getSubmissionStatusLabel,
  getSubmissionStatusTagType
} from '@/utils/reviewWorkflow';

const router = useRouter();
const loading = ref(false);
const reviewsLoading = ref(false);
const detailVisible = ref(false);
const submissions = ref<MapFeatureSubmission[]>([]);
const reviews = ref<MapFeatureSubmissionReview[]>([]);
const currentSubmission = ref<MapFeatureSubmission | null>(null);
const filters = reactive({
  status: '' as SubmissionStatus | '',
  featureKind: '' as SubmissionFeatureKind | '',
  keyword: ''
});

const formattedPayload = computed(() =>
  currentSubmission.value ? JSON.stringify(currentSubmission.value.payload, null, 2) : ''
);

async function loadSubmissions(): Promise<void> {
  loading.value = true;
  try {
    submissions.value = await queryMapFeatureSubmissions({
      scope: 'mine',
      status: filters.status || undefined,
      featureKind: filters.featureKind || undefined,
      keyword: filters.keyword.trim() || undefined
    });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '提交列表加载失败');
  } finally {
    loading.value = false;
  }
}

function resetFilters(): void {
  filters.status = '';
  filters.featureKind = '';
  filters.keyword = '';
  void loadSubmissions();
}

async function openDetail(item: MapFeatureSubmission): Promise<void> {
  detailVisible.value = true;
  reviewsLoading.value = true;
  try {
    const [detail, history] = await Promise.all([
      getMapFeatureSubmission(item.id),
      getMapFeatureSubmissionReviews(item.id)
    ]);
    currentSubmission.value = detail;
    reviews.value = history;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '提交详情加载失败');
  } finally {
    reviewsLoading.value = false;
  }
}

async function editSubmission(item: MapFeatureSubmission): Promise<void> {
  await router.push({
    name: 'map',
    query: {
      submissionId: item.id
    }
  });
}

onMounted(() => {
  void loadSubmissions();
});
</script>

<style scoped>
.page-grid {
  display: grid;
  gap: 18px;
  height: 100%;
}

.table-card {
  min-height: 560px;
}

.table-card :deep(.el-card__body) {
  min-height: 560px;
  height: 100%;
}

.detail-alert,
.detail-descriptions,
.detail-block {
  margin-bottom: 16px;
}

.detail-block-head h3 {
  margin: 0 0 10px;
  font-size: 15px;
}

.payload-box {
  margin: 0;
  padding: 14px;
  border-radius: 14px;
  background: #0f172a;
  color: #e2e8f0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
