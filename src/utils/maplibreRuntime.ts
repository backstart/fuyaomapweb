import maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker.js?url';

type MapLibreModule = typeof import('maplibre-gl');
type ProtocolHandler = NonNullable<MapLibreModule['addProtocol']> extends (name: string, handler: infer T) => unknown ? T : (...args: unknown[]) => unknown;

const registeredProtocolNames = new Set<string>();
export const maplibreglRuntime = maplibregl as MapLibreModule;
let runtimeConfigured = false;

export function ensureMapLibreRuntime(): void {
  if (runtimeConfigured) {
    return;
  }

  if (typeof maplibreglRuntime.setWorkerUrl === 'function') {
    maplibreglRuntime.setWorkerUrl(maplibreWorkerUrl);
  } else if (maplibreglRuntime.config && typeof maplibreglRuntime.config === 'object') {
    maplibreglRuntime.config.WORKER_URL = maplibreWorkerUrl;
  }

  runtimeConfigured = true;
}

export function registerMapLibreProtocol(name: string, handler: ProtocolHandler): void {
  if (registeredProtocolNames.has(name)) {
    return;
  }

  if (typeof maplibreglRuntime.addProtocol !== 'function') {
    throw new Error(`MapLibre protocol registration is unavailable for ${name}.`);
  }

  maplibreglRuntime.addProtocol(name, handler);
  registeredProtocolNames.add(name);
}
