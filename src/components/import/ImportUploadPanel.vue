<template>
  <div class="panel-grid">
    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="panel-header">
          <div>
            <h3>上传 OSM 文件</h3>
            <p>上传 `.osm.pbf` 到后端导入目录，再创建导入任务。正式导入链路会写入店铺、区域、POI、地名与边界。</p>
          </div>
          <el-tag type="warning" effect="light">中小文件</el-tag>
        </div>
      </template>

      <el-form label-position="top" @submit.prevent>
        <el-form-item label="源文件">
          <div class="file-row">
            <el-input :model-value="selectedFileName" readonly placeholder="请选择 .osm.pbf 文件" />
            <input
              ref="fileInputRef"
              type="file"
              accept=".osm.pbf"
              class="hidden-file-input"
              @change="handleFileChange"
            />
            <el-button @click="triggerFileSelect">选择文件</el-button>
          </div>
        </el-form-item>

        <el-alert
          type="warning"
          show-icon
          :closable="false"
          title="100MB 以上的大文件更推荐使用“服务器已有文件”方式"
          description="Web 上传已放宽到 1GB，但大文件仍更适合先放到服务器目录，再通过文件路径创建导入任务。"
        />

        <div v-if="selectedFile" class="file-meta">
          <span>当前文件：{{ selectedFileName }}</span>
          <span>大小：{{ selectedFileSizeLabel }}</span>
          <el-tag v-if="isLargeSelectedFile" type="warning" effect="light">建议改用服务器路径导入</el-tag>
        </div>

        <el-form-item label="管理员标识">
          <el-input v-model="uploadForm.createBy" placeholder="例如 admin / ops" clearable />
        </el-form-item>

        <el-form-item label="可选 BBox">
          <el-input v-model="uploadForm.bbox" placeholder="minLon,minLat,maxLon,maxLat" clearable />
        </el-form-item>

        <div class="option-grid">
          <el-checkbox v-model="uploadForm.importShops">导入店铺</el-checkbox>
          <el-checkbox v-model="uploadForm.importAreas">导入区域</el-checkbox>
          <el-switch v-model="uploadForm.autoStart" active-text="创建后自动启动" />
        </div>

        <div class="panel-actions">
          <el-button type="primary" :loading="uploadLoading" :disabled="!selectedFile" @click="submitUpload">
            上传并创建任务
          </el-button>
        </div>
      </el-form>
    </el-card>

    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="panel-header">
          <div>
            <h3>使用服务器已有文件</h3>
            <p>适合运维已把 `.osm.pbf` 放到服务器本地目录的场景，也是五类正式服务层数据导入的推荐方式。</p>
          </div>
          <el-tag type="success" effect="light">推荐</el-tag>
        </div>
      </template>

      <el-form label-position="top" @submit.prevent>
        <el-form-item label="选择历史文件">
          <div class="existing-file-toolbar">
            <el-select
              v-model="selectedAvailableFilePath"
              class="existing-file-select"
              filterable
              clearable
              :loading="availableFilesLoading"
              placeholder="从导入目录选择 .osm.pbf 文件"
              no-data-text="导入目录暂无可用 .osm.pbf 文件"
            >
              <el-option
                v-for="file in availableFiles"
                :key="file.filePath"
                :label="getAvailableFileOptionLabel(file)"
                :value="file.filePath"
              />
            </el-select>
            <el-button :loading="availableFilesLoading" @click="emit('refresh-existing-files')">刷新</el-button>
          </div>
          <p class="field-hint">选中后会自动回填下面的服务器文件路径，也可以继续手工修改。</p>

          <div v-if="selectedAvailableFile" class="existing-file-meta">
            <span>显示名：{{ selectedAvailableFile.displayName }}</span>
            <span>大小：{{ formatFileSize(selectedAvailableFile.fileSize) }}</span>
            <span>更新时间：{{ formatDateTime(selectedAvailableFile.lastModifiedTime) }}</span>
            <span class="existing-file-path">{{ selectedAvailableFile.filePath }}</span>
            <el-popconfirm
              title="删除后不可恢复，确认删除该文件？"
              confirm-button-text="删除"
              cancel-button-text="取消"
              @confirm="requestDeleteSelectedFile"
            >
              <template #reference>
                <el-button type="danger" text :loading="deleteLoading">删除该文件</el-button>
              </template>
            </el-popconfirm>
          </div>
        </el-form-item>

        <el-form-item label="服务器文件路径">
          <el-input v-model="pathForm.filePath" placeholder="/data/fuyaomap/imports/guangdong-latest.osm.pbf" clearable />
        </el-form-item>

        <el-form-item label="显示文件名">
          <el-input v-model="pathForm.fileName" placeholder="可选，留空则使用服务器文件名" clearable />
        </el-form-item>

        <el-form-item label="管理员标识">
          <el-input v-model="pathForm.createBy" placeholder="例如 admin / ops" clearable />
        </el-form-item>

        <el-form-item label="可选 BBox">
          <el-input v-model="pathForm.bbox" placeholder="minLon,minLat,maxLon,maxLat" clearable />
        </el-form-item>

        <div class="option-grid">
          <el-checkbox v-model="pathForm.importShops">导入店铺</el-checkbox>
          <el-checkbox v-model="pathForm.importAreas">导入区域</el-checkbox>
          <el-switch v-model="pathForm.autoStart" active-text="创建后自动启动" />
        </div>

        <div class="panel-actions">
          <el-button type="primary" :loading="pathLoading" :disabled="!pathForm.filePath.trim()" @click="submitServerPath">
            创建导入任务
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type {
  MapImportAvailableFile,
  ServerPathImportSubmitPayload,
  UploadImportSubmitPayload
} from '@/types/import';
import { formatDateTime } from '@/utils/format';

const LARGE_FILE_BYTES = 100 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;

const props = withDefaults(defineProps<{
  uploadLoading?: boolean;
  pathLoading?: boolean;
  availableFiles?: MapImportAvailableFile[];
  availableFilesLoading?: boolean;
  deleteLoading?: boolean;
}>(), {
  uploadLoading: false,
  pathLoading: false,
  availableFiles: () => [],
  availableFilesLoading: false,
  deleteLoading: false
});

const emit = defineEmits<{
  (event: 'upload-submit', payload: UploadImportSubmitPayload): void;
  (event: 'path-submit', payload: ServerPathImportSubmitPayload): void;
  (event: 'refresh-existing-files'): void;
  (event: 'delete-existing-file', payload: MapImportAvailableFile): void;
}>();

const fileInputRef = ref<HTMLInputElement>();
const selectedFile = ref<File | null>(null);
const selectedAvailableFilePath = ref('');
const lastAutoFilledFileName = ref('');

const uploadForm = ref({
  bbox: '',
  importShops: true,
  importAreas: true,
  createBy: '',
  autoStart: true
});

const pathForm = ref({
  filePath: '',
  fileName: '',
  bbox: '',
  importShops: true,
  importAreas: true,
  createBy: '',
  autoStart: true
});

const selectedFileName = computed(() => selectedFile.value?.name ?? '');
const selectedFileSizeLabel = computed(() => formatFileSize(selectedFile.value?.size));
const isLargeSelectedFile = computed(() => (selectedFile.value?.size ?? 0) >= LARGE_FILE_BYTES);
const availableFiles = computed(() => props.availableFiles ?? []);
const availableFilesLoading = computed(() => props.availableFilesLoading);
const deleteLoading = computed(() => props.deleteLoading);
const selectedAvailableFile = computed(() =>
  availableFiles.value.find((item) => item.filePath === selectedAvailableFilePath.value) ?? null);

watch(selectedAvailableFile, (file) => {
  if (!file) {
    return;
  }

  pathForm.value.filePath = file.filePath;

  const preferredFileName = file.originalFileName?.trim() || file.displayName.trim() || file.fileName.trim();
  const currentFileName = pathForm.value.fileName.trim();
  if (!currentFileName || currentFileName === lastAutoFilledFileName.value) {
    pathForm.value.fileName = preferredFileName;
    lastAutoFilledFileName.value = preferredFileName;
  }
});

watch(selectedAvailableFilePath, (value, previousValue) => {
  if (value || !previousValue) {
    return;
  }

  if (pathForm.value.filePath.trim() === previousValue) {
    pathForm.value.filePath = '';
  }

  if (pathForm.value.fileName.trim() === lastAutoFilledFileName.value) {
    pathForm.value.fileName = '';
  }

  lastAutoFilledFileName.value = '';
});

watch(availableFiles, (files) => {
  if (!selectedAvailableFilePath.value) {
    return;
  }

  if (files.some((item) => item.filePath === selectedAvailableFilePath.value)) {
    return;
  }

  if (pathForm.value.filePath.trim() === selectedAvailableFilePath.value) {
    pathForm.value.filePath = '';
  }

  if (pathForm.value.fileName.trim() === lastAutoFilledFileName.value) {
    pathForm.value.fileName = '';
  }

  selectedAvailableFilePath.value = '';
  lastAutoFilledFileName.value = '';
});

function triggerFileSelect(): void {
  fileInputRef.value?.click();
}

function handleFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  selectedFile.value = input.files?.[0] ?? null;
}

function submitUpload(): void {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择 .osm.pbf 文件');
    return;
  }

  if (selectedFile.value.size > MAX_UPLOAD_BYTES) {
    ElMessage.error('当前 Web 上传上限为 1GB，请改用“服务器已有文件”方式导入。');
    return;
  }

  if (!uploadForm.value.importShops && !uploadForm.value.importAreas) {
    ElMessage.warning('至少选择一种导入目标');
    return;
  }

  emit('upload-submit', {
    file: selectedFile.value,
    bbox: uploadForm.value.bbox.trim(),
    importShops: uploadForm.value.importShops,
    importAreas: uploadForm.value.importAreas,
    createBy: uploadForm.value.createBy.trim(),
    autoStart: uploadForm.value.autoStart
  });
}

function submitServerPath(): void {
  if (!pathForm.value.filePath.trim()) {
    ElMessage.warning('请输入服务器文件路径');
    return;
  }

  if (!pathForm.value.importShops && !pathForm.value.importAreas) {
    ElMessage.warning('至少选择一种导入目标');
    return;
  }

  emit('path-submit', {
    filePath: pathForm.value.filePath.trim(),
    fileName: pathForm.value.fileName.trim(),
    bbox: pathForm.value.bbox.trim(),
    importShops: pathForm.value.importShops,
    importAreas: pathForm.value.importAreas,
    createBy: pathForm.value.createBy.trim(),
    autoStart: pathForm.value.autoStart
  });
}

function requestDeleteSelectedFile(): void {
  if (!selectedAvailableFile.value) {
    return;
  }

  emit('delete-existing-file', selectedAvailableFile.value);
}

function getAvailableFileOptionLabel(file: MapImportAvailableFile): string {
  const parts = [file.displayName];
  if (file.originalFileName && file.originalFileName !== file.fileName) {
    parts.push(`存储名 ${file.fileName}`);
  }

  parts.push(formatFileSize(file.fileSize));
  return parts.join(' · ');
}

function formatFileSize(fileSize?: number): string {
  if (!fileSize || fileSize <= 0) {
    return '-';
  }

  if (fileSize >= 1024 * 1024 * 1024) {
    return `${(fileSize / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  if (fileSize >= 1024 * 1024) {
    return `${(fileSize / 1024 / 1024).toFixed(2)} MB`;
  }

  if (fileSize >= 1024) {
    return `${(fileSize / 1024).toFixed(2)} KB`;
  }

  return `${fileSize} B`;
}
</script>

<style scoped>
.panel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.panel-card {
  height: 100%;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
}

.panel-header p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.file-row,
.existing-file-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  width: 100%;
}

.existing-file-select {
  width: 100%;
}

.hidden-file-input {
  display: none;
}

.option-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 4px;
}

.file-meta,
.existing-file-meta {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  color: var(--text-secondary);
  font-size: 13px;
}

.existing-file-path {
  flex: 1 1 100%;
  word-break: break-all;
}

.field-hint {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.panel-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 960px) {
  .panel-grid {
    grid-template-columns: 1fr;
  }
}
</style>
