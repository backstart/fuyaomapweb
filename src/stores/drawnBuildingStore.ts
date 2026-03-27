import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { EntityId } from '@/types/entity';
import type { BuildingDrawMode, DrawnBuildingArea } from '@/types/drawnBuilding';
import {
  DEFAULT_DRAWN_BUILDING_FILL,
  DEFAULT_DRAWN_BUILDING_LINE,
  DEFAULT_DRAWN_BUILDING_LINE_WIDTH,
  getGeometryLabelPoint
} from '@/utils/drawnBuildings';
import { DEFAULT_DRAWN_BUILDING_TYPE_CODE } from '@/utils/mapFeatureTypes';

let areaSequence = 1;

function createAreaId(): string {
  areaSequence += 1;
  return `drawn-building-${Date.now()}-${areaSequence}`;
}

function createDefaultName(index: number): string {
  return `新建筑${index}`;
}

export const useDrawnBuildingStore = defineStore('drawn-buildings', () => {
  const areas = ref<DrawnBuildingArea[]>([]);
  const drawMode = ref<BuildingDrawMode>(null);
  const selectedAreaId = ref<string | null>(null);

  const selectedArea = computed(() =>
    selectedAreaId.value ? areas.value.find((item) => String(item.id) === selectedAreaId.value) ?? null : null
  );

  function startDraw(mode: Exclude<BuildingDrawMode, null>): void {
    drawMode.value = mode;
  }

  function cancelDraw(): void {
    drawMode.value = null;
  }

  function selectArea(id: EntityId | null): void {
    selectedAreaId.value = id === null ? null : String(id);
  }

  function clearSelection(): void {
    selectedAreaId.value = null;
  }

  function createArea(payload: {
    geometryGeoJson: string;
    labelLongitude?: number;
    labelLatitude?: number;
    shapeType: Exclude<BuildingDrawMode, null>;
  }): DrawnBuildingArea {
    const labelPoint =
      typeof payload.labelLongitude === 'number' && typeof payload.labelLatitude === 'number'
        ? [payload.labelLongitude, payload.labelLatitude] as [number, number]
        : getGeometryLabelPoint(payload.geometryGeoJson);
    const now = new Date().toISOString();
    const nextArea: DrawnBuildingArea = {
      id: createAreaId(),
      name: createDefaultName(areas.value.length + 1),
      buildingType: payload.shapeType === 'rectangle' ? '矩形建筑' : '自定义建筑',
      categoryCode: 'building_campus',
      categoryName: '建筑与园区',
      typeCode: DEFAULT_DRAWN_BUILDING_TYPE_CODE,
      typeName: '楼栋',
      renderType: 'polygon-fill',
      buildingCode: '',
      geometryGeoJson: payload.geometryGeoJson,
      labelLongitude: labelPoint[0],
      labelLatitude: labelPoint[1],
      fillColor: DEFAULT_DRAWN_BUILDING_FILL,
      lineColor: DEFAULT_DRAWN_BUILDING_LINE,
      lineWidth: DEFAULT_DRAWN_BUILDING_LINE_WIDTH,
      status: 1,
      remark: '',
      shapeType: payload.shapeType,
      isDraft: true,
      createTime: now,
      updateTime: now
    };

    areas.value = [...areas.value, nextArea];
    drawMode.value = null;
    selectArea(nextArea.id);
    return nextArea;
  }

  function updateArea(id: EntityId, patch: Partial<DrawnBuildingArea>): DrawnBuildingArea | null {
    const targetId = String(id);
    const index = areas.value.findIndex((item) => String(item.id) === targetId);
    if (index < 0) {
      return null;
    }

    const nextArea: DrawnBuildingArea = {
      ...areas.value[index],
      ...patch,
      id: areas.value[index].id,
      updateTime: new Date().toISOString()
    };

    areas.value.splice(index, 1, nextArea);
    return nextArea;
  }

  function replaceArea(id: EntityId, nextArea: DrawnBuildingArea): DrawnBuildingArea {
    const targetId = String(id);
    const index = areas.value.findIndex((item) => String(item.id) === targetId);
    if (index < 0) {
      areas.value = [...areas.value, nextArea];
    } else {
      areas.value.splice(index, 1, nextArea);
    }

    selectedAreaId.value = String(nextArea.id);
    return nextArea;
  }

  function replacePersistedAreas(persistedAreas: DrawnBuildingArea[]): void {
    const drafts = areas.value.filter((item) => item.isDraft);
    const nextAreas = [...drafts];
    const existingIds = new Set(nextAreas.map((item) => String(item.id)));

    persistedAreas.forEach((item) => {
      const itemId = String(item.id);
      if (existingIds.has(itemId)) {
        return;
      }

      nextAreas.push(item);
      existingIds.add(itemId);
    });

    areas.value = nextAreas;

    if (selectedAreaId.value && !areas.value.some((item) => String(item.id) === selectedAreaId.value)) {
      selectedAreaId.value = null;
    }
  }

  function removeArea(id: EntityId): void {
    const targetId = String(id);
    areas.value = areas.value.filter((item) => String(item.id) !== targetId);

    if (selectedAreaId.value === targetId) {
      selectedAreaId.value = null;
    }
  }

  return {
    areas,
    drawMode,
    selectedAreaId,
    selectedArea,
    startDraw,
    cancelDraw,
    selectArea,
    clearSelection,
    createArea,
    updateArea,
    replaceArea,
    replacePersistedAreas,
    removeArea
  };
});
