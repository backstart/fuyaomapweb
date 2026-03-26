interface RuntimeAppConfig {
  API_BASE_URL?: string;
  PMTILES_URL?: string;
  MAP_STYLE_URL?: string;
  MAP_IP_LOCATE_URL?: string;
}

function readRuntimeConfig(): RuntimeAppConfig {
  if (typeof window === 'undefined') {
    return {};
  }

  return window.__APP_CONFIG__ ?? {};
}

function pickConfigValue(...values: Array<string | undefined>): string {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

// 统一收口运行时配置：
// 1. 开发环境优先 Vite env，便于本地直接连后端/底图
// 2. 生产环境优先 window.__APP_CONFIG__，便于部署后只改 app-config.js
// 3. 最后使用项目默认值
export const appConfig = {
  get apiBaseUrl(): string {
    const runtimeConfig = readRuntimeConfig();
    if (import.meta.env.DEV) {
      return pickConfigValue(import.meta.env.VITE_API_BASE_URL, runtimeConfig.API_BASE_URL, '/api');
    }

    return pickConfigValue(runtimeConfig.API_BASE_URL, import.meta.env.VITE_API_BASE_URL, '/api');
  },

  get pmtilesUrl(): string {
    const runtimeConfig = readRuntimeConfig();
    if (import.meta.env.DEV) {
      return pickConfigValue(import.meta.env.VITE_PMTILES_URL, runtimeConfig.PMTILES_URL, '/tiles/city.pmtiles');
    }

    return pickConfigValue(runtimeConfig.PMTILES_URL, import.meta.env.VITE_PMTILES_URL, '/tiles/city.pmtiles');
  },

  get mapStyleUrl(): string {
    const runtimeConfig = readRuntimeConfig();
    if (import.meta.env.DEV) {
      return pickConfigValue(import.meta.env.VITE_MAP_STYLE_URL, runtimeConfig.MAP_STYLE_URL, '/map-resources/styles/amap-like.json');
    }

    return pickConfigValue(runtimeConfig.MAP_STYLE_URL, import.meta.env.VITE_MAP_STYLE_URL, '/map-resources/styles/amap-like.json');
  },

  get mapIpLocateUrl(): string {
    const runtimeConfig = readRuntimeConfig();
    if (import.meta.env.DEV) {
      return pickConfigValue(import.meta.env.VITE_MAP_IP_LOCATE_URL, runtimeConfig.MAP_IP_LOCATE_URL, '');
    }

    return pickConfigValue(runtimeConfig.MAP_IP_LOCATE_URL, import.meta.env.VITE_MAP_IP_LOCATE_URL, '');
  }
};
