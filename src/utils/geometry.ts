import type { Geometry, Position } from 'geojson';

export function parseGeometryGeoJson(geometryGeoJson?: string | null): Geometry | null {
  if (!geometryGeoJson) {
    return null;
  }

  try {
    return JSON.parse(geometryGeoJson) as Geometry;
  } catch (error) {
    console.warn('Failed to parse geometry geojson.', error);
    return null;
  }
}

function visitCoordinates(value: unknown, callback: (coordinate: Position) => void): void {
  if (!Array.isArray(value)) {
    return;
  }

  if (typeof value[0] === 'number' && typeof value[1] === 'number') {
    callback(value as Position);
    return;
  }

  for (const item of value) {
    visitCoordinates(item, callback);
  }
}

function visitGeometry(geometry: Geometry, callback: (coordinate: Position) => void): void {
  if (geometry.type === 'GeometryCollection') {
    for (const item of geometry.geometries) {
      visitGeometry(item, callback);
    }
    return;
  }

  visitCoordinates(geometry.coordinates, callback);
}

export function getGeometryBounds(geometry: Geometry): [[number, number], [number, number]] | null {
  let minLongitude = Number.POSITIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;

  visitGeometry(geometry, ([longitude, latitude]) => {
    minLongitude = Math.min(minLongitude, longitude);
    minLatitude = Math.min(minLatitude, latitude);
    maxLongitude = Math.max(maxLongitude, longitude);
    maxLatitude = Math.max(maxLatitude, latitude);
  });

  if (!Number.isFinite(minLongitude) || !Number.isFinite(minLatitude)) {
    return null;
  }

  return [
    [minLongitude, minLatitude],
    [maxLongitude, maxLatitude]
  ];
}

export function getGeometryCenter(geometry: Geometry): [number, number] | null {
  const bounds = getGeometryBounds(geometry);
  if (!bounds) {
    return null;
  }

  return [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2
  ];
}
