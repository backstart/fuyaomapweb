<template>
  <div class="map-page-view">
    <div class="map-page">
      <BaseMap
        :shop-data="renderedShopData"
        :area-data="renderedAreaData"
        :poi-data="renderedPoiData"
        :place-data="renderedPlaceData"
        :boundary-data="renderedBoundaryData"
        :manual-label-data="manualLabelData"
        :business-label-data="businessLabelData"
        :drawn-building-area-data="drawnBuildingAreaData"
        :drawn-building-label-data="drawnBuildingLabelData"
        :layer-visibility="mapStore.layerVisibility"
        :initial-viewport="mapStore.viewport"
        :selected-target="mapStore.selectedEntity"
        :focus-target="focusTarget"
        :label-pick-mode="labelPickMode"
        :draw-building-mode="drawnBuildingStore.drawMode"
        @ready="handleMapReady"
        @viewport-change="handleViewportChange"
        @shop-click="handleEntityClick"
        @area-click="handleEntityClick"
        @poi-click="handleEntityClick"
        @place-click="handleEntityClick"
        @boundary-click="handleEntityClick"
        @map-click="handleMapClick"
        @basemap-feature-click="handleBasemapFeatureClick"
        @manual-label-click="handleManualLabelClick"
        @drawn-building-click="handleDrawnBuildingClick"
        @drawn-building-complete="handleDrawnBuildingComplete"
      />

      <div class="map-overlay map-overlay-left">
        <MapSearchBar
          v-model="searchKeyword"
          :semantic-type-value="searchTypeCode"
          :semantic-type-groups="searchSemanticTypeGroups"
          semantic-type-placeholder="全部语义类型"
          :loading="searchLoading"
          @update:semantic-type-value="searchTypeCode = $event"
          @submit="handleSearch"
          @clear="clearSearch"
        />

        <div v-if="showInspectorPanel" class="shell-card inspector-card inspector-card--amap">
          <div class="inspector-cover">
            <div class="inspector-cover-badge">当前选中</div>
            <button class="inspector-close" type="button" @click="clearSelectedEntity">
              关闭
            </button>
          </div>
          <div class="inspector-body">
            <div class="inspector-title-block">
              <strong>{{ mapStore.selectedEntity?.name }}</strong>
              <span class="inspector-subtitle">
                {{ mapStore.selectedEntity ? getFocusTargetSubtitle(mapStore.selectedEntity) : '' }}
              </span>
            </div>
            <div class="inspector-info-list">
              <p class="inspector-detail">
                {{ mapStore.selectedEntity ? getInspectorDetail(mapStore.selectedEntity) : '' }}
              </p>
              <p class="inspector-remark">
                {{ mapStore.selectedEntity ? getInspectorRemark(mapStore.selectedEntity) : '' }}
              </p>
            </div>
            <div class="inspector-actions">
              <el-button size="small" @click="focusSelectedEntity">定位到此</el-button>
              <el-button
                v-if="mapStore.selectedEntity?.entityType !== 'label'"
                size="small"
                type="primary"
                @click="editSelectedEntityLabel"
              >
                给对象补名称
              </el-button>
            </div>
          </div>
        </div>

        <div v-if="showSelectedDrawnBuildingPanel" class="shell-card inspector-card inspector-card--building">
          <div class="inspector-cover">
            <div class="inspector-cover-badge">已选建筑</div>
            <button class="inspector-close" type="button" @click="clearDrawnBuildingSelection">
              关闭
            </button>
          </div>
          <div class="inspector-body">
            <div class="inspector-title-block">
              <strong>{{ selectedDrawnBuildingArea?.name }}</strong>
              <span class="inspector-subtitle">
                {{ selectedDrawnBuildingArea ? getDrawnBuildingItemSubtitle(selectedDrawnBuildingArea) : '' }}
              </span>
            </div>
            <div class="inspector-info-list">
              <p class="inspector-detail">
                {{ selectedDrawnBuildingArea ? `标注点：${selectedDrawnBuildingArea.labelLongitude.toFixed(6)}, ${selectedDrawnBuildingArea.labelLatitude.toFixed(6)}` : '' }}
              </p>
              <p class="inspector-remark">
                {{ selectedDrawnBuildingArea?.remark?.trim() || '点击“进入编辑”后可修改名称、类型、样式与备注。' }}
              </p>
            </div>
            <div class="inspector-actions">
              <el-button size="small" @click="selectedDrawnBuildingArea && locateDrawnBuildingArea(selectedDrawnBuildingArea)">定位到此</el-button>
              <el-button size="small" type="primary" @click="editSelectedDrawnBuilding">进入编辑</el-button>
            </div>
          </div>
        </div>

        <div v-if="showSearchResultsPanel" class="shell-card search-results-card">
          <div class="card-head">
            <div class="card-title-row">
              <h3>搜索结果</h3>
              <span v-if="searchResultCountLabel" class="card-meta">{{ searchResultCountLabel }}</span>
            </div>
            <el-button text size="small" @click="clearSearchResults">清空</el-button>
          </div>

          <el-scrollbar max-height="280px">
            <div v-if="mapStore.searchResults.length" class="result-list">
              <button
                v-for="item in mapStore.searchResults"
                :key="`${item.itemType}-${item.id}`"
                class="result-item"
                type="button"
                @click="locateSearchResult(item)"
              >
                <div>
                  <strong>{{ item.name }}</strong>
                  <p>{{ getSearchItemSubtitle(item) }}</p>
                </div>
                <div class="result-item-side">
                  <el-tag
                    v-if="item.typeName || item.categoryName"
                    size="small"
                    effect="plain"
                    type="info"
                  >
                    {{ item.typeName || item.categoryName }}
                  </el-tag>
                  <span :class="['result-status', `result-status--${getStatusTagType(item.status)}`]">
                    {{ getStatusLabel(item.status) }}
                  </span>
                </div>
              </button>
            </div>
            <p v-else class="search-empty-tip">
              {{ searchLoading ? '正在搜索地图对象...' : searchPanelMessage }}
            </p>
          </el-scrollbar>
        </div>

        <div v-if="showDrawnBuildingListPanel" class="shell-card search-results-card building-list-card">
          <div class="card-head">
            <div class="card-title-row">
              <h3>建筑区域</h3>
              <span v-if="drawnBuildingListCountLabel" class="card-meta">{{ drawnBuildingListCountLabel }}</span>
            </div>
            <el-button text size="small" @click="clearDrawnBuildingFilter">清空</el-button>
          </div>

          <el-input
            v-model="drawnBuildingKeyword"
            placeholder="筛选名称、类型或编号"
            clearable
            class="building-list-filter"
          />

          <el-scrollbar max-height="280px">
            <div v-if="filteredDrawnBuildingAreas.length" class="result-list">
              <div
                v-for="item in filteredDrawnBuildingAreas"
                :key="String(item.id)"
                class="result-item result-item--stack"
                @click="previewDrawnBuildingArea(item)"
              >
                <div class="result-main">
                  <strong>{{ item.name }}</strong>
                  <p>{{ getDrawnBuildingItemSubtitle(item) }}</p>
                </div>
                <div class="result-inline-actions">
                  <el-button size="small" @click.stop="locateDrawnBuildingArea(item)">定位</el-button>
                  <el-button size="small" type="primary" @click.stop="editDrawnBuildingArea(item)">编辑</el-button>
                  <el-button size="small" type="danger" plain @click.stop="deleteDrawnBuildingArea(item)">删除</el-button>
                </div>
              </div>
            </div>
            <p v-else class="search-empty-tip">
              当前筛选条件下没有建筑区域。
            </p>
          </el-scrollbar>
        </div>
      </div>

      <div class="map-overlay map-overlay-right">
        <div class="map-workbench">
          <div class="shell-card map-toolbar-strip">
            <button
              type="button"
              :class="['map-toolbar-button', { 'map-toolbar-button--active': activeToolbarPanel === 'layers' }]"
              @click="toggleToolbarPanel('layers')"
            >
              <span>图层</span>
              <small>{{ visibleLayerCount }}/5</small>
            </button>
            <button
              type="button"
              :class="['map-toolbar-button', { 'map-toolbar-button--active': activeToolbarPanel === 'filter' }]"
              @click="toggleToolbarPanel('filter')"
            >
              <span>筛选</span>
              <small v-if="mapSemanticTypeCode">已筛选</small>
            </button>
            <button
              type="button"
              :class="['map-toolbar-button', { 'map-toolbar-button--active': activeToolbarPanel === 'label' }]"
              @click="toggleToolbarPanel('label')"
            >
              <span>标注</span>
              <small v-if="labelModeTag">{{ labelModeTag }}</small>
            </button>
            <button
              type="button"
              :class="['map-toolbar-button', { 'map-toolbar-button--active': activeToolbarPanel === 'building' }]"
              @click="toggleToolbarPanel('building')"
            >
              <span>建筑</span>
              <small v-if="toolbarPanelMeta && activeToolbarPanel === 'building'">{{ toolbarPanelMeta }}</small>
              <small v-else-if="drawnBuildingCountLabel">{{ drawnBuildingCountLabel }}</small>
            </button>
          </div>

          <div v-if="showToolbarPanel" class="shell-card map-toolbar-panel">
            <div class="card-head card-head--compact">
              <div class="card-title-row">
                <h3>{{ toolbarPanelTitle }}</h3>
                <span v-if="toolbarPanelMeta" class="card-meta">{{ toolbarPanelMeta }}</span>
              </div>
              <div class="card-head-actions">
                <el-button text size="small" @click="closeToolbarPanel">收起</el-button>
              </div>
            </div>

            <template v-if="activeToolbarPanel === 'layers'">
              <LayerSwitcher
                :model-value="mapStore.layerVisibility"
                :embedded="true"
                :show-title="false"
                @update:model-value="mapStore.setLayerVisibility"
              />
              <p class="toolbar-panel-tip">
                这里只控制数据库驱动的业务图层与名称层，底图背景会始终保留。
              </p>
            </template>

            <template v-else-if="activeToolbarPanel === 'filter'">
              <div class="tool-group">
                <span class="tool-group-title">按语义类型筛选当前视口</span>
                <el-select
                  v-model="mapSemanticTypeCode"
                  clearable
                  filterable
                  placeholder="全部语义类型"
                  class="tool-filter-select"
                >
                  <el-option-group
                    v-for="group in mapSemanticTypeGroups"
                    :key="group.categoryCode"
                    :label="group.categoryName"
                  >
                    <el-option
                      v-for="option in group.options"
                      :key="option.typeCode"
                      :label="option.typeName"
                      :value="option.typeCode"
                    />
                  </el-option-group>
                </el-select>
                <p class="toolbar-panel-tip">
                  仅影响当前地图工作台的显示，不会修改正式数据。
                </p>
              </div>
            </template>

            <template v-else-if="activeToolbarPanel === 'label'">
              <div class="toolbar-mode-grid">
                <button
                  type="button"
                  :class="['toolbar-mode-card', { 'toolbar-mode-card--active': labelPickMode === 'feature' }]"
                  @click="toggleFeaturePickMode"
                >
                  <strong>{{ labelPickMode === 'feature' ? '退出对象补名' : '给已有对象补名称' }}</strong>
                  <span>点击道路、建筑、边界或业务对象，把现有对象载入编辑器补充名称。</span>
                </button>
                <button
                  type="button"
                  :class="['toolbar-mode-card', { 'toolbar-mode-card--active': labelPickMode === 'point' }]"
                  @click="togglePointPickMode"
                >
                  <strong>{{ labelPickMode === 'point' ? '退出手动点位' : '自定义点位标注' }}</strong>
                  <span>不依赖现有对象，在地图任意位置落点后创建一个新的名称标注。</span>
                </button>
              </div>

              <div class="toolbar-status-card">
                <strong>{{ labelModeSummaryTitle }}</strong>
                <p>{{ labelModeSummaryText }}</p>
              </div>

              <div v-if="mapStore.selectedEntity && mapStore.selectedEntity.entityType !== 'label'" class="tool-group-selection tool-group-selection--toolbar">
                <strong>{{ mapStore.selectedEntity.name }}</strong>
                <span>{{ getFocusTargetSubtitle(mapStore.selectedEntity) }}</span>
                <el-button size="small" type="primary" @click="editSelectedEntityLabel">
                  给当前对象补名称
                </el-button>
              </div>
            </template>

            <template v-else-if="activeToolbarPanel === 'building'">
              <div class="tool-group">
                <span class="tool-group-title">绘制建筑区域</span>
                <div class="label-editor-toolbar label-editor-toolbar--compact">
                  <el-button
                    size="small"
                    :type="drawnBuildingStore.drawMode === 'rectangle' ? 'primary' : 'default'"
                    @click="startDrawBuildingArea('rectangle')"
                  >
                    绘制矩形区域
                  </el-button>
                  <el-button
                    size="small"
                    :type="drawnBuildingStore.drawMode === 'polygon' ? 'primary' : 'default'"
                    @click="startDrawBuildingArea('polygon')"
                  >
                    绘制多边形区域
                  </el-button>
                  <el-button
                    v-if="drawnBuildingStore.drawMode"
                    size="small"
                    @click="cancelDrawBuildingArea"
                  >
                    取消绘制
                  </el-button>
                  <el-button
                    v-if="drawnBuildingStore.areas.length"
                    size="small"
                    @click="toggleDrawnBuildingListPanel"
                  >
                    {{ showDrawnBuildingListPanel ? '收起建筑列表' : '查看建筑列表' }}
                  </el-button>
                </div>
              </div>

              <div v-if="selectedDrawnBuildingArea" class="tool-group">
                <span class="tool-group-title">当前选中建筑</span>
                <div class="tool-group-selection tool-group-selection--toolbar">
                  <strong>{{ selectedDrawnBuildingArea.name }}</strong>
                  <span>{{ getDrawnBuildingItemSubtitle(selectedDrawnBuildingArea) }}</span>
                  <div class="label-editor-toolbar label-editor-toolbar--compact">
                    <el-button size="small" type="primary" @click="editSelectedDrawnBuilding">
                      进入建筑编辑
                    </el-button>
                    <el-button size="small" @click="clearDrawnBuildingSelection">
                      取消选中
                    </el-button>
                  </div>
                </div>
              </div>

              <p class="toolbar-panel-tip">
                {{ drawnBuildingEditorTip }}
              </p>
            </template>
          </div>
        </div>

        <div v-if="showDrawnBuildingEditorPanel" class="shell-card label-editor-card label-editor-card--drawer building-editor-card">
          <div class="card-head">
            <div class="card-title-row">
              <h3>建筑区域</h3>
              <span v-if="drawnBuildingEditorBadge" class="card-meta">{{ drawnBuildingEditorBadge }}</span>
            </div>
            <div class="card-head-actions">
              <el-button text size="small" @click="closeDrawnBuildingEditor">收起</el-button>
            </div>
          </div>

          <el-scrollbar class="editor-scrollbar">
            <div class="label-editor-body">
              <p class="label-editor-tip">
                {{ drawnBuildingEditorTip }}
              </p>

              <div v-if="drawnBuildingDraft" class="label-context-summary">
                <strong>{{ drawnBuildingDraft.name || '未命名建筑区域' }}</strong>
                <p>
                  {{ getDrawnBuildingShapeLabel(drawnBuildingDraft.shapeType) }}
                  <template v-if="drawnBuildingDraft.buildingCode">
                    · 编号：{{ drawnBuildingDraft.buildingCode }}
                  </template>
                </p>
              </div>

              <el-form v-if="drawnBuildingDraft" label-position="top" class="label-editor-form" @submit.prevent>
                <el-form-item label="建筑名称" required>
                  <el-input v-model="drawnBuildingDraft.name" placeholder="请输入建筑名称" />
                </el-form-item>

                <el-form-item label="语义类型">
                  <el-select
                    :model-value="drawnBuildingDraft.typeCode"
                    placeholder="选择建筑/园区语义类型"
                    filterable
                    clearable
                    @update:model-value="applyDrawnBuildingSemanticType"
                  >
                    <el-option-group
                      v-for="group in drawnBuildingTypeGroups"
                      :key="group.categoryCode"
                      :label="group.categoryName"
                    >
                      <el-option
                        v-for="option in group.options"
                        :key="option.typeCode"
                        :label="option.typeName"
                        :value="option.typeCode"
                      />
                    </el-option-group>
                  </el-select>
                </el-form-item>

                <div class="label-form-grid">
                  <el-form-item label="建筑类型">
                    <el-input v-model="drawnBuildingDraft.buildingType" placeholder="例如：宿舍楼、办公楼" />
                  </el-form-item>
                  <el-form-item label="建筑编号">
                    <el-input v-model="drawnBuildingDraft.buildingCode" placeholder="例如：A1、1栋" />
                  </el-form-item>
                </div>

                <div class="label-form-grid">
                  <el-form-item label="标注经度">
                    <el-input-number v-model="drawnBuildingDraft.labelLongitude" :step="0.0001" :precision="6" :min="-180" :max="180" controls-position="right" />
                  </el-form-item>
                  <el-form-item label="标注纬度">
                    <el-input-number v-model="drawnBuildingDraft.labelLatitude" :step="0.0001" :precision="6" :min="-90" :max="90" controls-position="right" />
                  </el-form-item>
                </div>

                <div class="label-form-grid">
                  <el-form-item label="填充颜色">
                    <el-input v-model="drawnBuildingDraft.fillColor" placeholder="rgba(70, 141, 247, 0.18)" />
                  </el-form-item>
                  <el-form-item label="边框颜色">
                    <el-input v-model="drawnBuildingDraft.lineColor" placeholder="#2f7df6" />
                  </el-form-item>
                </div>

                <div class="label-form-grid">
                  <el-form-item label="边框宽度">
                    <el-input-number v-model="drawnBuildingDraft.lineWidth" :min="1" :max="12" :step="0.2" controls-position="right" />
                  </el-form-item>
                  <el-form-item label="启用状态">
                    <el-switch v-model="drawnBuildingDraft.status" :active-value="1" :inactive-value="0" />
                  </el-form-item>
                </div>

                <el-form-item label="底图发布">
                  <el-switch v-model="drawnBuildingDraft.publishToBasemap" />
                  <p class="form-help-text">
                    开启后，该建筑会进入底图待发布队列；只有发布生成新底图版本后，才会真正进入底图底层。
                  </p>
                </el-form-item>

                <el-form-item label="区域形状">
                  <el-input :model-value="getDrawnBuildingShapeLabel(drawnBuildingDraft.shapeType)" disabled />
                </el-form-item>

                <el-form-item label="备注">
                  <el-input
                    v-model="drawnBuildingDraft.remark"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 4 }"
                    placeholder="可填写建筑用途、楼层说明或补充信息"
                  />
                </el-form-item>
              </el-form>
            </div>
          </el-scrollbar>
          <div v-if="drawnBuildingDraft" class="editor-footer">
            <el-button type="primary" @click="saveDrawnBuildingArea">
              {{ drawnBuildingSaveButtonText }}
            </el-button>
            <el-button
              v-if="!drawnBuildingDraft.isDraft && canManageFormalData"
              type="danger"
              plain
              @click="deleteDrawnBuildingArea(drawnBuildingDraft)"
            >
              删除
            </el-button>
            <el-button @click="closeDrawnBuildingEditor">取消</el-button>
          </div>
        </div>

        <div v-if="showLabelEditorPanel" class="shell-card label-editor-card label-editor-card--drawer">
          <div class="card-head">
            <div class="card-title-row">
              <h3>名称标注</h3>
              <span v-if="labelContextBadge" class="card-meta">{{ labelContextBadge }}</span>
            </div>
            <div class="card-head-actions">
              <el-button text size="small" @click="closeLabelEditor">收起</el-button>
            </div>
          </div>

          <el-scrollbar class="editor-scrollbar">
            <div class="label-editor-body">
              <section class="editor-section">
                <div class="editor-section-head">
                  <div>
                    <span class="editor-section-eyebrow">模式入口</span>
                    <h4>选择标注方式</h4>
                  </div>
                  <span v-if="labelModeTag" class="editor-section-meta">{{ labelModeTag }}</span>
                </div>
                <div class="toolbar-mode-grid toolbar-mode-grid--editor">
                  <button
                    type="button"
                    :class="['toolbar-mode-card', { 'toolbar-mode-card--active': labelPickMode === 'feature' }]"
                    @click="toggleFeaturePickMode"
                  >
                    <strong>{{ labelPickMode === 'feature' ? '退出对象补名' : '给已有对象补名称' }}</strong>
                    <span>选中道路、建筑、区域或业务对象，为已有对象补充名称。</span>
                  </button>
                  <button
                    type="button"
                    :class="['toolbar-mode-card', { 'toolbar-mode-card--active': labelPickMode === 'point' }]"
                    @click="togglePointPickMode"
                  >
                    <strong>{{ labelPickMode === 'point' ? '退出手动点位' : '自定义点位标注' }}</strong>
                    <span>不依赖现有对象，在地图任意位置创建自定义点位名称。</span>
                  </button>
                </div>
                <p class="section-help-text">
                  {{ labelModeSummaryText }}
                </p>
              </section>

              <section v-if="labelEditorContext" class="editor-section">
                <div class="editor-section-head">
                  <div>
                    <span class="editor-section-eyebrow">当前对象</span>
                    <h4>这条名称正在标注谁</h4>
                  </div>
                </div>
                <div class="label-context-summary label-context-summary--rich">
                  <strong>{{ labelContextTitle }}</strong>
                  <p>{{ labelContextSubtitle }}</p>
                  <div class="context-chip-row">
                    <span class="context-chip">{{ getLabelFeatureTypeLabel(labelEditorContext.featureType) }}</span>
                    <span class="context-chip">{{ labelContextSourceLabel }}</span>
                    <span v-if="labelDraft?.typeName" class="context-chip">{{ labelDraft.typeName }}</span>
                  </div>
                  <p v-if="labelContextOriginalName" class="label-context-note">
                    原始名称：{{ labelContextOriginalName }}
                  </p>
                </div>
              </section>

              <el-form v-if="labelDraft" label-position="top" class="label-editor-form" @submit.prevent>
                <section class="editor-section">
                  <div class="editor-section-head">
                    <div>
                      <span class="editor-section-eyebrow">基础信息</span>
                      <h4>名称内容</h4>
                    </div>
                  </div>

                  <el-form-item label="地图显示名称" required>
                    <el-input v-model="labelDraft.displayName" placeholder="请输入地图上显示的名称" />
                  </el-form-item>

                  <el-form-item label="名称归类">
                    <el-select
                      :model-value="labelDraft.typeCode"
                      placeholder="选择这条名称属于哪一类"
                      filterable
                      clearable
                      @update:model-value="handleLabelSemanticTypeChange"
                    >
                      <el-option-group
                        v-for="group in labelSemanticTypeGroups"
                        :key="group.categoryCode"
                        :label="group.categoryName"
                      >
                        <el-option
                          v-for="option in group.options"
                          :key="option.typeCode"
                          :label="option.typeName"
                          :value="option.typeCode"
                        />
                      </el-option-group>
                    </el-select>
                  </el-form-item>

                  <p class="section-help-text">
                    选择“这条名称属于哪一类”。系统会按归类自动带出推荐的显示层级、优先级和文字样式。
                  </p>

                  <el-form-item label="别名">
                    <el-input
                      v-model="labelAliasInput"
                      type="textarea"
                      :autosize="{ minRows: 2, maxRows: 4 }"
                      placeholder="多个别名用逗号、顿号或换行分隔"
                    />
                  </el-form-item>
                </section>

                <section class="editor-section">
                  <div class="editor-section-head">
                    <div>
                      <span class="editor-section-eyebrow">显示策略</span>
                      <h4>对象、用途与显示层级</h4>
                    </div>
                  </div>

                  <div class="label-form-grid">
                    <el-form-item label="标注对象">
                      <el-select v-model="labelDraft.featureType">
                        <el-option v-for="option in labelFeatureTypeOptions" :key="option.value" :label="option.label" :value="option.value" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="显示用途">
                      <el-select v-model="labelDraft.labelType">
                        <el-option v-for="option in labelTypeOptions" :key="option.value" :label="option.label" :value="option.value" />
                      </el-select>
                    </el-form-item>
                  </div>

                  <p class="field-pair-help">
                    “标注对象”表示这条名称属于谁；“显示用途”表示地图按通用名称、道路名称还是建筑名称的规则来显示。
                  </p>

                  <div class="label-help-grid">
                    <div class="field-help-card">
                      <strong>{{ labelObjectOption?.label || getLabelFeatureTypeLabel(labelDraft.featureType) }}</strong>
                      <p>{{ labelObjectOption?.description || getLabelFeatureTypeDescription(labelDraft.featureType) }}</p>
                    </div>
                    <div class="field-help-card">
                      <strong>{{ labelPurposeOption?.label || getLabelPurposeLabel(labelDraft.labelType) }}</strong>
                      <p>{{ labelPurposeOption?.description || getLabelPurposeDescription(labelDraft.labelType) }}</p>
                    </div>
                  </div>

                  <div class="label-form-grid">
                    <el-form-item label="经度">
                      <el-input-number v-model="labelDraft.pointLongitude" :step="0.0001" :precision="6" :min="-180" :max="180" controls-position="right" />
                    </el-form-item>
                    <el-form-item label="纬度">
                      <el-input-number v-model="labelDraft.pointLatitude" :step="0.0001" :precision="6" :min="-90" :max="90" controls-position="right" />
                    </el-form-item>
                  </div>

                  <div class="strategy-summary">
                    <strong>推荐显示策略</strong>
                    <span>{{ labelEditorTip }}</span>
                  </div>

                  <div class="label-form-grid">
                    <el-form-item label="最小缩放">
                      <el-input-number v-model="labelDraft.minZoom" :min="0" :max="24" controls-position="right" />
                    </el-form-item>
                    <el-form-item label="最大缩放">
                      <el-input-number v-model="labelDraft.maxZoom" :min="0" :max="24" controls-position="right" />
                    </el-form-item>
                  </div>

                  <div class="label-form-grid">
                    <el-form-item label="优先级">
                      <el-input-number v-model="labelDraft.priority" :min="0" :max="100000" controls-position="right" />
                    </el-form-item>
                    <el-form-item label="启用状态">
                      <el-switch v-model="labelDraft.status" :active-value="1" :inactive-value="0" />
                    </el-form-item>
                  </div>

                  <div class="label-form-grid">
                    <el-form-item label="文字颜色">
                      <el-input v-model="labelDraft.textColor" placeholder="#314155" />
                    </el-form-item>
                    <el-form-item label="描边颜色">
                      <el-input v-model="labelDraft.haloColor" placeholder="rgba(255,255,255,0.96)" />
                    </el-form-item>
                  </div>
                </section>

                <section class="editor-section">
                  <div class="editor-section-head">
                    <div>
                      <span class="editor-section-eyebrow">来源与备注</span>
                      <h4>原始信息</h4>
                    </div>
                  </div>

                  <el-form-item label="原始名称">
                    <el-input :model-value="labelDraft.originalName || '-'" disabled />
                  </el-form-item>

                  <el-form-item label="来源标识">
                    <el-input :model-value="labelSourceSummary" disabled />
                  </el-form-item>

                  <el-form-item label="备注">
                    <el-input
                      v-model="labelDraft.remark"
                      type="textarea"
                      :autosize="{ minRows: 2, maxRows: 4 }"
                      placeholder="可填写名称来源、纠偏原因或补充说明"
                    />
                  </el-form-item>
                </section>

              </el-form>

              <p v-else class="label-editor-empty-tip">
                从右上角“标注”里选择一种方式，或先选中一个地图对象，再开始编辑名称标注。
              </p>
            </div>
          </el-scrollbar>
          <div v-if="labelDraft" class="editor-footer">
            <el-button type="primary" :loading="labelSaving" @click="saveLabel">
              {{ labelSaveButtonText }}
            </el-button>
            <el-button :loading="labelLookupLoading" :disabled="!canResetLabelDraft" @click="reloadCurrentLabel">
              {{ labelReloadButtonText }}
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useRoute, useRouter } from 'vue-router';
import { enqueueBasemapArea } from '@/api/basemapApi';
import { createMapArea, deleteMapArea, getMapAreaById, getMapAreasGeoJson, updateMapArea } from '@/api/mapAreaApi';
import { useMapToolbar } from '@/composables/useMapToolbar';
import { useViewportFeatures } from '@/composables/useViewportFeatures';
import { createMapLabel, getMapLabelDetail, queryMapLabels, updateMapLabel } from '@/api/mapLabelApi';
import { createMapFeatureSubmission, getMapFeatureSubmission, updateMapFeatureSubmission } from '@/api/submissionApi';
import BaseMap from '@/components/map/BaseMap.vue';
import LayerSwitcher from '@/components/map/LayerSwitcher.vue';
import MapSearchBar from '@/components/search/MapSearchBar.vue';
import {
  decorateSemanticFeatureCollection,
  getDrawnBuildingSemanticDefaults,
  getLabelSemanticDefaults
} from '@/map/semanticRenderConfig';
import { buildBusinessLabelFeatureCollection, buildManualLabelFeatureCollection } from '@/composables/useMapLabelLayers';
import {
  buildDrawnBuildingAreaFeatureCollection,
  buildDrawnBuildingLabelFeatureCollection
} from '@/composables/useDrawnBuildingLayers';
import { searchMap } from '@/api/mapSearchApi';
import { useCurrentUserRole } from '@/composables/useCurrentUserRole';
import { useAreaStore } from '@/stores/areaStore';
import { useBoundaryStore } from '@/stores/boundaryStore';
import { ZHONGSHAN_DEFAULT_CENTER } from '@/map/defaultMapView';
import { useDrawnBuildingStore } from '@/stores/drawnBuildingStore';
import { useMapFeatureCatalogStore } from '@/stores/mapFeatureCatalogStore';
import { useMapStore } from '@/stores/mapStore';
import { usePlaceStore } from '@/stores/placeStore';
import { usePoiStore } from '@/stores/poiStore';
import { useShopStore } from '@/stores/shopStore';
import type { BuildingDrawMode, DrawnBuildingArea, DrawnBuildingCompletePayload, EditableDrawnBuildingDraft } from '@/types/drawnBuilding';
import type { EntityId } from '@/types/entity';
import type { MapFeatureTypeDefinition } from '@/types/mapFeatureType';
import type { BasemapInspectableFeature, EditableMapLabelContext, EditableMapLabelDraft, MapLabel, MapLabelPickMode, SaveMapLabelPayload } from '@/types/mapLabel';
import type { EntityType, LayerVisibility, MapFocusTarget, MapSearchItem, MapViewportState } from '@/types/map';
import type { AreaFeatureCollection, SaveMapAreaPayload } from '@/types/area';
import type { BoundaryFeatureCollection } from '@/types/boundary';
import type { PlaceFeatureCollection } from '@/types/place';
import type { PoiFeatureCollection } from '@/types/poi';
import type { ShopFeatureCollection } from '@/types/shop';
import type { MapFeatureSubmission, SubmissionStatus } from '@/types/submission';
import { boundsToBboxString } from '@/utils/bbox';
import { getGeometryBounds, parseGeometryGeoJson } from '@/utils/geometry';
import {
  buildDrawnBuildingSavePayload,
  createDrawnBuildingDraftFromSavePayload,
  createDrawnBuildingDraft,
  DEFAULT_DRAWN_BUILDING_FILL,
  DEFAULT_DRAWN_BUILDING_LINE,
  DEFAULT_DRAWN_BUILDING_LINE_WIDTH,
  DRAWN_BUILDING_SOURCE_TYPE,
  getGeometryLabelPoint,
  parseDrawnBuildingAreaFromFeature,
  parseDrawnBuildingAreaFromMapArea
} from '@/utils/drawnBuildings';
import {
  DEFAULT_DRAWN_BUILDING_TYPE_CODE,
  findFeatureTypeDefinition,
  getDefaultTypeCodeForLabelFeature,
  groupFeatureTypes
} from '@/utils/mapFeatureTypes';
import {
  DEFAULT_HALO_COLOR,
  DEFAULT_MANUAL_SOURCE,
  DEFAULT_TEXT_COLOR,
  createDraftFromContext,
  createLabelContextFromBasemapFeature,
  createLabelContextFromFocusTarget,
  createLabelContextFromManualLabel,
  createManualPointContext,
  formatAliasNamesInput,
  getDefaultLabelType,
  getDefaultMaxZoom,
  getDefaultMinZoom,
  getDefaultPriority,
  isCoreMapTextTypeCode,
  isLabelVisibleForLayer,
  parseAliasNamesInput,
  sanitizeMapLabelPayload
} from '@/utils/mapLabels';
import {
  applyLabelEditorPreset,
  getLabelFeatureTypeDescription,
  getLabelFeatureTypeLabel,
  getLabelFeatureTypeOptions,
  getLabelPurposeDescription,
  getLabelPurposeLabel,
  getLabelPurposeOptions,
  resolveLabelEditorPreset
} from '@/utils/labelPresetRegistry';
import { canEditSubmission } from '@/utils/reviewWorkflow';
import {
  filterDrawnBuildingAreasBySemanticType,
  filterFeatureCollectionBySemanticType,
  filterLabelsBySemanticType
} from '@/utils/mapSemanticFilter';
import { getStatusLabel, getStatusTagType } from '@/utils/status';
import { getFocusTargetSubtitle, getSearchItemSubtitle } from '@/utils/mapEntities';

const MAP_REFRESH_DEBOUNCE_MS = 600;
const BBOX_EPSILON = 0.0008;
const CENTER_EPSILON = 0.0004;
const ZOOM_EPSILON = 0.08;
const LAYER_MIN_ZOOM: Record<LayerKey, number> = {
  shops: 12,
  areas: 9,
  pois: 13,
  places: 11,
  boundaries: 8
};
const MAP_LAYER_TO_VIEWPORT_FEATURE_TYPE: Record<LayerKey, string> = {
  shops: 'shop',
  areas: 'area',
  pois: 'poi',
  places: 'place',
  boundaries: 'boundary'
};
const MAP_SEARCH_SOURCE_TYPES = ['shop', 'area', 'poi', 'place', 'boundary', 'label'] as const;
const MAP_FILTER_SOURCE_TYPES = ['shop', 'area', 'poi', 'place', 'boundary', 'label', DRAWN_BUILDING_SOURCE_TYPE] as const;

type LayerKey = keyof LayerVisibility;

const route = useRoute();
const router = useRouter();
const { canManageFormalData, mustUseSubmissionWorkflow } = useCurrentUserRole();
const {
  activePanel: activeToolbarPanel,
  isPanelOpen: showToolbarPanel,
  togglePanel: toggleToolbarPanel,
  closePanel: closeToolbarPanel
} = useMapToolbar();
const mapStore = useMapStore();
const drawnBuildingStore = useDrawnBuildingStore();
const shopStore = useShopStore();
const areaStore = useAreaStore();
const poiStore = usePoiStore();
const placeStore = usePlaceStore();
const boundaryStore = useBoundaryStore();
const mapFeatureCatalogStore = useMapFeatureCatalogStore();

const searchKeyword = ref('');
const searchTypeCode = ref('');
const mapSemanticTypeCode = ref('');
const drawnBuildingKeyword = ref('');
const searchLoading = ref(false);
const searchPanelMessage = ref('');
const showDrawnBuildingList = ref(false);
const focusTarget = ref<MapFocusTarget | null>(null);
const viewportFeatureState = useViewportFeatures();
const mapFeatureSchema = computed(() => mapFeatureCatalogStore.schema);
const labelLookupLoading = ref(false);
const labelRefreshLoading = computed(() => viewportFeatureState.loading.value);
const labelSaving = ref(false);
const labelPickMode = ref<MapLabelPickMode>(null);
const labelEditorContext = ref<EditableMapLabelContext | null>(null);
const labelDraft = ref<EditableMapLabelDraft | null>(null);
const drawnBuildingDraft = ref<EditableDrawnBuildingDraft | null>(null);
const editingLabelId = ref<EntityId | null>(null);
const editingLabelSubmissionId = ref<string | null>(null);
const editingDrawnBuildingSubmissionId = ref<string | null>(null);
const labelAliasInput = ref('');
const lastAppliedLabelPreset = ref<ReturnType<typeof resolveLabelEditorPreset> | null>(null);
const labelContextRequestId = ref(0);
const refreshTimer = ref<number | null>(null);
const pendingViewport = ref<MapViewportState | null>(null);
const pendingRefreshReason = ref('idle');
const lastRequestedFeatureViewport = ref<MapViewportState | null>(null);
const lastRequestedFeatureSignature = ref('');
const lastRequestedDrawnBuildingViewport = ref<MapViewportState | null>(null);
const manualLabels = computed<MapLabel[]>(() => viewportFeatureState.collections.value.labels);
const viewportFeatureCollections = computed(() => viewportFeatureState.collections.value);

const searchResultCountLabel = computed(() =>
  mapStore.searchResults.length ? `共 ${mapStore.searchResults.length} 条` : ''
);
const showSearchResultsPanel = computed(() =>
  searchLoading.value || mapStore.searchResults.length > 0 || Boolean(searchPanelMessage.value)
);
const searchSemanticTypeGroups = computed(() =>
  groupFeatureTypes(
    mapFeatureSchema.value,
    (item) => item.sourceTypes.some((sourceType) => MAP_SEARCH_SOURCE_TYPES.includes(sourceType as typeof MAP_SEARCH_SOURCE_TYPES[number]))
  )
);
const mapSemanticTypeGroups = computed(() =>
  groupFeatureTypes(
    mapFeatureSchema.value,
    (item) => item.sourceTypes.some((sourceType) => MAP_FILTER_SOURCE_TYPES.includes(sourceType as typeof MAP_FILTER_SOURCE_TYPES[number]))
  )
);
const labelFeatureTypeOptions = getLabelFeatureTypeOptions();
const labelTypeOptions = getLabelPurposeOptions();
const labelSemanticTypeGroups = computed(() =>
  groupFeatureTypes(mapFeatureSchema.value, (item) => item.sourceTypes.includes('label'))
);
const drawnBuildingTypeGroups = computed(() =>
  groupFeatureTypes(
    mapFeatureSchema.value,
    (item) => item.geometryType === 'polygon' && (item.sourceTypes.includes('area') || item.sourceTypes.includes(DRAWN_BUILDING_SOURCE_TYPE))
  )
);
const visibleManualLabels = computed(() =>
  filterLabelsBySemanticType(manualLabels.value, mapSemanticTypeCode.value).filter((label) =>
    isCoreMapTextTypeCode(label.typeCode) || isLabelVisibleForLayer(label.featureType, mapStore.layerVisibility))
);
const selectedDrawnBuildingArea = computed(() => drawnBuildingStore.selectedArea);
const filteredShopData = computed<ShopFeatureCollection>(() =>
  filterFeatureCollectionBySemanticType(viewportFeatureCollections.value.shops as any, mapSemanticTypeCode.value) as ShopFeatureCollection
);
const filteredAreaData = computed<AreaFeatureCollection>(() =>
  filterFeatureCollectionBySemanticType(viewportFeatureCollections.value.areas as any, mapSemanticTypeCode.value) as AreaFeatureCollection
);
const filteredPoiData = computed<PoiFeatureCollection>(() =>
  filterFeatureCollectionBySemanticType(viewportFeatureCollections.value.pois as any, mapSemanticTypeCode.value) as PoiFeatureCollection
);
const filteredPlaceData = computed<PlaceFeatureCollection>(() =>
  filterFeatureCollectionBySemanticType(viewportFeatureCollections.value.places as any, mapSemanticTypeCode.value) as PlaceFeatureCollection
);
const filteredBoundaryData = computed<BoundaryFeatureCollection>(() =>
  filterFeatureCollectionBySemanticType(viewportFeatureCollections.value.boundaries as any, mapSemanticTypeCode.value) as BoundaryFeatureCollection
);
const filteredDrawnBuildingAreasForMap = computed(() =>
  filterDrawnBuildingAreasBySemanticType(drawnBuildingStore.areas, mapSemanticTypeCode.value)
);
const renderedShopData = computed<ShopFeatureCollection>(() =>
  decorateSemanticFeatureCollection(mapFeatureSchema.value, 'shop', filteredShopData.value as any, {
    selectedId: mapStore.selectedEntity?.entityType === 'shop' ? String(mapStore.selectedEntity.id) : null
  }) as unknown as ShopFeatureCollection
);
const renderedAreaData = computed<AreaFeatureCollection>(() =>
  decorateSemanticFeatureCollection(mapFeatureSchema.value, 'area', filteredAreaData.value as any, {
    selectedId: mapStore.selectedEntity?.entityType === 'area' ? String(mapStore.selectedEntity.id) : null
  }) as unknown as AreaFeatureCollection
);
const renderedPoiData = computed<PoiFeatureCollection>(() =>
  decorateSemanticFeatureCollection(mapFeatureSchema.value, 'poi', filteredPoiData.value as any, {
    selectedId: mapStore.selectedEntity?.entityType === 'poi' ? String(mapStore.selectedEntity.id) : null
  }) as unknown as PoiFeatureCollection
);
const renderedPlaceData = computed<PlaceFeatureCollection>(() =>
  decorateSemanticFeatureCollection(mapFeatureSchema.value, 'place', filteredPlaceData.value as any, {
    selectedId: mapStore.selectedEntity?.entityType === 'place' ? String(mapStore.selectedEntity.id) : null
  }) as unknown as PlaceFeatureCollection
);
const renderedBoundaryData = computed<BoundaryFeatureCollection>(() =>
  decorateSemanticFeatureCollection(mapFeatureSchema.value, 'boundary', filteredBoundaryData.value as any, {
    selectedId: mapStore.selectedEntity?.entityType === 'boundary' ? String(mapStore.selectedEntity.id) : null
  }) as unknown as BoundaryFeatureCollection
);
const manualLabelData = computed(() =>
  buildManualLabelFeatureCollection(visibleManualLabels.value, {
    schema: mapFeatureSchema.value,
    editingLabelId: editingLabelId.value ? String(editingLabelId.value) : null,
    zoom: mapStore.viewport.zoom ?? 0
  })
);
const businessLabelData = computed(() => buildBusinessLabelFeatureCollection({
  schema: mapFeatureSchema.value,
  shops: renderedShopData.value,
  areas: renderedAreaData.value,
  pois: renderedPoiData.value,
  places: renderedPlaceData.value,
  boundaries: renderedBoundaryData.value,
  visibility: mapStore.layerVisibility,
  manualLabels: visibleManualLabels.value,
  zoom: mapStore.viewport.zoom ?? 0
}));
const drawnBuildingAreaData = computed(() =>
  buildDrawnBuildingAreaFeatureCollection(
    filteredDrawnBuildingAreasForMap.value,
    mapFeatureSchema.value,
    drawnBuildingStore.selectedAreaId,
    drawnBuildingDraft.value ? String(drawnBuildingDraft.value.id) : null
  )
);
const drawnBuildingLabelData = computed(() =>
  buildDrawnBuildingLabelFeatureCollection(
    filteredDrawnBuildingAreasForMap.value,
    mapFeatureSchema.value,
    drawnBuildingStore.selectedAreaId,
    drawnBuildingDraft.value ? String(drawnBuildingDraft.value.id) : null
  )
);
const filteredDrawnBuildingAreas = computed(() => {
  const keyword = drawnBuildingKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return drawnBuildingStore.areas;
  }

  return drawnBuildingStore.areas.filter((item) => {
    const haystack = [
      item.name,
      item.typeName,
      item.buildingType,
      item.buildingCode,
      item.categoryName,
      item.remark
    ]
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      .join(' ')
      .toLowerCase();

    return haystack.includes(keyword);
  });
});
const labelContextBadge = computed(() => {
  if (labelRefreshLoading.value) {
    return '标注图层刷新中';
  }

  if (labelLookupLoading.value) {
    return '正在加载';
  }

  if (editingLabelSubmissionId.value) {
    return '待审标注';
  }

  if (labelDraft.value?.id) {
    return '正式标注';
  }

  if (labelEditorContext.value?.sourceKind === 'manual') {
    return '自定义点位';
  }

  return '';
});
const drawnBuildingCountLabel = computed(() =>
  drawnBuildingStore.areas.length ? `已绘制 ${drawnBuildingStore.areas.length} 个` : ''
);
const showDrawnBuildingListPanel = computed(() =>
  showDrawnBuildingList.value && (drawnBuildingStore.areas.length > 0 || Boolean(drawnBuildingKeyword.value.trim()))
);
const drawnBuildingListCountLabel = computed(() =>
  filteredDrawnBuildingAreas.value.length ? `共 ${filteredDrawnBuildingAreas.value.length} 个` : ''
);
const showLabelEditorPanel = computed(() =>
  Boolean(labelDraft.value || labelEditorContext.value || labelLookupLoading.value || labelSaving.value || labelPickMode.value)
);
const showDrawnBuildingEditorPanel = computed(() => Boolean(drawnBuildingDraft.value));
const showInspectorPanel = computed(() => Boolean(mapStore.selectedEntity) && !showLabelEditorPanel.value && !showDrawnBuildingEditorPanel.value);
const showSelectedDrawnBuildingPanel = computed(() =>
  Boolean(selectedDrawnBuildingArea.value) && !showLabelEditorPanel.value && !showDrawnBuildingEditorPanel.value
);
const canResetLabelDraft = computed(() => Boolean(labelDraft.value || labelEditorContext.value || editingLabelId.value !== null));
const labelObjectOption = computed(() =>
  labelFeatureTypeOptions.find((option) => option.value === labelDraft.value?.featureType) ?? null
);
const labelPurposeOption = computed(() =>
  labelTypeOptions.find((option) => option.value === labelDraft.value?.labelType) ?? null
);
const labelRecommendedPreset = computed(() => {
  if (!labelDraft.value) {
    return null;
  }

  return resolveLabelEditorPreset({
    featureType: labelDraft.value.featureType,
    typeCode: labelDraft.value.typeCode,
    definition: getFeatureTypeDefinition(labelDraft.value.typeCode)
  });
});
const visibleLayerCount = computed(() =>
  Object.values(mapStore.layerVisibility).filter(Boolean).length
);
const isLabelStrategyCustomized = computed(() => {
  if (!labelDraft.value || !labelRecommendedPreset.value) {
    return false;
  }

  return labelDraft.value.labelType !== labelRecommendedPreset.value.labelType ||
    labelDraft.value.minZoom !== labelRecommendedPreset.value.minZoom ||
    labelDraft.value.maxZoom !== labelRecommendedPreset.value.maxZoom ||
    labelDraft.value.priority !== labelRecommendedPreset.value.priority ||
    (labelDraft.value.textColor || DEFAULT_TEXT_COLOR) !== labelRecommendedPreset.value.textColor ||
    (labelDraft.value.haloColor || DEFAULT_HALO_COLOR) !== labelRecommendedPreset.value.haloColor;
});
const toolbarPanelTitle = computed(() => {
  switch (activeToolbarPanel.value) {
    case 'layers':
      return '图层';
    case 'filter':
      return '筛选';
    case 'label':
      return '标注';
    case 'building':
      return '建筑区域';
    default:
      return '';
  }
});
const toolbarPanelMeta = computed(() => {
  switch (activeToolbarPanel.value) {
    case 'layers':
      return `${visibleLayerCount.value}/5 已显示`;
    case 'filter':
      return mapSemanticTypeCode.value
        ? getFeatureTypeDefinition(mapSemanticTypeCode.value)?.typeName || '已应用筛选'
        : '全部语义类型';
    case 'label':
      if (labelPickMode.value === 'feature') {
        return '对象补名中';
      }

      if (labelPickMode.value === 'point') {
        return '点位选择中';
      }

      if (showLabelEditorPanel.value) {
        return '正在编辑';
      }

      return '';
    case 'building':
      if (drawnBuildingStore.drawMode === 'rectangle') {
        return '矩形绘制中';
      }

      if (drawnBuildingStore.drawMode === 'polygon') {
        return '多边形绘制中';
      }

      return drawnBuildingCountLabel.value;
    default:
      return '';
  }
});
const labelModeTag = computed(() => {
  if (labelPickMode.value === 'feature') {
    return '对象补名模式';
  }

  if (labelPickMode.value === 'point') {
    return '自定义点位模式';
  }

  if (labelEditorContext.value?.sourceKind === 'manual') {
    return '自定义点位';
  }

  if (labelEditorContext.value?.sourceKind === 'basemap') {
    return '地图对象补名';
  }

  if (labelEditorContext.value?.sourceKind === 'business') {
    return '业务对象补名';
  }

  return '';
});
const labelContextTitle = computed(() => {
  if (!labelEditorContext.value) {
    return '';
  }

  return labelDraft.value?.displayName?.trim() || labelEditorContext.value.suggestedDisplayName || '未命名标注';
});
const labelContextSourceLabel = computed(() => {
  if (!labelEditorContext.value) {
    return '';
  }

  switch (labelEditorContext.value.sourceKind) {
    case 'basemap':
      return '地图已有对象';
    case 'business':
      return '数据库对象';
    case 'manual':
      return '自定义点位';
    default:
      return '标注对象';
  }
});
const labelContextOriginalName = computed(() => labelEditorContext.value?.originalName?.trim() || '');
const labelContextSubtitle = computed(() => {
  if (!labelEditorContext.value) {
    return '';
  }

  const parts = [
    `来源：${labelContextSourceLabel.value}`,
    `标注对象：${getLabelFeatureTypeLabel(labelEditorContext.value.featureType)}`,
    labelDraft.value?.labelType ? `显示用途：${getLabelPurposeLabel(labelDraft.value.labelType)}` : '',
    labelEditorContext.value.sourceLayer ? `来源图层：${labelEditorContext.value.sourceLayer}` : '',
    labelEditorContext.value.sourceFeatureId ? `来源ID：${labelEditorContext.value.sourceFeatureId}` : ''
  ].filter(Boolean);

  return parts.join(' · ');
});
const labelSourceSummary = computed(() => {
  if (!labelDraft.value) {
    return '-';
  }

  return [labelDraft.value.featureType, labelDraft.value.sourceLayer || '-', labelDraft.value.sourceFeatureId || '-'].join(' / ');
});
const labelModeSummaryTitle = computed(() => {
  if (labelPickMode.value === 'feature') {
    return '给已有对象补名称';
  }

  if (labelPickMode.value === 'point') {
    return '自定义点位标注';
  }

  if (labelEditorContext.value?.sourceKind === 'basemap') {
    return '当前正在编辑地图已有对象';
  }

  if (labelEditorContext.value?.sourceKind === 'business') {
    return '当前正在编辑数据库对象';
  }

  if (mustUseSubmissionWorkflow.value) {
    return '提交后进入审核流程';
  }

  return '选择一种标注方式';
});
const labelModeSummaryText = computed(() => {
  if (labelPickMode.value === 'feature') {
    return '下一次点击道路、建筑、边界、区域或业务对象时，会把该对象载入编辑面板，用于补充名称或修正名称。';
  }

  if (labelPickMode.value === 'point') {
    return '下一次点击地图时，会更新当前标注的位置。适合没有现成对象、只需要在地图上自定义点位名称的场景。';
  }

  if (labelEditorContext.value?.sourceKind === 'basemap') {
    return '当前对象来自地图底层要素。适合给道路、建筑、水系等已有对象补充名称；如果没有稳定来源，也可以保存成自定义点位标注。';
  }

  if (labelEditorContext.value?.sourceKind === 'business') {
    return '当前对象来自数据库业务要素。保存后，人工填写的地图显示名称会优先于原始业务名称参与地图渲染。';
  }

  if (mustUseSubmissionWorkflow.value) {
    return '普通用户提交的标注会先进入待审核区；管理员审核通过后，名称才会进入正式标注表并参与地图显示。';
  }

  return '你可以给已有对象补名称，也可以在地图任意位置创建自定义点位标注。';
});
const labelEditorTip = computed(() => {
  if (!labelRecommendedPreset.value) {
    return labelModeSummaryText.value;
  }

  if (isLabelStrategyCustomized.value) {
    return `当前已保留手动调整。推荐显示为 ${labelRecommendedPreset.value.minZoom}-${labelRecommendedPreset.value.maxZoom} 级，优先级 ${labelRecommendedPreset.value.priority}；切换名称归类时，只有仍使用推荐值的字段才会自动更新。`;
  }

  return `当前会按推荐策略显示：${labelRecommendedPreset.value.minZoom}-${labelRecommendedPreset.value.maxZoom} 级可见，优先级 ${labelRecommendedPreset.value.priority}。如有需要，你仍可手动微调。`;
});
const labelSaveButtonText = computed(() => {
  if (mustUseSubmissionWorkflow.value) {
    return editingLabelSubmissionId.value ? '重新提交审核' : '提交审核';
  }

  return labelDraft.value?.id ? '更新名称标注' : '保存名称标注';
});
const labelReloadButtonText = computed(() => {
  if (editingLabelSubmissionId.value || editingLabelId.value !== null) {
    return '重新加载';
  }

  return '恢复初始值';
});
const drawnBuildingEditorBadge = computed(() => {
  if (!drawnBuildingDraft.value) {
    return '';
  }

  if (editingDrawnBuildingSubmissionId.value) {
    return '待审建筑区域';
  }

  return drawnBuildingDraft.value.isDraft ? '新绘制区域' : '已选建筑区域';
});
const drawnBuildingEditorTip = computed(() => {
  if (drawnBuildingStore.drawMode === 'rectangle') {
    return '矩形绘制模式：在地图上点击两个对角点即可完成建筑区域绘制。';
  }

  if (drawnBuildingStore.drawMode === 'polygon') {
    return '多边形绘制模式：逐点点击绘制边界，双击地图完成封闭区域。';
  }

  if (mustUseSubmissionWorkflow.value) {
    return '普通用户绘制的建筑区域会先进入待审核区，审核通过后才会写入正式区域表。';
  }

  return '绘制完成后会自动生成建筑名称标注；点击已有建筑区域也可以再次进入编辑。';
});
const drawnBuildingSaveButtonText = computed(() => {
  if (mustUseSubmissionWorkflow.value) {
    return editingDrawnBuildingSubmissionId.value ? '重新提交审核' : '提交审核';
  }

  return drawnBuildingDraft.value?.isDraft ? '保存建筑区域' : '更新建筑区域';
});

function debugMapRefresh(message: string, detail?: unknown): void {
  if (!import.meta.env.DEV) {
    return;
  }

  if (detail === undefined) {
    console.debug(`[MapRefresh] ${message}`);
    return;
  }

  console.debug(`[MapRefresh] ${message}`, detail);
}

function parseBbox(bbox?: string): [number, number, number, number] | null {
  if (!bbox) {
    return null;
  }

  const values = bbox.split(',').map((item) => Number(item));
  if (values.length !== 4 || values.some((item) => Number.isNaN(item))) {
    return null;
  }

  return [values[0], values[1], values[2], values[3]];
}

function cloneViewport(viewport: MapViewportState): MapViewportState {
  return {
    bbox: viewport.bbox,
    center: viewport.center ? [...viewport.center] as [number, number] : undefined,
    zoom: viewport.zoom
  };
}

function isSimilarViewport(next: MapViewportState, previous: MapViewportState | null): boolean {
  if (!previous?.bbox || !next.bbox) {
    return false;
  }

  const nextBbox = parseBbox(next.bbox);
  const previousBbox = parseBbox(previous.bbox);

  if (!nextBbox || !previousBbox) {
    return false;
  }

  const bboxSimilar = nextBbox.every((value, index) => Math.abs(value - previousBbox[index]) <= BBOX_EPSILON);
  const centerSimilar =
    !!next.center &&
    !!previous.center &&
    Math.abs(next.center[0] - previous.center[0]) <= CENTER_EPSILON &&
    Math.abs(next.center[1] - previous.center[1]) <= CENTER_EPSILON;
  const zoomSimilar =
    typeof next.zoom === 'number' &&
    typeof previous.zoom === 'number' &&
    Math.abs(next.zoom - previous.zoom) <= ZOOM_EPSILON;

  return bboxSimilar && centerSimilar && zoomSimilar;
}

function getEnabledLayers(): LayerKey[] {
  return (Object.entries(mapStore.layerVisibility) as Array<[LayerKey, boolean]>)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}

function getViewportZoom(viewport: MapViewportState): number {
  return typeof viewport.zoom === 'number' ? viewport.zoom : 0;
}

function isLayerWithinZoomRange(layer: LayerKey, viewport: MapViewportState): boolean {
  return getViewportZoom(viewport) >= LAYER_MIN_ZOOM[layer];
}

function resolveViewportFeatureLimit(viewport: MapViewportState): number {
  const zoom = getViewportZoom(viewport);
  if (zoom < 10) {
    return 400;
  }

  if (zoom < 13) {
    return 900;
  }

  return 1500;
}

function buildViewportFeatureRequest(viewport: MapViewportState): {
  bbox: string;
  zoom: number;
  featureTypes: string;
  status: number;
  limit: number;
} | null {
  if (!viewport.bbox) {
    return null;
  }

  const requestableFeatureTypes = getEnabledLayers()
    .filter((layer) => isLayerWithinZoomRange(layer, viewport))
    .map((layer) => MAP_LAYER_TO_VIEWPORT_FEATURE_TYPE[layer]);

  const featureTypes = ['label', ...requestableFeatureTypes];

  return {
    bbox: viewport.bbox,
    zoom: Math.round(getViewportZoom(viewport)),
    featureTypes: [...new Set(featureTypes)].join(','),
    status: 1,
    limit: resolveViewportFeatureLimit(viewport)
  };
}

function getViewportSnapshot(mapInstance: MapLibreMap): MapViewportState {
  const bounds = mapInstance.getBounds();
  return {
    bbox: boundsToBboxString(bounds),
    center: [mapInstance.getCenter().lng, mapInstance.getCenter().lat],
    zoom: mapInstance.getZoom()
  };
}

function getLabelFallbackCenter(): [number, number] {
  return mapStore.viewport.center ?? ZHONGSHAN_DEFAULT_CENTER;
}

function getDrawnBuildingShapeLabel(shapeType: Exclude<BuildingDrawMode, null>): string {
  return shapeType === 'rectangle' ? '矩形区域' : '多边形区域';
}

function getDrawnBuildingItemSubtitle(area: DrawnBuildingArea): string {
  const parts = [
    area.typeName?.trim() || area.buildingType?.trim(),
    area.buildingCode?.trim(),
    area.isDraft ? '未保存' : '已保存'
  ].filter(Boolean);

  return parts.join(' · ');
}

function getFeatureTypeDefinition(typeCode: string | null | undefined): MapFeatureTypeDefinition | null {
  return findFeatureTypeDefinition(mapFeatureSchema.value, typeCode);
}

function getSearchTypeRequestTypes(typeCode: string | null | undefined): string | undefined {
  const definition = getFeatureTypeDefinition(typeCode);
  if (!definition) {
    return 'shop,area,poi,place,boundary';
  }

  const sourceTypes = definition.sourceTypes
    .filter((sourceType) => MAP_SEARCH_SOURCE_TYPES.includes(sourceType as typeof MAP_SEARCH_SOURCE_TYPES[number]));

  return sourceTypes.length ? sourceTypes.join(',') : 'shop,area,poi,place,boundary';
}

function applyLabelSemanticType(typeCode: string | null | undefined, options?: { applyDefaults?: boolean }): void {
  if (!labelDraft.value) {
    return;
  }

  const definition = getFeatureTypeDefinition(typeCode);
  const recommendedPreset = resolveLabelEditorPreset({
    featureType: labelDraft.value.featureType,
    typeCode: typeCode || null,
    definition
  });

  if (!definition) {
    const nextDraft = {
      ...labelDraft.value,
      typeCode: typeCode || null,
      categoryCode: null,
      categoryName: null,
      typeName: null,
      renderType: null
    };
    labelDraft.value = options?.applyDefaults
      ? applyLabelEditorPreset(nextDraft, recommendedPreset, {
          previousPreset: lastAppliedLabelPreset.value
        })
      : {
          ...nextDraft,
          labelType: nextDraft.labelType || recommendedPreset.labelType,
          textColor: nextDraft.textColor || recommendedPreset.textColor,
          haloColor: nextDraft.haloColor || recommendedPreset.haloColor
        };
    lastAppliedLabelPreset.value = recommendedPreset;
    return;
  }

  const semanticDefaults = getLabelSemanticDefaults(definition);
  const nextDraft = {
    ...labelDraft.value,
    categoryCode: definition.categoryCode,
    categoryName: definition.categoryName,
    typeCode: definition.typeCode,
    typeName: definition.typeName,
    renderType: definition.renderType,
    geometryType: definition.geometryType,
    labelType: options?.applyDefaults
      ? recommendedPreset.labelType
      : labelDraft.value.labelType || recommendedPreset.labelType,
    textColor: options?.applyDefaults
      ? semanticDefaults.textColor ?? recommendedPreset.textColor
      : labelDraft.value.textColor || semanticDefaults.textColor || recommendedPreset.textColor,
    haloColor: options?.applyDefaults
      ? semanticDefaults.haloColor ?? recommendedPreset.haloColor
      : labelDraft.value.haloColor || semanticDefaults.haloColor || recommendedPreset.haloColor
  };

  labelDraft.value = options?.applyDefaults
    ? applyLabelEditorPreset(nextDraft, recommendedPreset, {
        previousPreset: lastAppliedLabelPreset.value
      })
    : nextDraft;
  lastAppliedLabelPreset.value = recommendedPreset;

  if (labelEditorContext.value) {
    labelEditorContext.value = {
      ...labelEditorContext.value,
      categoryCode: definition.categoryCode,
      categoryName: definition.categoryName,
      typeCode: definition.typeCode,
      typeName: definition.typeName,
      renderType: definition.renderType,
      geometryType: definition.geometryType
    };
  }
}

function handleLabelSemanticTypeChange(value: string | null | undefined): void {
  applyLabelSemanticType(value, { applyDefaults: true });
}

function applyDrawnBuildingSemanticType(typeCode: string | null | undefined): void {
  if (!drawnBuildingDraft.value) {
    return;
  }

  const definition = getFeatureTypeDefinition(typeCode);
  if (!definition) {
    drawnBuildingDraft.value = {
      ...drawnBuildingDraft.value,
      typeCode: typeCode || null,
      categoryCode: null,
      categoryName: null,
      typeName: null,
      renderType: null
    };
    return;
  }

  const semanticDefaults = getDrawnBuildingSemanticDefaults(definition);

  const previousTypeName = drawnBuildingDraft.value.typeName?.trim();
  const nextDisplayType = !drawnBuildingDraft.value.buildingType.trim() || drawnBuildingDraft.value.buildingType.trim() === previousTypeName
    ? definition.typeName
    : drawnBuildingDraft.value.buildingType;
  const shouldApplyFillDefault = !drawnBuildingDraft.value.fillColor.trim() || drawnBuildingDraft.value.fillColor.trim() === DEFAULT_DRAWN_BUILDING_FILL;
  const shouldApplyLineDefault = !drawnBuildingDraft.value.lineColor.trim() || drawnBuildingDraft.value.lineColor.trim().toLowerCase() === DEFAULT_DRAWN_BUILDING_LINE;
  const shouldApplyWidthDefault = Math.abs(drawnBuildingDraft.value.lineWidth - DEFAULT_DRAWN_BUILDING_LINE_WIDTH) <= 0.01;

  drawnBuildingDraft.value = {
    ...drawnBuildingDraft.value,
    categoryCode: definition.categoryCode,
    categoryName: definition.categoryName,
    typeCode: definition.typeCode,
    typeName: definition.typeName,
    renderType: definition.renderType,
    buildingType: nextDisplayType,
    fillColor: shouldApplyFillDefault ? semanticDefaults.fillColorHint ?? drawnBuildingDraft.value.fillColor : drawnBuildingDraft.value.fillColor,
    lineColor: shouldApplyLineDefault ? semanticDefaults.lineColorHint ?? drawnBuildingDraft.value.lineColor : drawnBuildingDraft.value.lineColor,
    lineWidth: shouldApplyWidthDefault ? semanticDefaults.lineWidthHint ?? drawnBuildingDraft.value.lineWidth : drawnBuildingDraft.value.lineWidth
  };
}

async function loadFeatureSchema(): Promise<void> {
  try {
    await mapFeatureCatalogStore.ensureLoaded();

    if (labelDraft.value?.typeCode) {
      applyLabelSemanticType(labelDraft.value.typeCode);
    }

    if (drawnBuildingDraft.value?.typeCode) {
      applyDrawnBuildingSemanticType(drawnBuildingDraft.value.typeCode);
    }
  } catch (error) {
    console.warn('Failed to load map feature schema.', error);
  }
}

function setLabelDraftFromContext(context: EditableMapLabelContext, existing?: MapLabel | null): void {
  editingLabelSubmissionId.value = null;
  labelEditorContext.value = context;
  labelDraft.value = createDraftFromContext(context, existing);
  labelAliasInput.value = formatAliasNamesInput(existing?.aliasNames);
  editingLabelId.value = existing?.id ?? null;
  lastAppliedLabelPreset.value = existing
    ? resolveLabelEditorPreset({
        featureType: labelDraft.value.featureType,
        typeCode: labelDraft.value.typeCode,
        definition: getFeatureTypeDefinition(labelDraft.value.typeCode)
      })
    : resolveLabelEditorPreset({
        featureType: labelDraft.value.featureType
      });
  applyLabelSemanticType(labelDraft.value.typeCode ?? getDefaultTypeCodeForLabelFeature(labelDraft.value.featureType), {
    applyDefaults: !existing
  });
}

function resetDrawnBuildingEditorState(options?: { preserveSelection?: boolean }): void {
  if (editingDrawnBuildingSubmissionId.value && drawnBuildingDraft.value) {
    drawnBuildingStore.removeArea(drawnBuildingDraft.value.id);
  }

  editingDrawnBuildingSubmissionId.value = null;
  if (!options?.preserveSelection) {
    drawnBuildingStore.clearSelection();
  }
  drawnBuildingDraft.value = null;
}

function clearSelectedEntity(): void {
  focusTarget.value = null;
  mapStore.setSelectedEntity(null);
}

function clearDrawnBuildingSelection(): void {
  drawnBuildingStore.clearSelection();
  drawnBuildingDraft.value = null;
}

function focusSelectedEntity(): void {
  if (!mapStore.selectedEntity) {
    return;
  }

  focusTarget.value = mapStore.selectedEntity;
}

function editSelectedEntityLabel(): void {
  if (!mapStore.selectedEntity) {
    return;
  }

  closeToolbarPanel();
  resetDrawnBuildingEditorState();
  drawnBuildingStore.cancelDraw();
  labelPickMode.value = null;
  void hydrateLabelDraft(createLabelContextFromFocusTarget(mapStore.selectedEntity));
}

function closeLabelEditor(): void {
  labelPickMode.value = null;
  labelEditorContext.value = null;
  labelDraft.value = null;
  labelAliasInput.value = '';
  lastAppliedLabelPreset.value = null;
  editingLabelId.value = null;
  editingLabelSubmissionId.value = null;
}

function openDrawnBuildingEditor(area: DrawnBuildingArea): void {
  closeToolbarPanel();
  closeLabelEditor();
  labelPickMode.value = null;
  focusTarget.value = null;
  mapStore.setSelectedEntity(null);
  drawnBuildingStore.cancelDraw();
  drawnBuildingStore.selectArea(area.id);
  editingDrawnBuildingSubmissionId.value = null;
  drawnBuildingDraft.value = createDrawnBuildingDraft(area);
  applyDrawnBuildingSemanticType(drawnBuildingDraft.value.typeCode || DEFAULT_DRAWN_BUILDING_TYPE_CODE);
}

function closeDrawnBuildingEditor(): void {
  drawnBuildingStore.cancelDraw();
  resetDrawnBuildingEditorState({ preserveSelection: true });
}

function clearDrawnBuildingFilter(): void {
  drawnBuildingKeyword.value = '';
  if (!drawnBuildingStore.areas.length) {
    showDrawnBuildingList.value = false;
  }
}

function toggleDrawnBuildingListPanel(): void {
  showDrawnBuildingList.value = !showDrawnBuildingList.value;
}

function locateDrawnBuildingArea(area: DrawnBuildingArea): void {
  const mapInstance = mapStore.mapInstance;
  if (!mapInstance) {
    return;
  }

  drawnBuildingStore.selectArea(area.id);
  const geometry = parseGeometryGeoJson(area.geometryGeoJson);
  const bounds = geometry ? getGeometryBounds(geometry) : null;
  if (!bounds) {
    return;
  }

  mapInstance.fitBounds(bounds, {
    padding: 80,
    maxZoom: 18,
    duration: 700
  });
}

function editDrawnBuildingArea(area: DrawnBuildingArea): void {
  if (mustUseSubmissionWorkflow.value && !area.isDraft) {
    ElMessage.warning('普通用户不能直接编辑正式建筑区域，请通过“我的提交”修改待审数据');
    return;
  }

  showDrawnBuildingList.value = true;
  openDrawnBuildingEditor(area);
  locateDrawnBuildingArea(area);
}

function previewDrawnBuildingArea(area: DrawnBuildingArea): void {
  showDrawnBuildingList.value = true;
  closeLabelEditor();
  clearSelectedEntity();
  drawnBuildingStore.cancelDraw();
  resetDrawnBuildingEditorState({ preserveSelection: true });
  drawnBuildingStore.selectArea(area.id);
  locateDrawnBuildingArea(area);
}

function editSelectedDrawnBuilding(): void {
  if (!selectedDrawnBuildingArea.value) {
    return;
  }

  if (mustUseSubmissionWorkflow.value && !selectedDrawnBuildingArea.value.isDraft) {
    ElMessage.warning('普通用户不能直接编辑正式建筑区域，请通过“我的提交”修改待审数据');
    return;
  }

  openDrawnBuildingEditor(selectedDrawnBuildingArea.value);
}

function startDrawBuildingArea(mode: Exclude<BuildingDrawMode, null>): void {
  closeToolbarPanel();
  closeLabelEditor();
  clearSelectedEntity();
  resetDrawnBuildingEditorState();
  drawnBuildingStore.startDraw(mode);
  ElMessage.info(mode === 'rectangle' ? '请在地图上点击两个对角点绘制建筑区域' : '请逐点点击绘制多边形，双击完成');
}

function cancelDrawBuildingArea(): void {
  drawnBuildingStore.cancelDraw();
  ElMessage.info('已取消建筑区域绘制');
}

function handleDrawnBuildingComplete(payload: DrawnBuildingCompletePayload): void {
  const area = drawnBuildingStore.createArea(payload);
  closeToolbarPanel();
  showDrawnBuildingList.value = true;
  drawnBuildingDraft.value = createDrawnBuildingDraft(area);
  applyDrawnBuildingSemanticType(drawnBuildingDraft.value.typeCode || DEFAULT_DRAWN_BUILDING_TYPE_CODE);
  ElMessage.success('建筑区域已创建，请完善名称和类型');
}

async function handleDrawnBuildingClick(areaId: EntityId): Promise<void> {
  const area = drawnBuildingStore.areas.find((item) => String(item.id) === String(areaId));
  if (area) {
    if (mustUseSubmissionWorkflow.value && !area.isDraft) {
      ElMessage.warning('普通用户不能直接编辑正式建筑区域');
      return;
    }

    closeLabelEditor();
    clearSelectedEntity();
    drawnBuildingStore.cancelDraw();
    resetDrawnBuildingEditorState({ preserveSelection: true });
    drawnBuildingStore.selectArea(area.id);
    return;
  }

  try {
    const detail = await getMapAreaById(areaId);
    const persistedArea = parseDrawnBuildingAreaFromMapArea(detail);
    if (!persistedArea) {
      ElMessage.warning('当前区域不是建筑绘制数据');
      return;
    }

    if (mustUseSubmissionWorkflow.value) {
      ElMessage.warning('普通用户不能直接编辑正式建筑区域');
      return;
    }

    drawnBuildingStore.replaceArea(areaId, persistedArea);
    closeLabelEditor();
    clearSelectedEntity();
    drawnBuildingStore.cancelDraw();
    resetDrawnBuildingEditorState({ preserveSelection: true });
    drawnBuildingStore.selectArea(persistedArea.id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载建筑区域详情失败');
  }
}

async function saveDrawnBuildingArea(): Promise<void> {
  if (!drawnBuildingDraft.value) {
    return;
  }

  const currentDraft = drawnBuildingDraft.value;
  const name = currentDraft.name.trim();
  if (!name) {
    ElMessage.warning('建筑名称不能为空');
    return;
  }

  try {
    const isNewArea = currentDraft.isDraft;
    const shouldPublishToBasemap = currentDraft.publishToBasemap;
    const payload = buildDrawnBuildingSavePayload(currentDraft, {
      sourceId: currentDraft.isDraft ? String(currentDraft.id) : undefined
    });

    if (mustUseSubmissionWorkflow.value) {
      const submissionId = editingDrawnBuildingSubmissionId.value;
      if (submissionId) {
        await updateMapFeatureSubmission(submissionId, {
          status: 'pending',
          payload
        });
      } else {
        await createMapFeatureSubmission({
          featureKind: 'manual_building_area',
          status: 'pending',
          payload
        });
      }

      drawnBuildingStore.removeArea(currentDraft.id);
      closeDrawnBuildingEditor();
      await clearSubmissionRouteQuery();
      ElMessage.success(
        shouldPublishToBasemap
          ? (submissionId ? '建筑区域已重新提交审核，审核通过后会进入底图待发布队列' : '建筑区域已提交审核，审核通过后会进入底图待发布队列')
          : (submissionId ? '建筑区域已重新提交审核' : '建筑区域已提交审核')
      );
      return;
    }

    const savedArea = currentDraft.isDraft
      ? await createMapArea(payload)
      : await updateMapArea(currentDraft.id, payload);
    const persistedArea = parseDrawnBuildingAreaFromMapArea(savedArea);

    if (!persistedArea) {
      throw new Error('后端返回的区域数据无法识别为建筑区域');
    }

    if (shouldPublishToBasemap) {
      await enqueueBasemapArea(savedArea.id, {
        actionType: isNewArea ? 'create' : 'update',
        remark: '地图工作台建筑区域编辑后加入底图待发布队列'
      });
    }

    drawnBuildingStore.replaceArea(currentDraft.id, persistedArea);
    drawnBuildingStore.selectArea(persistedArea.id);
    drawnBuildingDraft.value = createDrawnBuildingDraft(persistedArea);
    applyDrawnBuildingSemanticType(drawnBuildingDraft.value.typeCode || DEFAULT_DRAWN_BUILDING_TYPE_CODE);

    if (mapStore.viewport.bbox) {
      await refreshDrawnBuildingAreas(mapStore.viewport, true);
    }

    closeDrawnBuildingEditor();
    ElMessage.success(
      shouldPublishToBasemap
        ? (isNewArea ? '建筑区域已保存，并加入底图待发布队列' : '建筑区域已更新，并加入底图待发布队列')
        : (isNewArea ? '建筑区域已保存到后端' : '建筑区域已更新')
    );
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存建筑区域失败');
  }
}

async function deleteDrawnBuildingArea(area: Pick<DrawnBuildingArea, 'id' | 'name' | 'isDraft'>): Promise<void> {
  if (mustUseSubmissionWorkflow.value && !area.isDraft) {
    ElMessage.warning('普通用户不能直接删除正式建筑区域');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确认删除“${area.name}”吗？`,
      '删除建筑区域',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }
    );
  } catch {
    return;
  }

  try {
    if (!area.isDraft) {
      await deleteMapArea(area.id);
    }

    drawnBuildingStore.removeArea(area.id);
    if (drawnBuildingDraft.value && String(drawnBuildingDraft.value.id) === String(area.id)) {
      closeDrawnBuildingEditor();
    }

    if (mapStore.viewport.bbox && !area.isDraft) {
      await refreshDrawnBuildingAreas(mapStore.viewport, true);
    }

    if (!drawnBuildingStore.areas.length) {
      showDrawnBuildingList.value = false;
      drawnBuildingKeyword.value = '';
    }

    ElMessage.success(area.isDraft ? '未保存建筑区域已删除' : '建筑区域已删除');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除建筑区域失败');
  }
}

function isObjectPayload(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function clearSubmissionRouteQuery(): Promise<void> {
  if (!readQueryString(route.query.submissionId)) {
    return;
  }

  const nextQuery = {
    ...route.query,
    submissionId: undefined
  };

  await router.replace({
    path: route.path,
    query: nextQuery
  });
}

function normalizeLabelSubmissionPayload(submission: MapFeatureSubmission): SaveMapLabelPayload {
  if (!isObjectPayload(submission.payload)) {
    throw new Error('标注待审数据结构非法');
  }

  const payload = submission.payload as Partial<SaveMapLabelPayload>;
  const featureType = typeof payload.featureType === 'string' && payload.featureType.trim()
    ? payload.featureType.trim()
    : 'manual';
  const pointLongitude = typeof payload.pointLongitude === 'number' ? payload.pointLongitude : ZHONGSHAN_DEFAULT_CENTER[0];
  const pointLatitude = typeof payload.pointLatitude === 'number' ? payload.pointLatitude : ZHONGSHAN_DEFAULT_CENTER[1];

  return {
    featureType,
    sourceFeatureId: typeof payload.sourceFeatureId === 'string' ? payload.sourceFeatureId : null,
    sourceLayer: typeof payload.sourceLayer === 'string' ? payload.sourceLayer : null,
    labelType: typeof payload.labelType === 'string' && payload.labelType.trim()
      ? payload.labelType.trim()
      : getDefaultLabelType(featureType),
    categoryCode: typeof payload.categoryCode === 'string' ? payload.categoryCode : null,
    typeCode: typeof payload.typeCode === 'string' ? payload.typeCode : null,
    renderType: typeof payload.renderType === 'string' ? payload.renderType : null,
    originalName: typeof payload.originalName === 'string' ? payload.originalName : null,
    displayName: typeof payload.displayName === 'string' ? payload.displayName : '',
    aliasNames: Array.isArray(payload.aliasNames)
      ? payload.aliasNames.filter((item): item is string => typeof item === 'string')
      : [],
    pointLongitude,
    pointLatitude,
    minZoom: typeof payload.minZoom === 'number' ? payload.minZoom : getDefaultMinZoom(featureType),
    maxZoom: typeof payload.maxZoom === 'number' ? payload.maxZoom : getDefaultMaxZoom(featureType),
    priority: typeof payload.priority === 'number' ? payload.priority : getDefaultPriority(featureType),
    textColor: typeof payload.textColor === 'string' ? payload.textColor : DEFAULT_TEXT_COLOR,
    haloColor: typeof payload.haloColor === 'string' ? payload.haloColor : DEFAULT_HALO_COLOR,
    status: typeof payload.status === 'number' ? payload.status : 1,
    source: typeof payload.source === 'string' ? payload.source : DEFAULT_MANUAL_SOURCE,
    remark: typeof payload.remark === 'string' ? payload.remark : null
  };
}

function normalizeAreaSubmissionPayload(submission: MapFeatureSubmission): SaveMapAreaPayload {
  if (!isObjectPayload(submission.payload)) {
    throw new Error('建筑区域待审数据结构非法');
  }

  const payload = submission.payload as Partial<SaveMapAreaPayload>;
  if (typeof payload.name !== 'string' || !payload.name.trim() || typeof payload.geoJson !== 'string' || !payload.geoJson.trim()) {
    throw new Error('建筑区域待审数据缺少名称或几何');
  }

  return {
    name: payload.name.trim(),
    type: typeof payload.type === 'string' ? payload.type : null,
    categoryCode: typeof payload.categoryCode === 'string' ? payload.categoryCode : null,
    typeCode: typeof payload.typeCode === 'string' ? payload.typeCode : null,
    renderType: typeof payload.renderType === 'string' ? payload.renderType : 'polygon-fill',
    remark: typeof payload.remark === 'string' ? payload.remark : null,
    styleJson: typeof payload.styleJson === 'string' ? payload.styleJson : null,
    sourceType: typeof payload.sourceType === 'string' ? payload.sourceType : DRAWN_BUILDING_SOURCE_TYPE,
    sourceId: typeof payload.sourceId === 'string' ? payload.sourceId : undefined,
    status: typeof payload.status === 'number' ? payload.status : 1,
    geoJson: payload.geoJson
  };
}

function openLabelSubmissionEditor(submission: MapFeatureSubmission): void {
  closeToolbarPanel();
  const payload = normalizeLabelSubmissionPayload(submission);
  const context: EditableMapLabelContext = {
    sourceKind: 'manual',
    featureType: payload.featureType,
    labelType: payload.labelType || getDefaultLabelType(payload.featureType),
    categoryCode: payload.categoryCode ?? null,
    typeCode: payload.typeCode ?? null,
    renderType: payload.renderType ?? null,
    geometryType: 'point',
    sourceFeatureId: payload.sourceFeatureId ?? null,
    sourceLayer: payload.sourceLayer ?? null,
    originalName: payload.originalName ?? null,
    suggestedDisplayName: payload.displayName,
    pointLongitude: payload.pointLongitude,
    pointLatitude: payload.pointLatitude
  };

  resetDrawnBuildingEditorState();
  drawnBuildingStore.cancelDraw();
  clearSelectedEntity();
  setLabelDraftFromContext(context, null);
  labelDraft.value = {
    ...labelDraft.value!,
    ...payload,
    aliasNames: [...payload.aliasNames]
  };
  lastAppliedLabelPreset.value = resolveLabelEditorPreset({
    featureType: labelDraft.value.featureType,
    typeCode: labelDraft.value.typeCode,
    definition: getFeatureTypeDefinition(labelDraft.value.typeCode)
  });
  labelAliasInput.value = formatAliasNamesInput(payload.aliasNames);
  editingLabelId.value = null;
  editingLabelSubmissionId.value = submission.id;
  labelPickMode.value = null;
}

function openDrawnBuildingSubmissionEditor(submission: MapFeatureSubmission): void {
  closeToolbarPanel();
  const payload = normalizeAreaSubmissionPayload(submission);
  const draft = createDrawnBuildingDraftFromSavePayload(submission.id, payload);
  const previewArea: DrawnBuildingArea = {
    ...draft,
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString()
  };

  closeLabelEditor();
  clearSelectedEntity();
  drawnBuildingStore.cancelDraw();
  resetDrawnBuildingEditorState();
  drawnBuildingStore.replaceArea(previewArea.id, previewArea);
  drawnBuildingDraft.value = draft;
  editingDrawnBuildingSubmissionId.value = submission.id;
  applyDrawnBuildingSemanticType(drawnBuildingDraft.value.typeCode || DEFAULT_DRAWN_BUILDING_TYPE_CODE);
  showDrawnBuildingList.value = true;
  locateDrawnBuildingArea(previewArea);
}

async function loadSubmissionEditor(submissionId: string): Promise<void> {
  try {
    const submission = await getMapFeatureSubmission(submissionId);
    if (!canEditSubmission(submission.status) && mustUseSubmissionWorkflow.value) {
      ElMessage.warning('当前提交状态不可再次编辑');
      await clearSubmissionRouteQuery();
      return;
    }

    if (submission.featureKind === 'label') {
      openLabelSubmissionEditor(submission);
      return;
    }

    if (submission.featureKind === 'manual_building_area') {
      openDrawnBuildingSubmissionEditor(submission);
      return;
    }

    ElMessage.warning('当前版本暂不支持在地图页编辑该类型待审数据');
    await clearSubmissionRouteQuery();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '待审数据加载失败');
  }
}

function getCachedManualLabel(labelId: EntityId): MapLabel | null {
  return manualLabels.value.find((label) => String(label.id) === String(labelId)) ?? null;
}

async function loadManualLabelDetail(labelId: EntityId): Promise<void> {
  if (mustUseSubmissionWorkflow.value) {
    ElMessage.warning('普通用户不能直接编辑正式标注，请通过“我的提交”修改待审数据');
    return;
  }

  const cached = getCachedManualLabel(labelId);
  if (cached) {
    setLabelDraftFromContext(createLabelContextFromManualLabel(cached), cached);
    return;
  }

  const currentRequestId = ++labelContextRequestId.value;
  labelLookupLoading.value = true;

  try {
    const detail = await getMapLabelDetail(labelId);
    if (currentRequestId !== labelContextRequestId.value) {
      return;
    }

    setLabelDraftFromContext(createLabelContextFromManualLabel(detail), detail);
  } catch (error) {
    if (currentRequestId !== labelContextRequestId.value) {
      return;
    }

    ElMessage.error(error instanceof Error ? error.message : '加载标注详情失败');
  } finally {
    if (currentRequestId === labelContextRequestId.value) {
      labelLookupLoading.value = false;
    }
  }
}

async function hydrateLabelDraft(context: EditableMapLabelContext): Promise<void> {
  labelEditorContext.value = context;
  const currentRequestId = ++labelContextRequestId.value;

  if (!context.sourceFeatureId) {
    setLabelDraftFromContext(context, null);
    return;
  }

  labelLookupLoading.value = true;
  try {
    const matched = await queryMapLabels({
      featureType: context.featureType,
      sourceFeatureId: context.sourceFeatureId,
      sourceLayer: context.sourceLayer || undefined
    });

    if (currentRequestId !== labelContextRequestId.value) {
      return;
    }

    setLabelDraftFromContext(context, mustUseSubmissionWorkflow.value ? null : matched[0] ?? null);
  } catch (error) {
    if (currentRequestId !== labelContextRequestId.value) {
      return;
    }

    setLabelDraftFromContext(context, null);
    ElMessage.error(error instanceof Error ? error.message : '加载标注失败');
  } finally {
    if (currentRequestId === labelContextRequestId.value) {
      labelLookupLoading.value = false;
    }
  }
}

function updateDraftPoint(longitude: number, latitude: number): void {
  if (!labelDraft.value) {
    const context = createManualPointContext(longitude, latitude);
    setLabelDraftFromContext(context, null);
    return;
  }

  labelDraft.value = {
    ...labelDraft.value,
    pointLongitude: longitude,
    pointLatitude: latitude
  };

  if (labelEditorContext.value) {
    labelEditorContext.value = {
      ...labelEditorContext.value,
      pointLongitude: longitude,
      pointLatitude: latitude
    };
  }
}

async function refreshDrawnBuildingAreas(viewport: MapViewportState, force = false): Promise<void> {
  if (!viewport.bbox) {
    drawnBuildingStore.replacePersistedAreas([]);
    lastRequestedDrawnBuildingViewport.value = null;
    return;
  }

  if (!force && isSimilarViewport(viewport, lastRequestedDrawnBuildingViewport.value)) {
    return;
  }

  try {
    const featureCollection = await getMapAreasGeoJson({
      bbox: viewport.bbox,
      status: 1,
      sourceType: DRAWN_BUILDING_SOURCE_TYPE
    });

    const persistedAreas = featureCollection.features
      .map((feature) => parseDrawnBuildingAreaFromFeature(feature))
      .filter((item): item is DrawnBuildingArea => Boolean(item));

    drawnBuildingStore.replacePersistedAreas(persistedAreas);
    lastRequestedDrawnBuildingViewport.value = cloneViewport(viewport);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '建筑区域加载失败');
  }
}

async function refreshViewportFeatures(viewport: MapViewportState, force = false): Promise<void> {
  const request = buildViewportFeatureRequest(viewport);
  if (!request) {
    viewportFeatureState.clearViewportFeatures();
    lastRequestedFeatureViewport.value = null;
    lastRequestedFeatureSignature.value = '';
    return;
  }

  const signature = `${request.featureTypes}|${request.limit}`;
  if (!force &&
    signature === lastRequestedFeatureSignature.value &&
    isSimilarViewport(viewport, lastRequestedFeatureViewport.value)) {
    return;
  }

  const completed = await viewportFeatureState.fetchViewportFeatures(request);
  if (!completed) {
    return;
  }

  lastRequestedFeatureViewport.value = cloneViewport(viewport);
  lastRequestedFeatureSignature.value = signature;
}

function resetScheduledRefresh(): void {
  if (refreshTimer.value !== null) {
    window.clearTimeout(refreshTimer.value);
    refreshTimer.value = null;
  }
}

async function flushScheduledRefresh(force = false): Promise<void> {
  resetScheduledRefresh();

  const viewport = pendingViewport.value ?? mapStore.viewport;
  pendingViewport.value = null;

  if (!viewport?.bbox) {
    debugMapRefresh('skip refresh because bbox is empty');
    return;
  }

  const enabledLayers = getEnabledLayers();
  const zoomFilteredLayers = enabledLayers.filter((layer) => !isLayerWithinZoomRange(layer, viewport));
  if (!enabledLayers.length) {
    debugMapRefresh('skip business refresh because no business layer is enabled');
  }

  await refreshDrawnBuildingAreas(viewport, force);
  if (zoomFilteredLayers.length) {
    debugMapRefresh('skip layers because zoom is below threshold', {
      zoom: viewport.zoom,
      layers: zoomFilteredLayers.map((layer) => ({
        layer,
        minZoom: LAYER_MIN_ZOOM[layer]
      }))
    });
  }

  debugMapRefresh('request visible layers', {
    reason: pendingRefreshReason.value,
    bbox: viewport.bbox,
    layers: enabledLayers.filter((layer) => isLayerWithinZoomRange(layer, viewport)),
    featureTypes: buildViewportFeatureRequest(viewport)?.featureTypes
  });

  try {
    await refreshViewportFeatures(viewport, force);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '地图数据加载失败');
  }
}

function scheduleRefresh(viewport: MapViewportState, options?: { immediate?: boolean; force?: boolean; reason?: string }): void {
  mapStore.setViewport(viewport);
  pendingViewport.value = cloneViewport(viewport);
  pendingRefreshReason.value = options?.reason ?? 'viewport-change';

  if (options?.immediate) {
    void flushScheduledRefresh(options.force);
    return;
  }

  if (refreshTimer.value !== null) {
    debugMapRefresh('debounce previous refresh', {
      reason: pendingRefreshReason.value
    });
    window.clearTimeout(refreshTimer.value);
  }

  refreshTimer.value = window.setTimeout(() => {
    void flushScheduledRefresh(options?.force);
  }, MAP_REFRESH_DEBOUNCE_MS);
}

function handleMapReady(mapInstance: MapLibreMap): void {
  mapStore.setMap(mapInstance);
  scheduleRefresh(getViewportSnapshot(mapInstance), {
    immediate: true,
    force: true,
    reason: 'initial-load'
  });
}

function handleViewportChange(payload: { bbox: string; center: [number, number]; zoom: number }): void {
  scheduleRefresh(payload, {
    reason: 'moveend'
  });
}

function handleEntityClick(target: MapFocusTarget): void {
  if (labelPickMode.value === 'point') {
    return;
  }

  resetDrawnBuildingEditorState();
  drawnBuildingStore.cancelDraw();

  if (labelPickMode.value === 'feature') {
    focusTarget.value = target;
    mapStore.setSelectedEntity(null);
    labelPickMode.value = null;
    void hydrateLabelDraft(createLabelContextFromFocusTarget(target));
    return;
  }

  focusTarget.value = null;
  mapStore.setSelectedEntity(target);
}

function handleMapClick(payload: { longitude: number; latitude: number }): void {
  if (labelPickMode.value !== 'point') {
    if (showInspectorPanel.value) {
      clearSelectedEntity();
    }
    return;
  }

  updateDraftPoint(payload.longitude, payload.latitude);
  labelPickMode.value = null;
  ElMessage.success('标注点已更新');
}

function handleBasemapFeatureClick(feature: BasemapInspectableFeature): void {
  closeToolbarPanel();
  resetDrawnBuildingEditorState();
  drawnBuildingStore.cancelDraw();
  focusTarget.value = null;
  mapStore.setSelectedEntity(null);
  labelPickMode.value = null;
  void hydrateLabelDraft(createLabelContextFromBasemapFeature(feature));
}

function handleManualLabelClick(labelId: EntityId): void {
  closeToolbarPanel();
  resetDrawnBuildingEditorState();
  drawnBuildingStore.cancelDraw();
  clearSelectedEntity();
  labelPickMode.value = null;
  void loadManualLabelDetail(labelId);
}

function toggleFeaturePickMode(): void {
  closeToolbarPanel();
  resetDrawnBuildingEditorState();
  drawnBuildingStore.cancelDraw();
  labelPickMode.value = labelPickMode.value === 'feature' ? null : 'feature';
}

function togglePointPickMode(): void {
  closeToolbarPanel();
  resetDrawnBuildingEditorState();
  drawnBuildingStore.cancelDraw();
  if (!labelDraft.value) {
    const [longitude, latitude] = getLabelFallbackCenter();
    setLabelDraftFromContext(createManualPointContext(longitude, latitude), null);
  }

  labelPickMode.value = labelPickMode.value === 'point' ? null : 'point';
}

function startManualLabel(): void {
  closeToolbarPanel();
  resetDrawnBuildingEditorState();
  drawnBuildingStore.cancelDraw();
  const [longitude, latitude] = getLabelFallbackCenter();
  clearSelectedEntity();
  setLabelDraftFromContext(createManualPointContext(longitude, latitude), null);
  labelPickMode.value = null;
}

async function reloadCurrentLabel(): Promise<void> {
  if (editingLabelSubmissionId.value) {
    await loadSubmissionEditor(editingLabelSubmissionId.value);
    return;
  }

  if (editingLabelId.value !== null) {
    await loadManualLabelDetail(editingLabelId.value);
    return;
  }

  if (!labelEditorContext.value) {
    startManualLabel();
    return;
  }

  await hydrateLabelDraft(labelEditorContext.value);
}

async function handleSearch(): Promise<void> {
  const keyword = searchKeyword.value.trim();
  if (!keyword) {
    clearSearchResults();
    return;
  }

  searchPanelMessage.value = '';
  searchLoading.value = true;
  try {
    const selectedType = getFeatureTypeDefinition(searchTypeCode.value);
    const result = await searchMap({
      q: keyword,
      types: getSearchTypeRequestTypes(searchTypeCode.value),
      categoryCode: selectedType?.categoryCode,
      typeCode: searchTypeCode.value || undefined,
      page: 1,
      pageSize: 10,
      bbox: mapStore.viewport.bbox
    });
    mapStore.setSearchResults(result.items);
    searchPanelMessage.value = result.items.length
      ? ''
      : `未找到“${keyword}”${selectedType ? `的${selectedType.typeName}` : ''}相关结果`;
  } catch (error) {
    searchPanelMessage.value = '';
    ElMessage.error(error instanceof Error ? error.message : '搜索失败');
  } finally {
    searchLoading.value = false;
  }
}

function clearSearchResults(): void {
  mapStore.setSearchResults([]);
  searchPanelMessage.value = '';
}

function clearSearch(): void {
  searchKeyword.value = '';
  searchTypeCode.value = '';
  clearSearchResults();
}

function buildLabelFocusTarget(item: MapSearchItem): MapFocusTarget | null {
  const longitude = item.longitude ?? item.lng;
  const latitude = item.latitude ?? item.lat;
  if (typeof longitude !== 'number' || typeof latitude !== 'number') {
    return null;
  }

  return {
    entityType: 'label',
    id: item.id,
    name: item.displayName || item.name,
    displayName: item.displayName || item.name,
    sourceType: item.sourceType ?? item.source ?? null,
    sourceId: item.sourceId ?? null,
    categoryCode: item.categoryCode ?? null,
    categoryName: item.categoryName ?? null,
    typeCode: item.typeCode ?? null,
    typeName: item.typeName ?? null,
    renderType: item.renderType ?? null,
    geometryType: item.geometryType ?? 'point',
    source: item.source ?? null,
    classification: item.classification ?? null,
    status: item.status,
    longitude,
    latitude
  };
}

async function saveLabel(): Promise<void> {
  if (!labelDraft.value) {
    ElMessage.warning('请先选择要标注的对象');
    return;
  }

  labelDraft.value = {
    ...labelDraft.value,
    aliasNames: parseAliasNamesInput(labelAliasInput.value),
    labelType: labelDraft.value.labelType || getDefaultLabelType(labelDraft.value.featureType),
    minZoom: labelDraft.value.minZoom ?? getDefaultMinZoom(labelDraft.value.featureType),
    maxZoom: labelDraft.value.maxZoom ?? getDefaultMaxZoom(labelDraft.value.featureType),
    priority: labelDraft.value.priority ?? getDefaultPriority(labelDraft.value.featureType),
    source: labelDraft.value.source || DEFAULT_MANUAL_SOURCE,
    textColor: labelDraft.value.textColor || DEFAULT_TEXT_COLOR,
    haloColor: labelDraft.value.haloColor || DEFAULT_HALO_COLOR
  };

  const payload = sanitizeMapLabelPayload(labelDraft.value);
  if (!payload.displayName) {
    ElMessage.warning('显示名称不能为空');
    return;
  }

  if (payload.minZoom > payload.maxZoom) {
    ElMessage.warning('最小缩放不能大于最大缩放');
    return;
  }

  const isUpdate = Boolean(labelDraft.value.id);
  labelSaving.value = true;
  try {
    if (mustUseSubmissionWorkflow.value) {
      const submissionId = editingLabelSubmissionId.value;
      if (submissionId) {
        await updateMapFeatureSubmission(submissionId, {
          status: 'pending',
          payload
        });
      } else {
        await createMapFeatureSubmission({
          featureKind: 'label',
          status: 'pending',
          payload
        });
      }

      closeLabelEditor();
      await clearSubmissionRouteQuery();
      ElMessage.success(submissionId ? '标注已重新提交审核' : '标注已提交审核');
      return;
    }

    const saved = isUpdate && labelDraft.value.id !== null && labelDraft.value.id !== undefined
      ? await updateMapLabel(labelDraft.value.id, payload)
      : await createMapLabel(payload);

    labelDraft.value = {
      ...labelDraft.value,
      ...saved,
      id: saved.id,
      aliasNames: saved.aliasNames
    };
    lastAppliedLabelPreset.value = resolveLabelEditorPreset({
      featureType: labelDraft.value.featureType,
      typeCode: labelDraft.value.typeCode,
      definition: getFeatureTypeDefinition(labelDraft.value.typeCode)
    });
    editingLabelId.value = saved.id;
    labelEditorContext.value = createLabelContextFromManualLabel(saved);
    labelAliasInput.value = formatAliasNamesInput(saved.aliasNames);

    await refreshViewportFeatures(mapStore.viewport, true);
    ElMessage.success(isUpdate ? '标注已更新' : '标注已保存');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存标注失败');
  } finally {
    labelSaving.value = false;
  }
}

async function resolveFocusTarget(entityType: EntityType, id: EntityId): Promise<MapFocusTarget> {
  switch (entityType) {
    case 'shop': {
      const detail = await shopStore.getShopDetail(id);
      return {
        entityType: 'shop',
        id: detail.id,
        name: detail.name,
        category: detail.category,
        categoryCode: detail.categoryCode,
        categoryName: detail.categoryName,
        typeCode: detail.typeCode,
        typeName: detail.typeName,
        renderType: detail.renderType,
        geometryType: detail.geometryType,
        remark: detail.remark,
        icon: detail.icon,
        status: detail.status,
        longitude: detail.longitude,
        latitude: detail.latitude
      };
    }
    case 'area': {
      const detail = await areaStore.getAreaDetail(id);
      return {
        entityType: 'area',
        id: detail.id,
        name: detail.name,
        type: detail.type,
        categoryCode: detail.categoryCode,
        categoryName: detail.categoryName,
        typeCode: detail.typeCode,
        typeName: detail.typeName,
        renderType: detail.renderType,
        geometryType: detail.geometryType,
        remark: detail.remark,
        styleJson: detail.styleJson,
        status: detail.status,
        geometryGeoJson: detail.geometryGeoJson
      };
    }
    case 'poi': {
      const detail = await poiStore.getPoiDetail(id);
      return {
        entityType: 'poi',
        id: detail.id,
        name: detail.name,
        category: detail.category,
        subcategory: detail.subcategory,
        categoryCode: detail.categoryCode,
        categoryName: detail.categoryName,
        typeCode: detail.typeCode,
        typeName: detail.typeName,
        renderType: detail.renderType,
        geometryType: detail.geometryType,
        remark: detail.remark,
        icon: detail.icon,
        address: detail.address,
        phone: detail.phone,
        status: detail.status,
        longitude: detail.longitude,
        latitude: detail.latitude
      };
    }
    case 'place': {
      const detail = await placeStore.getPlaceDetail(id);
      return {
        entityType: 'place',
        id: detail.id,
        name: detail.name,
        placeType: detail.placeType,
        adminLevel: detail.adminLevel,
        categoryCode: detail.categoryCode,
        categoryName: detail.categoryName,
        typeCode: detail.typeCode,
        typeName: detail.typeName,
        renderType: detail.renderType,
        geometryType: detail.geometryType,
        remark: detail.remark,
        status: detail.status,
        geometryGeoJson: detail.geometryGeoJson,
        centerLongitude: detail.centerLongitude,
        centerLatitude: detail.centerLatitude
      };
    }
    case 'boundary': {
      const detail = await boundaryStore.getBoundaryDetail(id);
      return {
        entityType: 'boundary',
        id: detail.id,
        name: detail.name,
        boundaryType: detail.boundaryType,
        adminLevel: detail.adminLevel,
        categoryCode: detail.categoryCode,
        categoryName: detail.categoryName,
        typeCode: detail.typeCode,
        typeName: detail.typeName,
        renderType: detail.renderType,
        geometryType: detail.geometryType,
        remark: detail.remark,
        styleJson: detail.styleJson,
        status: detail.status,
        geometryGeoJson: detail.geometryGeoJson
      };
    }
    case 'label':
      throw new Error('标注搜索结果不支持详情接口，请使用搜索结果直接定位');
    default:
      throw new Error(`未知实体类型：${entityType}`);
  }
}

function readQueryString(raw: unknown): string | undefined {
  if (typeof raw === 'string') {
    return raw.trim() || undefined;
  }

  if (Array.isArray(raw)) {
    return readQueryString(raw[0]);
  }

  return undefined;
}

function readQueryNumber(raw: unknown): number | undefined {
  const value = readQueryString(raw);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildFocusTargetFromQuery(entityType: EntityType, id: EntityId): MapFocusTarget | null {
  const name = readQueryString(route.query.name) || '未命名对象';
  const status = readQueryNumber(route.query.status) ?? 0;

  if (entityType === 'shop' || entityType === 'poi') {
    const longitude = readQueryNumber(route.query.lng);
    const latitude = readQueryNumber(route.query.lat);

    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
      return null;
    }

    if (entityType === 'shop') {
      return {
        entityType: 'shop',
        id,
        name,
        category: readQueryString(route.query.category),
        status,
        longitude,
        latitude
      };
    }

    return {
      entityType: 'poi',
      id,
      name,
      category: readQueryString(route.query.category),
      subcategory: readQueryString(route.query.subcategory),
      status,
      longitude,
      latitude
    };
  }

  if (entityType === 'place') {
    const centerLongitude = readQueryNumber(route.query.centerLng);
    const centerLatitude = readQueryNumber(route.query.centerLat);

    if (typeof centerLongitude !== 'number' || typeof centerLatitude !== 'number') {
      return null;
    }

    return {
      entityType: 'place',
      id,
      name,
      placeType: readQueryString(route.query.placeType),
      adminLevel: readQueryNumber(route.query.adminLevel),
      status,
      centerLongitude,
      centerLatitude
    };
  }

  return null;
}

async function locateSearchResult(item: MapSearchItem): Promise<void> {
  try {
    resetDrawnBuildingEditorState();
    drawnBuildingStore.cancelDraw();
    const target = item.itemType === 'label'
      ? buildLabelFocusTarget(item)
      : await resolveFocusTarget(item.itemType, item.id);

    if (!target) {
      throw new Error('搜索结果缺少可定位坐标');
    }

    focusTarget.value = target;
    mapStore.setSelectedEntity(target);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '定位失败');
  }
}

async function syncRouteFocus(): Promise<void> {
  const submissionId = readQueryString(route.query.submissionId);
  if (submissionId) {
    await loadSubmissionEditor(submissionId);
    return;
  }

  const entity = readQueryString(route.query.entity);
  const id = readQueryString(route.query.id);

  if (
    !entity ||
    !['shop', 'area', 'poi', 'place', 'boundary'].includes(entity) ||
    !id
  ) {
    return;
  }

  try {
    const queryTarget = buildFocusTargetFromQuery(entity as EntityType, id);
    if (queryTarget) {
      focusTarget.value = queryTarget;
      mapStore.setSelectedEntity(queryTarget);
      return;
    }

    const target = await resolveFocusTarget(entity as EntityType, id);
    focusTarget.value = target;
    mapStore.setSelectedEntity(target);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '无法加载定位对象');
  }
}

function getInspectorDetail(target: MapFocusTarget): string {
  switch (target.entityType) {
    case 'shop':
    case 'poi':
    case 'label':
      return `坐标：${target.longitude.toFixed(6)}, ${target.latitude.toFixed(6)}`;
    case 'area':
      return `语义类型：${target.typeName || target.categoryName || target.type || '未分类'}`;
    case 'place':
      return `语义类型：${target.typeName || target.categoryName || target.placeType || '未分类'} · 行政级别：${target.adminLevel ?? '-'} · 中心点：${
        typeof target.centerLongitude === 'number' && typeof target.centerLatitude === 'number'
          ? `${target.centerLongitude.toFixed(6)}, ${target.centerLatitude.toFixed(6)}`
          : '-'
      }`;
    case 'boundary':
      return `语义类型：${target.typeName || target.categoryName || target.boundaryType || '未分类'} · 行政级别：${target.adminLevel ?? '-'} · 样式：${target.styleJson || '-'}`;
  }
}

function getInspectorRemark(target: MapFocusTarget): string {
  switch (target.entityType) {
    case 'shop':
    case 'area':
    case 'poi':
    case 'place':
    case 'boundary':
      return target.remark || '暂无备注信息。';
    case 'label':
      return `来源：${target.source || target.sourceType || '-'} · 分类：${target.typeName || target.categoryName || target.classification || '未分类'}`;
    default:
      return '暂无备注信息。';
  }
}

watch(
  () => labelDraft.value?.featureType,
  (featureType, previousFeatureType) => {
    if (!labelDraft.value || !featureType) {
      return;
    }

    const previousDefaultTypeCode = previousFeatureType
      ? getDefaultTypeCodeForLabelFeature(previousFeatureType)
      : null;
    const currentTypeCode = labelDraft.value.typeCode;
    const nextTypeCode = !currentTypeCode || currentTypeCode === previousDefaultTypeCode
      ? getDefaultTypeCodeForLabelFeature(featureType)
      : currentTypeCode;

    if (nextTypeCode) {
      labelDraft.value = {
        ...labelDraft.value,
        typeCode: nextTypeCode
      };
      applyLabelSemanticType(nextTypeCode, { applyDefaults: true });
      return;
    }

    const nextPreset = resolveLabelEditorPreset({
      featureType,
      labelType: labelDraft.value.labelType
    });
    labelDraft.value = applyLabelEditorPreset(labelDraft.value, nextPreset, {
      previousPreset: lastAppliedLabelPreset.value
    });
    lastAppliedLabelPreset.value = nextPreset;
  }
);

watch(
  () => route.fullPath,
  () => {
    void syncRouteFocus();
  },
  { immediate: true }
);

onMounted(() => {
  mapStore.setSearchResults([]);
  searchPanelMessage.value = '';
  void loadFeatureSchema();
});

watch(
  () => ({ ...mapStore.layerVisibility }),
  (next, previous) => {
    const changedLayers = (Object.keys(next) as LayerKey[]).filter((key) => next[key] !== previous[key]);

    if (!changedLayers.length) {
      return;
    }

    changedLayers.forEach((layer) => {
      if (!next[layer]) {
        debugMapRefresh(`skip ${layer} because layer is disabled`);
        return;
      }

      debugMapRefresh(`layer ${layer} enabled, schedule refresh`, {
        bbox: mapStore.viewport.bbox,
        zoom: mapStore.viewport.zoom,
        minZoom: LAYER_MIN_ZOOM[layer]
      });
    });

    lastRequestedFeatureSignature.value = '';

    if (mapStore.viewport.bbox) {
      scheduleRefresh(mapStore.viewport, {
        reason: 'layer-visibility-change'
      });
    }
  }
);

onBeforeUnmount(() => {
  resetScheduledRefresh();
  viewportFeatureState.cancelViewportFeatureRequest('map-view-unmount');
  drawnBuildingStore.cancelDraw();
  drawnBuildingStore.clearSelection();
  mapStore.setMap(null);
});
</script>

<style scoped>
.map-page-view {
  display: flex;
  flex: 1;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.map-page {
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.map-overlay {
  position: absolute;
  z-index: 2;
  display: grid;
  gap: 12px;
}

.map-overlay-left {
  top: 18px;
  left: 18px;
  align-content: start;
}

.map-overlay-right {
  top: 78px;
  right: 18px;
  bottom: 18px;
  justify-items: end;
  align-content: start;
}

.map-workbench {
  display: grid;
  gap: 12px;
  justify-items: end;
  width: min(360px, calc(100vw - 32px));
}

.map-toolbar-strip {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 8px;
}

.map-toolbar-button {
  display: grid;
  gap: 3px;
  justify-items: center;
  padding: 9px 8px;
  border: none;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.82);
  color: #475569;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.map-toolbar-button:hover {
  background: rgba(239, 246, 255, 0.98);
  color: #1d4ed8;
  transform: translateY(-1px);
}

.map-toolbar-button--active {
  background: rgba(239, 246, 255, 0.98);
  color: #1d4ed8;
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.12);
}

.map-toolbar-button span {
  font-size: 13px;
  font-weight: 700;
}

.map-toolbar-button small {
  color: inherit;
  font-size: 11px;
  line-height: 1.2;
}

.map-toolbar-panel {
  width: 100%;
  padding: 12px;
}

.search-results-card,
.inspector-card,
.label-editor-card {
  border-radius: 22px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(14px);
}

.search-results-card,
.inspector-card {
  width: min(360px, calc(100vw - 32px));
}

.label-editor-card {
  max-height: calc(100vh - 112px);
  overflow: hidden;
}

.label-editor-card--drawer {
  width: min(420px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  height: min(calc(100vh - 112px), 100%);
  padding: 16px 16px 0;
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
}

.label-editor-body {
  display: grid;
  gap: 14px;
  padding-right: 4px;
  padding-bottom: 4px;
}

.editor-scrollbar {
  flex: 1;
  min-height: 0;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.card-head--compact {
  margin-bottom: 8px;
}

.card-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.card-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.card-meta {
  color: var(--text-secondary);
  font-size: 12px;
}

.search-results-card .card-head {
  margin-bottom: 12px;
}

.building-list-filter {
  margin-bottom: 12px;
}

.result-list {
  display: grid;
  gap: 8px;
}

.result-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 13px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.result-item:hover {
  border-color: rgba(59, 130, 246, 0.28);
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.08);
  transform: translateY(-1px);
}

.result-item strong {
  display: block;
}

.result-item p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.result-item--stack {
  display: grid;
  gap: 10px;
}

.result-main {
  min-width: 0;
}

.result-item-side {
  display: grid;
  justify-items: end;
  gap: 6px;
  flex: none;
}

.result-inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.search-empty-tip,
.label-editor-empty-tip {
  margin: 0;
  padding: 8px 4px 2px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.inspector-card--amap {
  overflow: hidden;
  padding: 0;
}

.inspector-cover {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  background:
    linear-gradient(135deg, rgba(41, 121, 255, 0.14), rgba(255, 255, 255, 0.05)),
    linear-gradient(180deg, rgba(248, 251, 255, 0.95), rgba(255, 255, 255, 0.88));
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.inspector-cover-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.inspector-close {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
}

.inspector-close:hover {
  color: #0f172a;
}

.result-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.result-status--success {
  background: #ecfdf3;
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.24);
}

.result-status--warning {
  background: #fff7ed;
  color: #c2410c;
  border-color: rgba(249, 115, 22, 0.22);
}

.result-status--danger {
  background: #fef2f2;
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.22);
}

.result-status--info {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.22);
}

.inspector-body {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.inspector-title-block {
  display: grid;
  gap: 4px;
}

.inspector-title-block strong {
  font-size: 22px;
  line-height: 1.2;
}

.inspector-subtitle,
.inspector-info-list,
.inspector-remark,
.inspector-detail {
  margin: 0;
  color: var(--text-secondary);
}

.inspector-info-list {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.inspector-actions {
  display: flex;
  gap: 10px;
}

.inspector-actions :deep(.el-button) {
  flex: 1;
}

.label-editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.label-editor-toolbar--compact {
  margin-bottom: 0;
}

.tool-group {
  display: grid;
  gap: 8px;
}

.tool-group + .tool-group {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.tool-group-title {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.tool-filter-select {
  width: 100%;
}

.tool-group-selection {
  display: grid;
  gap: 6px;
  padding: 12px 13px;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.tool-group-selection strong {
  font-size: 14px;
}

.tool-group-selection span {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.toolbar-panel-tip,
.section-help-text,
.field-pair-help {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.toolbar-mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.toolbar-mode-grid--editor {
  grid-template-columns: 1fr;
}

.toolbar-mode-card {
  display: grid;
  gap: 6px;
  padding: 12px 13px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: #ffffff;
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.toolbar-mode-card:hover {
  border-color: rgba(59, 130, 246, 0.22);
  box-shadow: 0 10px 18px rgba(59, 130, 246, 0.08);
  transform: translateY(-1px);
}

.toolbar-mode-card--active {
  border-color: rgba(37, 99, 235, 0.26);
  background: rgba(239, 246, 255, 0.96);
  box-shadow: 0 10px 18px rgba(59, 130, 246, 0.08);
}

.toolbar-mode-card strong {
  font-size: 14px;
}

.toolbar-mode-card span {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.toolbar-status-card,
.strategy-summary,
.field-help-card {
  padding: 12px 13px;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.toolbar-status-card {
  display: grid;
  gap: 4px;
}

.toolbar-status-card strong,
.strategy-summary strong,
.field-help-card strong {
  font-size: 13px;
}

.toolbar-status-card p,
.strategy-summary span,
.field-help-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.label-editor-tip {
  margin: 0 0 12px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.label-editor-tip--compact {
  margin-bottom: 0;
}

.label-context-summary {
  margin-bottom: 12px;
  padding: 12px 13px;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.label-context-summary strong {
  display: block;
  margin-bottom: 4px;
}

.label-context-summary p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.label-context-summary--rich {
  margin-bottom: 0;
}

.context-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.context-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #475569;
  font-size: 12px;
  line-height: 1;
}

.label-context-note {
  margin-top: 10px !important;
}

.label-editor-form {
  display: grid;
  gap: 0;
}

.label-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.label-help-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.tool-group-selection--toolbar {
  margin-top: 6px;
}

.editor-section {
  display: grid;
  gap: 12px;
}

.editor-section + .editor-section {
  padding-top: 4px;
}

.editor-section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.editor-section-eyebrow {
  display: inline-flex;
  align-items: center;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.editor-section-head h4 {
  margin: 4px 0 0;
  font-size: 15px;
  line-height: 1.3;
}

.editor-section-meta {
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.editor-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 0 16px;
  margin-top: 8px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.98);
  z-index: 1;
}

.label-editor-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.label-editor-form :deep(.el-input-number) {
  width: 100%;
}

.label-editor-form :deep(.el-select) {
  width: 100%;
}

@media (max-width: 1024px) {
  .map-page {
    height: auto;
    min-height: 860px;
    overflow: visible;
  }

  .map-overlay {
    position: static;
    margin-top: 12px;
  }

  .map-overlay-right {
    top: auto;
    justify-items: stretch;
  }

  .map-workbench {
    justify-items: stretch;
    width: 100%;
  }

  .search-results-card,
  .inspector-card,
  .label-editor-card {
    width: 100%;
  }

  .map-toolbar-strip,
  .map-toolbar-panel {
    width: 100%;
  }

  .label-editor-card {
    max-height: none;
  }

  .label-editor-card--drawer {
    height: auto;
    padding-bottom: 16px;
  }

  .label-form-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .toolbar-mode-grid,
  .label-help-grid {
    grid-template-columns: 1fr;
  }
}
</style>
