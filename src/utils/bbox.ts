import type { LngLatBounds } from 'maplibre-gl';

// Backend bbox format is `minLng,minLat,maxLng,maxLat`, rounded to keep query strings stable.
export function boundsToBboxString(bounds: LngLatBounds): string {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  return [
    southWest.lng.toFixed(6),
    southWest.lat.toFixed(6),
    northEast.lng.toFixed(6),
    northEast.lat.toFixed(6)
  ].join(',');
}
