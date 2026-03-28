import { computed } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { getRoleLabel } from '@/utils/reviewWorkflow';

export function useCurrentUserRole() {
  const authStore = useAuthStore();

  const roleCode = computed(() => authStore.roleCode);
  const isSuperAdmin = computed(() => authStore.isSuperAdmin);
  const isAdmin = computed(() => authStore.isAdminRole);
  const isNormalUser = computed(() => authStore.isNormalUser);
  const roleLabel = computed(() => getRoleLabel(roleCode.value));
  const mustUseSubmissionWorkflow = computed(() => isNormalUser.value);
  const canReviewSubmissions = computed(() => isAdmin.value || isSuperAdmin.value);
  const canManageUsers = computed(() => isSuperAdmin.value);
  const canManageFormalData = computed(() => isAdmin.value || isSuperAdmin.value);

  return {
    roleCode,
    roleLabel,
    isSuperAdmin,
    isAdmin,
    isNormalUser,
    mustUseSubmissionWorkflow,
    canReviewSubmissions,
    canManageUsers,
    canManageFormalData
  };
}
