import type * as MapLibreTypes from 'maplibre-gl';
import maplibreglImport from 'maplibre-gl/dist/maplibre-gl-csp.js';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker.js?url';

type MapLibreModule = typeof MapLibreTypes;

export const maplibregl = maplibreglImport as unknown as MapLibreModule;

let workerConfigured = false;

export function ensureMapLibreRuntime(): void {
  if (workerConfigured) {
    return;
  }

  if (typeof maplibregl.setWorkerUrl === 'function') {
    maplibregl.setWorkerUrl(maplibreWorkerUrl);
  } else if (maplibregl.config && typeof maplibregl.config === 'object') {
    maplibregl.config.WORKER_URL = maplibreWorkerUrl;
  }

  workerConfigured = true;
}

export function getMapLibreRegisteredProtocols(): Record<string, unknown> | null {
  return maplibregl.config?.REGISTERED_PROTOCOLS ?? null;
}
