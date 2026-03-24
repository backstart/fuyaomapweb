import maplibregl from 'maplibre-gl/dist/maplibre-gl-csp.js';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker.js?url';

type MapLibreModule = typeof import('maplibre-gl');
type ProtocolHandler = NonNullable<MapLibreModule['addProtocol']> extends (name: string, handler: infer T) => unknown ? T : (...args: unknown[]) => unknown;

const registeredProtocolNames = new Set<string>();

export { maplibregl };

export function ensureMapLibreRuntime(): void {
  if (typeof maplibregl.setWorkerUrl === 'function') {
    maplibregl.setWorkerUrl(maplibreWorkerUrl);
  }
}

export function registerMapLibreProtocol(name: string, handler: ProtocolHandler): void {
  if (registeredProtocolNames.has(name)) {
    return;
  }

  if (typeof maplibregl.addProtocol !== 'function') {
    throw new Error(`MapLibre protocol registration is unavailable for ${name}.`);
  }

  maplibregl.addProtocol(name, handler);
  registeredProtocolNames.add(name);
}
