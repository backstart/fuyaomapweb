import type { Feature, FeatureCollection, Geometry, Point } from 'geojson';
import type { AreaFeatureCollection, AreaGeoJsonProperties } from '@/types/area';
import type { BoundaryFeatureCollection, BoundaryGeoJsonProperties } from '@/types/boundary';
import type { MapLabel } from '@/types/mapLabel';
import type { MapViewportFeature } from '@/types/mapFeature';
import type { PlaceFeatureCollection, PlaceGeoJsonProperties } from '@/types/place';
import type { PoiFeatureCollection, PoiGeoJsonProperties } from '@/types/poi';
import type { ShopFeatureCollection, ShopGeoJsonProperties } from '@/types/shop';
import { getGeometryCenter, parseGeometryGeoJson } from '@/utils/geometry';

export interface ViewportFeatureCollections {
  labels: MapLabel[];
  shops: ShopFeatureCollection;
  areas: AreaFeatureCollection;
  pois: PoiFeatureCollection;
  places: PlaceFeatureCollection;
  boundaries: BoundaryFeatureCollection;
  rawFeatures: MapViewportFeature[];
}

function createEmptyPointFeatureCollection<TProperties>(): FeatureCollection<Point, TProperties> {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

function createEmptyGeometryFeatureCollection<TProperties>(): FeatureCollection<Geometry, TProperties> {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

function resolveGeometry(item: MapViewportFeature): Geometry | null {
  return parseGeometryGeoJson(item.geometryGeoJson);
}

function resolvePoint(item: MapViewportFeature, geometry?: Geometry | null): [number, number] | null {
  if (typeof item.pointLongitude === 'number' && typeof item.pointLatitude === 'number') {
    return [item.pointLongitude, item.pointLatitude];
  }

  if (geometry?.type === 'Point') {
    return [...geometry.coordinates] as [number, number];
  }

  return geometry ? getGeometryCenter(geometry) : null;
}

function toFeatureId(item: MapViewportFeature): string {
  return item.sourceId?.trim() || String(item.id);
}

function toBusinessId(item: MapViewportFeature): string {
  return String(item.id);
}

function createPointFeature<TProperties>(
  item: MapViewportFeature,
  geometry: Point,
  properties: TProperties
): Feature<Point, TProperties> {
  return {
    type: 'Feature',
    id: toFeatureId(item),
    geometry,
    properties
  };
}

function createGeometryFeature<TProperties>(
  item: MapViewportFeature,
  geometry: Geometry,
  properties: TProperties
): Feature<Geometry, TProperties> {
  return {
    type: 'Feature',
    id: toFeatureId(item),
    geometry,
    properties
  };
}

export function buildViewportFeatureCollections(items: MapViewportFeature[]): ViewportFeatureCollections {
  const labels: MapLabel[] = [];
  const shops = createEmptyPointFeatureCollection<ShopGeoJsonProperties>();
  const areas = createEmptyGeometryFeatureCollection<AreaGeoJsonProperties>();
  const pois = createEmptyPointFeatureCollection<PoiGeoJsonProperties>();
  const places = createEmptyGeometryFeatureCollection<PlaceGeoJsonProperties>();
  const boundaries = createEmptyGeometryFeatureCollection<BoundaryGeoJsonProperties>();
  const rawFeatures: MapViewportFeature[] = [];

  items.forEach((item) => {
    const geometry = resolveGeometry(item);

    switch (item.entityType) {
      case 'label': {
        const point = resolvePoint(item, geometry);
        if (!point) {
          return;
        }

        labels.push({
          id: String(item.id),
          featureType: item.featureType,
          sourceFeatureId: item.sourceFeatureId ?? null,
          sourceLayer: item.sourceLayer ?? null,
          labelType: item.labelType ?? 'business',
          categoryCode: item.categoryCode ?? null,
          categoryName: item.categoryName ?? null,
          typeCode: item.typeCode ?? null,
          typeName: item.typeName ?? null,
          renderType: item.renderType ?? null,
          geometryType: item.geometryType || 'point',
          originalName: item.originalName ?? null,
          displayName: item.displayName,
          aliasNames: item.aliasNames,
          pointLongitude: point[0],
          pointLatitude: point[1],
          lng: point[0],
          lat: point[1],
          minZoom: item.minZoom,
          maxZoom: item.maxZoom,
          priority: item.priority,
          textColor: item.textColor ?? null,
          haloColor: item.haloColor ?? null,
          status: item.status,
          source: item.source ?? null,
          remark: item.remark ?? null,
          updateTime: item.updateTime
        });
        return;
      }
      case 'shop': {
        const point = resolvePoint(item, geometry);
        if (!point) {
          return;
        }

        shops.features.push(createPointFeature(item, {
          type: 'Point',
          coordinates: point
        }, {
          name: item.displayName,
          category: item.classification ?? null,
          categoryCode: item.categoryCode ?? null,
          categoryName: item.categoryName ?? null,
          typeCode: item.typeCode ?? null,
          typeName: item.typeName ?? null,
          renderType: item.renderType ?? null,
          geometryType: 'point',
          remark: item.remark ?? null,
          icon: item.icon ?? null,
          businessId: toBusinessId(item),
          sourceId: item.sourceId ?? null,
          status: item.status
        }));
        return;
      }
      case 'poi': {
        const point = resolvePoint(item, geometry);
        if (!point) {
          return;
        }

        pois.features.push(createPointFeature(item, {
          type: 'Point',
          coordinates: point
        }, {
          name: item.displayName,
          category: item.classification ?? null,
          subcategory: item.subclassification ?? null,
          categoryCode: item.categoryCode ?? null,
          categoryName: item.categoryName ?? null,
          typeCode: item.typeCode ?? null,
          typeName: item.typeName ?? null,
          renderType: item.renderType ?? null,
          geometryType: 'point',
          remark: item.remark ?? null,
          icon: item.icon ?? null,
          address: item.address ?? null,
          phone: item.phone ?? null,
          businessId: toBusinessId(item),
          sourceId: item.sourceId ?? null,
          status: item.status
        }));
        return;
      }
      case 'area': {
        if (item.sourceType === 'drawn-building' || !geometry) {
          return;
        }

        areas.features.push(createGeometryFeature(item, geometry, {
          name: item.displayName,
          type: item.classification ?? null,
          categoryCode: item.categoryCode ?? null,
          categoryName: item.categoryName ?? null,
          typeCode: item.typeCode ?? null,
          typeName: item.typeName ?? null,
          renderType: item.renderType ?? null,
          geometryType: item.geometryType,
          remark: item.remark ?? null,
          styleJson: item.styleJson ?? null,
          status: item.status,
          businessId: toBusinessId(item),
          sourceType: item.sourceType ?? null,
          sourceId: item.sourceId ?? null,
          geometryGeoJson: item.geometryGeoJson ?? null,
          updateTime: item.updateTime
        }));
        return;
      }
      case 'place': {
        if (!geometry) {
          return;
        }

        const point = resolvePoint(item, geometry);
        places.features.push(createGeometryFeature(item, geometry, {
          name: item.displayName,
          placeType: item.classification ?? null,
          adminLevel: item.adminLevel ?? null,
          categoryCode: item.categoryCode ?? null,
          categoryName: item.categoryName ?? null,
          typeCode: item.typeCode ?? null,
          typeName: item.typeName ?? null,
          renderType: item.renderType ?? null,
          geometryType: item.geometryType,
          remark: item.remark ?? null,
          status: item.status,
          businessId: toBusinessId(item),
          sourceId: item.sourceId ?? null,
          centerLongitude: point?.[0] ?? null,
          centerLatitude: point?.[1] ?? null,
          geometryGeoJson: item.geometryGeoJson ?? null
        }));
        return;
      }
      case 'boundary': {
        if (!geometry) {
          return;
        }

        boundaries.features.push(createGeometryFeature(item, geometry, {
          name: item.displayName,
          boundaryType: item.classification ?? null,
          adminLevel: item.adminLevel ?? null,
          categoryCode: item.categoryCode ?? null,
          categoryName: item.categoryName ?? null,
          typeCode: item.typeCode ?? null,
          typeName: item.typeName ?? null,
          renderType: item.renderType ?? null,
          geometryType: item.geometryType,
          remark: item.remark ?? null,
          styleJson: item.styleJson ?? null,
          status: item.status,
          businessId: toBusinessId(item),
          sourceId: item.sourceId ?? null,
          geometryGeoJson: item.geometryGeoJson ?? null
        }));
        return;
      }
      case 'road':
      case 'water':
      case 'building':
        rawFeatures.push(item);
        return;
    }
  });

  return {
    labels,
    shops,
    areas,
    pois,
    places,
    boundaries,
    rawFeatures
  };
}
