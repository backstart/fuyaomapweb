<template>
  <PageContainer
    title="用户管理"
    eyebrow="Users"
    description="超级管理员在这里维护平台账号，并为普通用户指定审核管理员。"
  >
    <template #actions>
      <el-button type="primary" @click="openCreateDialog">新增用户</el-button>
    </template>

    <div class="page-grid">
      <el-card shadow="never">
        <el-form :inline="true" @submit.prevent>
          <el-form-item label="关键字">
            <el-input
              v-model="filters.keyword"
              placeholder="用户名或显示名"
              clearable
              @keyup.enter="loadUsers"
            />
          </el-form-item>
          <el-form-item label="角色">
            <el-select v-model="filters.roleCode" clearable placeholder="全部角色" style="width: 160px">
              <el-option label="超级管理员" value="super_admin" />
              <el-option label="管理员" value="admin" />
              <el-option label="普通用户" value="user" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px">
              <el-option label="启用" value="enabled" />
              <el-option label="禁用" value="disabled" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="loadUsers">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="table-card">
        <el-table :data="users" stripe height="100%" v-loading="loading">
          <el-table-column prop="username" label="用户名" min-width="140" />
          <el-table-column prop="displayName" label="显示名称" min-width="150" />
          <el-table-column label="角色" width="130">
            <template #default="{ row }">
              <el-tag :type="row.roleCode === 'super_admin' ? 'danger' : row.roleCode === 'admin' ? 'warning' : 'info'" effect="light">
                {{ getRoleLabel(row.roleCode) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="row.status === 'enabled' ? 'success' : 'danger'" effect="light">
                {{ row.status === 'enabled' ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reviewerAdminDisplayName" label="审核管理员" min-width="140" />
          <el-table-column prop="phone" label="手机号" min-width="140" />
          <el-table-column prop="email" label="邮箱" min-width="180" />
          <el-table-column label="最近登录" min-width="170">
            <template #default="{ row }">
              {{ formatDateTime(row.lastLoginTime) || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="170">
            <template #default="{ row }">
              {{ formatDateTime(row.updateTime || row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="openEditDialog(row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editingUserId ? '编辑用户' : '新增用户'"
      width="560px"
      destroy-on-close
    >
      <el-form label-position="top" @submit.prevent>
        <div class="form-grid">
          <el-form-item label="用户名" required>
            <el-input v-model="form.username" :disabled="Boolean(editingUserId)" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="显示名称">
            <el-input v-model="form.displayName" placeholder="请输入显示名称" />
          </el-form-item>
        </div>

        <div class="form-grid">
          <el-form-item label="角色" required>
            <el-select v-model="form.roleCode">
              <el-option label="管理员" value="admin" />
              <el-option label="普通用户" value="user" />
              <el-option label="超级管理员" value="super_admin" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态" required>
            <el-select v-model="form.status">
              <el-option label="启用" value="enabled" />
              <el-option label="禁用" value="disabled" />
            </el-select>
          </el-form-item>
        </div>

        <div class="form-grid">
          <el-form-item label="手机号">
            <el-input v-model="form.phone" placeholder="请输入手机号" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="form.email" placeholder="请输入邮箱" />
          </el-form-item>
        </div>

        <el-form-item :label="editingUserId ? '重置密码' : '登录密码'" :required="!editingUserId">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="editingUserId ? '留空则不修改密码' : '请输入登录密码'"
          />
        </el-form-item>

        <el-form-item v-if="form.roleCode === 'user'" label="审核管理员">
          <el-select v-model="form.reviewerAdminId" clearable filterable placeholder="请选择审核管理员">
            <el-option
              v-for="option in reviewerOptions"
              :key="option.id"
              :label="`${option.displayName} (${option.username})`"
              :value="option.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import PageContainer from '@/components/common/PageContainer.vue';
import { assignUserReviewer, createUser, getReviewerOptions, queryUsers, updateUser } from '@/api/userManagementApi';
import type { RoleCode } from '@/types/auth';
import type { PlatformUser, ReviewerOption } from '@/types/userManagement';
import { formatDateTime } from '@/utils/format';
import { getRoleLabel } from '@/utils/reviewWorkflow';

const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const editingUserId = ref<string | null>(null);
const users = ref<PlatformUser[]>([]);
const reviewerOptions = ref<ReviewerOption[]>([]);
const filters = reactive({
  keyword: '',
  roleCode: '' as RoleCode | '',
  status: ''
});
const form = reactive({
  username: '',
  displayName: '',
  phone: '',
  email: '',
  password: '',
  roleCode: 'user' as RoleCode,
  status: 'enabled',
  reviewerAdminId: ''
});

async function loadUsers(): Promise<void> {
  loading.value = true;
  try {
    users.value = await queryUsers({
      keyword: filters.keyword.trim() || undefined,
      roleCode: filters.roleCode || undefined,
      status: filters.status || undefined
    });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '用户列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadReviewerOptions(): Promise<void> {
  try {
    reviewerOptions.value = await getReviewerOptions();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审核管理员选项加载失败');
  }
}

function resetFilters(): void {
  filters.keyword = '';
  filters.roleCode = '';
  filters.status = '';
  void loadUsers();
}

function resetForm(): void {
  editingUserId.value = null;
  form.username = '';
  form.displayName = '';
  form.phone = '';
  form.email = '';
  form.password = '';
  form.roleCode = 'user';
  form.status = 'enabled';
  form.reviewerAdminId = '';
}

function openCreateDialog(): void {
  resetForm();
  dialogVisible.value = true;
}

function openEditDialog(user: PlatformUser): void {
  editingUserId.value = user.id;
  form.username = user.username;
  form.displayName = user.displayName || '';
  form.phone = user.phone || '';
  form.email = user.email || '';
  form.password = '';
  form.roleCode = user.roleCode;
  form.status = user.status;
  form.reviewerAdminId = user.reviewerAdminId || '';
  dialogVisible.value = true;
}

async function submitForm(): Promise<void> {
  if (!editingUserId.value && !form.username.trim()) {
    ElMessage.warning('用户名不能为空');
    return;
  }

  if (!editingUserId.value && !form.password.trim()) {
    ElMessage.warning('登录密码不能为空');
    return;
  }

  if (form.roleCode === 'user' && !form.reviewerAdminId.trim()) {
    ElMessage.warning('普通用户必须指定审核管理员');
    return;
  }

  submitting.value = true;
  try {
    if (editingUserId.value) {
      await updateUser(editingUserId.value, {
        displayName: form.displayName.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        password: form.password.trim() || null,
        roleCode: form.roleCode,
        status: form.status
      });

      if (form.roleCode === 'user' && form.reviewerAdminId.trim()) {
        await assignUserReviewer(editingUserId.value, {
          reviewerAdminId: form.reviewerAdminId.trim()
        });
      }

      ElMessage.success('用户已更新');
    } else {
      await createUser({
        username: form.username.trim(),
        password: form.password.trim(),
        displayName: form.displayName.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        roleCode: form.roleCode,
        status: form.status,
        reviewerAdminId: form.roleCode === 'user' ? form.reviewerAdminId.trim() || null : null
      });
      ElMessage.success('用户已创建');
    }

    dialogVisible.value = false;
    await loadUsers();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '用户保存失败');
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadReviewerOptions(), loadUsers()]);
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
