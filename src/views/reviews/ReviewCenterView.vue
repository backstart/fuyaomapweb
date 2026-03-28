<template>
  <PageContainer
    title="审核中心"
    eyebrow="Reviews"
    description="管理员只处理分配给自己的普通用户提交，超级管理员可查看全部待审任务。"
  >
    <template #actions>
      <el-button @click="loadSubmissions">刷新</el-button>
    </template>

    <div class="page-grid">
      <el-card shadow="never">
        <el-form :inline="true" @submit.prevent>
          <el-form-item v-if="isSuperAdmin" label="范围">
            <el-select v-model="scope" style="width: 140px">
              <el-option label="全部任务" value="all" />
              <el-option label="分配给我" value="assigned" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px">
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
          <el-table-column prop="submitterDisplayName" label="提交人" min-width="130" />
          <el-table-column prop="reviewerAdminDisplayName" label="审核人" min-width="130" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getSubmissionStatusTagType(row.status)" effect="light">
                {{ getSubmissionStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
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
          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="openDetail(row)">查看审核</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-drawer v-model="detailVisible" title="审核详情" size="50%">
      <template v-if="currentSubmission">
        <el-descriptions :column="1" border class="detail-descriptions">
          <el-descriptions-item label="提交名称">
            {{ currentSubmission.displayName || '(未命名提交)' }}
          </el-descriptions-item>
          <el-descriptions-item label="对象类型">
            {{ getSubmissionFeatureKindLabel(currentSubmission.featureKind) }}
          </el-descriptions-item>
          <el-descriptions-item label="提交人">
            {{ currentSubmission.submitterDisplayName }}
          </el-descriptions-item>
          <el-descriptions-item label="审核状态">
            <el-tag :type="getSubmissionStatusTagType(currentSubmission.status)" effect="light">
              {{ getSubmissionStatusLabel(currentSubmission.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="当前意见">
            {{ currentSubmission.reviewComment || currentSubmission.rejectionReason || '-' }}
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

        <div v-if="currentSubmission.status === 'pending'" class="detail-block review-action-block">
          <div class="detail-block-head">
            <h3>审核处理</h3>
          </div>
          <el-input
            v-model="reviewComment"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 5 }"
            placeholder="填写审核意见；拒绝时必填。"
          />
          <div class="review-action-row">
            <el-button type="success" :loading="reviewSubmitting" @click="approveCurrentSubmission">审核通过</el-button>
            <el-button type="danger" plain :loading="reviewSubmitting" @click="rejectCurrentSubmission">审核驳回</el-button>
          </div>
        </div>
      </template>
    </el-drawer>
  </PageContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import PageContainer from '@/components/common/PageContainer.vue';
import {
  approveMapFeatureSubmission,
  getMapFeatureSubmission,
  getMapFeatureSubmissionReviews,
  queryMapFeatureSubmissions,
  rejectMapFeatureSubmission
} from '@/api/submissionApi';
import { useCurrentUserRole } from '@/composables/useCurrentUserRole';
import type {
  MapFeatureSubmission,
  MapFeatureSubmissionReview,
  SubmissionFeatureKind,
  SubmissionScope,
  SubmissionStatus
} from '@/types/submission';
import { formatDateTime } from '@/utils/format';
import {
  getSubmissionFeatureKindLabel,
  getSubmissionStatusLabel,
  getSubmissionStatusTagType
} from '@/utils/reviewWorkflow';

const { isSuperAdmin } = useCurrentUserRole();
const loading = ref(false);
const reviewsLoading = ref(false);
const reviewSubmitting = ref(false);
const detailVisible = ref(false);
const scope = ref<SubmissionScope>('assigned');
const reviewComment = ref('');
const submissions = ref<MapFeatureSubmission[]>([]);
const reviews = ref<MapFeatureSubmissionReview[]>([]);
const currentSubmission = ref<MapFeatureSubmission | null>(null);
const filters = reactive({
  status: 'pending' as SubmissionStatus | '',
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
      scope: isSuperAdmin.value ? scope.value : 'assigned',
      status: filters.status || undefined,
      featureKind: filters.featureKind || undefined,
      keyword: filters.keyword.trim() || undefined
    });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审核任务加载失败');
  } finally {
    loading.value = false;
  }
}

function resetFilters(): void {
  filters.status = 'pending';
  filters.featureKind = '';
  filters.keyword = '';
  if (isSuperAdmin.value) {
    scope.value = 'assigned';
  }
  void loadSubmissions();
}

async function openDetail(item: MapFeatureSubmission): Promise<void> {
  detailVisible.value = true;
  reviewComment.value = '';
  reviewsLoading.value = true;
  try {
    const [detail, history] = await Promise.all([
      getMapFeatureSubmission(item.id),
      getMapFeatureSubmissionReviews(item.id)
    ]);
    currentSubmission.value = detail;
    reviews.value = history;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审核详情加载失败');
  } finally {
    reviewsLoading.value = false;
  }
}

async function approveCurrentSubmission(): Promise<void> {
  if (!currentSubmission.value) {
    return;
  }

  reviewSubmitting.value = true;
  try {
    currentSubmission.value = await approveMapFeatureSubmission(currentSubmission.value.id, {
      reviewComment: reviewComment.value.trim() || null
    });
    reviews.value = await getMapFeatureSubmissionReviews(currentSubmission.value.id);
    await loadSubmissions();
    ElMessage.success('审核已通过，正式数据已落库');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审核通过失败');
  } finally {
    reviewSubmitting.value = false;
  }
}

async function rejectCurrentSubmission(): Promise<void> {
  if (!currentSubmission.value) {
    return;
  }

  if (!reviewComment.value.trim()) {
    ElMessage.warning('驳回时必须填写审核意见');
    return;
  }

  reviewSubmitting.value = true;
  try {
    currentSubmission.value = await rejectMapFeatureSubmission(currentSubmission.value.id, {
      reviewComment: reviewComment.value.trim()
    });
    reviews.value = await getMapFeatureSubmissionReviews(currentSubmission.value.id);
    await loadSubmissions();
    ElMessage.success('提交已驳回');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审核驳回失败');
  } finally {
    reviewSubmitting.value = false;
  }
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

.detail-descriptions,
.detail-block {
  margin-bottom: 16px;
}

.detail-block-head h3 {
  margin: 0 0 10px;
  font-size: 15px;
}

.review-action-block {
  display: grid;
  gap: 12px;
}

.review-action-row {
  display: flex;
  gap: 10px;
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
