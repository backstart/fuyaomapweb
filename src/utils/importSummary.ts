import type { MapImportExtractionSummary, MapImportTaskLog } from '@/types/import';

function toNumber(rawValue?: string): number {
  if (!rawValue) {
    return 0;
  }

  return Number(rawValue.replace(/,/g, ''));
}

function createEmptySummary(): MapImportExtractionSummary {
  return {
    rawFeatures: 0,
    shops: 0,
    areas: 0,
    pois: 0,
    places: 0,
    boundaries: 0,
    importRecords: 0,
    unnamedSkipped: 0,
    invalidGeometry: 0,
    failed: 0
  };
}

export function parseImportSummary(logs: MapImportTaskLog[]): MapImportExtractionSummary {
  const summary = createEmptySummary();
  const finalSummaryLog = [...logs].reverse().find((log) => log.message.includes('OSM 导入完成：'));

  if (finalSummaryLog) {
    const match = finalSummaryLog.message.match(
      /原始要素\s+([\d,]+).*?店铺\s+([\d,]+).*?区域\s+([\d,]+).*?POI\s+([\d,]+).*?地名\s+([\d,]+).*?边界\s+([\d,]+).*?映射\s+([\d,]+).*?无名称跳过\s+([\d,]+).*?几何无效\s+([\d,]+).*?失败\s+([\d,]+)/
    );

    if (match) {
      summary.rawFeatures = toNumber(match[1]);
      summary.shops = toNumber(match[2]);
      summary.areas = toNumber(match[3]);
      summary.pois = toNumber(match[4]);
      summary.places = toNumber(match[5]);
      summary.boundaries = toNumber(match[6]);
      summary.importRecords = toNumber(match[7]);
      summary.unnamedSkipped = toNumber(match[8]);
      summary.invalidGeometry = toNumber(match[9]);
      summary.failed = toNumber(match[10]);
      return summary;
    }
  }

  for (const log of logs) {
    const rawMatch = log.message.match(/累计原始要素\s+([\d,]+)\s+条/);
    if (rawMatch) {
      summary.rawFeatures = Math.max(summary.rawFeatures, toNumber(rawMatch[1]));
    }

    const batchMatch = log.message.match(/抽取(店铺|区域|POI|地名|边界)数据批次写入成功：新增\s+([\d,]+)，更新\s+([\d,]+)，映射\s+([\d,]+)/);
    if (batchMatch) {
      const total = toNumber(batchMatch[2]) + toNumber(batchMatch[3]);
      const importRecords = toNumber(batchMatch[4]);
      switch (batchMatch[1]) {
        case '店铺':
          summary.shops += total;
          break;
        case '区域':
          summary.areas += total;
          break;
        case 'POI':
          summary.pois += total;
          break;
        case '地名':
          summary.places += total;
          break;
        case '边界':
          summary.boundaries += total;
          break;
      }
      summary.importRecords += importRecords;
    }

    const unnamedMatch = log.message.match(/已累计跳过\s+([\d,]+)\s+个命中规则但无可用名称的对象/);
    if (unnamedMatch) {
      summary.unnamedSkipped = Math.max(summary.unnamedSkipped, toNumber(unnamedMatch[1]));
    }

    const invalidMatch = log.message.match(/已累计跳过\s+([\d,]+)\s+个几何无效或结构不完整/);
    if (invalidMatch) {
      summary.invalidGeometry = Math.max(summary.invalidGeometry, toNumber(invalidMatch[1]));
    }
  }

  return summary;
}
