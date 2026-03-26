import { appConfig } from '@/config/appConfig';
import type { MapViewportState } from '@/types/map';

export interface MapViewState {
  center: [number, number];
  zoom: number;
}

export interface InitialMapViewResolution {
  initialView: MapViewState;
  source: 'url' | 'session' | 'fallback';
  pendingLocatedView?: Promise<MapViewState | null>;
}

export const ZHONGSHAN_DEFAULT_CENTER: [number, number] = [113.3926, 22.5159];
export const ZHONGSHAN_DEFAULT_ZOOM = 11.8;
export const IP_LOCATED_DEFAULT_ZOOM = 13.5;
export const IP_LOCATE_TIMEOUT_MS = 1800;

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidLongitude(value: number | null): value is number {
  return typeof value === 'number' && value >= -180 && value <= 180;
}

function isValidLatitude(value: number | null): value is number {
  return typeof value === 'number' && value >= -90 && value <= 90;
}

function normalizeCenter(longitude: number | null, latitude: number | null): [number, number] | null {
  if (!isValidLongitude(longitude) || !isValidLatitude(latitude)) {
    return null;
  }

  return [longitude, latitude];
}

function normalizeZoom(value: number | null, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(20, Math.max(3, value));
}

function getFallbackMapView(): MapViewState {
  return {
    center: ZHONGSHAN_DEFAULT_CENTER,
    zoom: ZHONGSHAN_DEFAULT_ZOOM
  };
}

function resolveUrlMapView(search?: string): MapViewState | null {
  if (typeof window === 'undefined' && !search) {
    return null;
  }

  const queryString = typeof search === 'string' ? search : window.location.search;
  const searchParams = new URLSearchParams(queryString);
  const centerText = searchParams.get('center');
  const zoomText = searchParams.get('zoom');

  if (!centerText && !zoomText) {
    return null;
  }

  const centerParts = centerText?.split(',', 2) ?? [];
  const center = normalizeCenter(
    parseFiniteNumber(centerParts[0]),
    parseFiniteNumber(centerParts[1])
  );
  const zoom = normalizeZoom(parseFiniteNumber(zoomText), ZHONGSHAN_DEFAULT_ZOOM);

  if (center) {
    return {
      center,
      zoom
    };
  }

  return {
    center: ZHONGSHAN_DEFAULT_CENTER,
    zoom
  };
}

function resolvePersistedViewport(viewport?: MapViewportState | null): MapViewState | null {
  if (!viewport?.bbox || !viewport.center || viewport.center.length !== 2) {
    return null;
  }

  const center = normalizeCenter(viewport.center[0], viewport.center[1]);
  if (!center) {
    return null;
  }

  return {
    center,
    zoom: normalizeZoom(parseFiniteNumber(viewport.zoom), ZHONGSHAN_DEFAULT_ZOOM)
  };
}

function unwrapLocatePayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const record = payload as Record<string, unknown>;
  if (record.success === false) {
    return null;
  }

  return record.data ?? record.result ?? record.payload ?? record.location ?? record;
}

function normalizeLocatedView(payload: unknown): MapViewState | null {
  const candidate = unwrapLocatePayload(payload);
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  const centerArray = Array.isArray(record.center) ? record.center : null;
  const longitude = parseFiniteNumber(record.lng ?? record.longitude ?? centerArray?.[0]);
  const latitude = parseFiniteNumber(record.lat ?? record.latitude ?? centerArray?.[1]);
  const center = normalizeCenter(longitude, latitude);
  if (!center) {
    return null;
  }

  return {
    center,
    zoom: normalizeZoom(
      parseFiniteNumber(record.zoom ?? record.centerZoom),
      IP_LOCATED_DEFAULT_ZOOM
    )
  };
}

async function resolveVisitorLocatedMapView(): Promise<MapViewState | null> {
  const locateUrl = appConfig.mapIpLocateUrl.trim();
  if (!locateUrl || typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, IP_LOCATE_TIMEOUT_MS);

  try {
    const response = await window.fetch(locateUrl, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }

    return normalizeLocatedView(await response.json());
  } catch (error) {
    console.warn(
      `[map] failed to resolve visitor location from ${locateUrl}, fallback to Zhongshan.`,
      error
    );
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function resolveInitialMapView(options?: {
  persistedViewport?: MapViewportState | null;
  search?: string;
}): InitialMapViewResolution {
  const urlView = resolveUrlMapView(options?.search);
  if (urlView) {
    return {
      initialView: urlView,
      source: 'url'
    };
  }

  const persistedView = resolvePersistedViewport(options?.persistedViewport);
  if (persistedView) {
    return {
      initialView: persistedView,
      source: 'session'
    };
  }

  const fallbackView = getFallbackMapView();
  const pendingLocatedView = appConfig.mapIpLocateUrl.trim()
    ? resolveVisitorLocatedMapView()
    : undefined;

  return {
    initialView: fallbackView,
    source: 'fallback',
    pendingLocatedView
  };
}
