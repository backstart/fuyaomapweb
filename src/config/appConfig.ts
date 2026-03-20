interface RuntimeAppConfig {
  API_BASE_URL?: string;
  PMTILES_URL?: string;
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
// 1. 优先 window.__APP_CONFIG__，适合生产环境直接改 app-config.js
// 2. 再回退到 Vite env，适合本地开发
// 3. 最后使用项目默认值
export const appConfig = {
  get apiBaseUrl(): string {
    const runtimeConfig = readRuntimeConfig();
    return pickConfigValue(runtimeConfig.API_BASE_URL, import.meta.env.VITE_API_BASE_URL, '/api');
  },

  get pmtilesUrl(): string {
    const runtimeConfig = readRuntimeConfig();
    return pickConfigValue(runtimeConfig.PMTILES_URL, import.meta.env.VITE_PMTILES_URL, '/tiles/city.pmtiles');
  }
};
