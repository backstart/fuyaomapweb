import type {
  FilterSpecification,
  LayerSpecification,
  LineLayerSpecification,
  StyleSpecification,
  SymbolLayerSpecification
} from 'maplibre-gl';

export const BASEMAP_SOURCE_ID = 'pmtiles-basemap';

type GeometryType = 'Polygon' | 'LineString' | 'Point';

const LABEL_NAME_FIELDS = ['name:zh', 'name', 'name_en', 'ref'] as const;
const LABEL_SURFACE_GEOMETRIES: GeometryType[] = ['Point', 'Polygon'];
const PLACE_LAYER_CANDIDATES = ['place', 'places', 'place_label'] as const;
const ROAD_LABEL_LAYER_CANDIDATES = ['transportation_name', 'transportation', 'road', 'roads'] as const;
const POI_LAYER_CANDIDATES = ['poi', 'pois', 'poi_label'] as const;

const GREEN_CLASSES = [
  'grass',
  'park',
  'garden',
  'forest',
  'wood',
  'nature_reserve',
  'golf_course',
  'meadow'
];

const MAJOR_ROAD_CLASSES = ['motorway', 'trunk'];
const PRIMARY_ROAD_CLASSES = ['primary'];
const SECONDARY_ROAD_CLASSES = ['secondary', 'tertiary'];
const LOCAL_ROAD_CLASSES = ['minor', 'residential', 'service', 'street', 'unclassified', 'living_street'];
const PATH_CLASSES = ['path', 'track', 'pedestrian', 'footway', 'cycleway'];
const RAIL_CLASSES = ['rail', 'transit', 'major_rail', 'minor_rail', 'service_rail'];

interface BasemapLayerSelection {
  waterLayer: string | null;
  waterwayLayer: string | null;
  landcoverLayer: string | null;
  transportationLayer: string | null;
  roadLabelLayer: string | null;
  boundaryLayer: string | null;
  buildingLayer: string | null;
  placeLayer: string | null;
  poiLayer: string | null;
}

interface SymbolLayerOptions {
  id: string;
  sourceLayer: string;
  filter: FilterSpecification;
  minzoom?: number;
  layout: SymbolLayerSpecification['layout'];
  paint: SymbolLayerSpecification['paint'];
}

export interface AmapLikePmtilesStyleOptions {
  styleName?: string;
  sourceAttribution?: string;
  center?: [number, number];
  zoom?: number;
}

function pickSourceLayer(sourceLayers: string[], candidates: readonly string[]): string | null {
  return candidates.find((candidate) => sourceLayers.includes(candidate)) ?? null;
}

function geometryFilter(geometryType: GeometryType): FilterSpecification {
  return ['==', ['geometry-type'], geometryType] as unknown as FilterSpecification;
}

function geometryTypesFilter(geometryTypes: GeometryType[]): FilterSpecification {
  return ['match', ['geometry-type'], geometryTypes, true, false] as unknown as FilterSpecification;
}

function matchProperty(property: string, values: readonly string[]): FilterSpecification {
  return ['match', ['get', property], values, true, false] as unknown as FilterSpecification;
}

function matchAnyProperty(properties: readonly string[], values: readonly string[]): FilterSpecification {
  return ['any', ...properties.map((property) => matchProperty(property, values))] as unknown as FilterSpecification;
}

function hasAnyPropertyFilter(properties: readonly string[]): FilterSpecification {
  return ['any', ...properties.map((property) => ['has', property])] as unknown as FilterSpecification;
}

function notFilter(filter: FilterSpecification): FilterSpecification {
  return ['!', filter] as unknown as FilterSpecification;
}

function allFilters(...filters: Array<FilterSpecification | null | undefined>): FilterSpecification {
  return ['all', ...filters.filter((filter): filter is FilterSpecification => Boolean(filter))] as unknown as FilterSpecification;
}

function createLineLayer(
  id: string,
  sourceLayer: string,
  filter: FilterSpecification,
  paint: LineLayerSpecification['paint'],
  minzoom?: number
): LayerSpecification {
  return {
    id,
    type: 'line',
    source: BASEMAP_SOURCE_ID,
    'source-layer': sourceLayer,
    filter,
    minzoom,
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint
  };
}

function createSymbolLayer(options: SymbolLayerOptions): LayerSpecification {
  return {
    id: options.id,
    type: 'symbol',
    source: BASEMAP_SOURCE_ID,
    'source-layer': options.sourceLayer,
    filter: options.filter,
    minzoom: options.minzoom,
    layout: options.layout,
    paint: options.paint
  };
}

function buildLabelTextField(properties: readonly string[]): NonNullable<SymbolLayerSpecification['layout']>['text-field'] {
  return ['coalesce', ...properties.map((property) => ['get', property]), ''] as unknown as NonNullable<
    SymbolLayerSpecification['layout']
  >['text-field'];
}

function buildNamedSurfaceFilter(): FilterSpecification {
  return allFilters(
    geometryTypesFilter(LABEL_SURFACE_GEOMETRIES),
    hasAnyPropertyFilter(LABEL_NAME_FIELDS)
  );
}

function buildRoadLabelFilter(): FilterSpecification {
  return allFilters(
    geometryFilter('LineString'),
    hasAnyPropertyFilter(LABEL_NAME_FIELDS),
    notFilter(matchAnyProperty(['class', 'subclass'], RAIL_CLASSES))
  );
}

function selectBasemapLayers(sourceLayers: string[]): BasemapLayerSelection {
  return {
    waterLayer: pickSourceLayer(sourceLayers, ['water', 'water_polygon']),
    waterwayLayer: pickSourceLayer(sourceLayers, ['waterway', 'water_line']),
    landcoverLayer: pickSourceLayer(sourceLayers, ['landcover', 'landuse']),
    transportationLayer: pickSourceLayer(sourceLayers, ['transportation', 'roads', 'road']),
    roadLabelLayer: pickSourceLayer(sourceLayers, ROAD_LABEL_LAYER_CANDIDATES),
    boundaryLayer: pickSourceLayer(sourceLayers, ['boundary', 'boundaries', 'admin']),
    buildingLayer: pickSourceLayer(sourceLayers, ['building', 'buildings', 'structure']),
    placeLayer: pickSourceLayer(sourceLayers, PLACE_LAYER_CANDIDATES),
    poiLayer: pickSourceLayer(sourceLayers, POI_LAYER_CANDIDATES)
  };
}

function appendLandscapeLayers(layers: LayerSpecification[], layerSelection: BasemapLayerSelection): void {
  if (layerSelection.landcoverLayer) {
    layers.push({
      id: 'landcover-green',
      type: 'fill',
      source: BASEMAP_SOURCE_ID,
      'source-layer': layerSelection.landcoverLayer,
      filter: allFilters(
        geometryFilter('Polygon'),
        matchAnyProperty(['class', 'subclass'], GREEN_CLASSES)
      ),
      minzoom: 4,
      paint: {
        'fill-color': '#dfead6',
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 0.44,
          9, 0.56,
          14, 0.68
        ]
      }
    });
  }

  if (layerSelection.waterLayer) {
    layers.push({
      id: 'water-fill',
      type: 'fill',
      source: BASEMAP_SOURCE_ID,
      'source-layer': layerSelection.waterLayer,
      filter: geometryFilter('Polygon'),
      paint: {
        'fill-color': '#cfe3f5',
        'fill-opacity': 0.96
      }
    });
  }

  if (layerSelection.waterwayLayer) {
    layers.push(createLineLayer(
      'waterway-line',
      layerSelection.waterwayLayer,
      geometryFilter('LineString'),
      {
        'line-color': '#b8d4ee',
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0.35,
          10, 0.62,
          15, 0.86
        ],
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0.4,
          11, 1.15,
          16, 2.1
        ]
      },
      7
    ));
  }

  if (layerSelection.boundaryLayer) {
    layers.push(createLineLayer(
      'boundary-line',
      layerSelection.boundaryLayer,
      geometryFilter('LineString'),
      {
        'line-color': '#ccd2da',
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 0.16,
          8, 0.3,
          12, 0.5
        ],
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 0.45,
          8, 0.8,
          12, 1.2
        ],
        'line-dasharray': [2, 2]
      },
      4
    ));
  }
}

function appendTransportationLayers(layers: LayerSpecification[], transportationLayer: string | null): void {
  if (!transportationLayer) {
    return;
  }

  const lineGeometry = geometryFilter('LineString');
  const majorRoadFilter = allFilters(lineGeometry, matchAnyProperty(['class', 'subclass'], MAJOR_ROAD_CLASSES));
  const primaryRoadFilter = allFilters(lineGeometry, matchAnyProperty(['class', 'subclass'], PRIMARY_ROAD_CLASSES));
  const secondaryRoadFilter = allFilters(lineGeometry, matchAnyProperty(['class', 'subclass'], SECONDARY_ROAD_CLASSES));
  const localRoadFilter = allFilters(lineGeometry, matchAnyProperty(['class', 'subclass'], LOCAL_ROAD_CLASSES));
  const pathRoadFilter = allFilters(lineGeometry, matchAnyProperty(['class', 'subclass'], PATH_CLASSES));
  const railFilter = allFilters(lineGeometry, matchAnyProperty(['class', 'subclass'], RAIL_CLASSES));

  layers.push(
    createLineLayer(
      'road-major-casing',
      transportationLayer,
      majorRoadFilter,
      {
        'line-color': '#d7dbe3',
        'line-opacity': 0.88,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, 1.3,
          9, 2.4,
          13, 6.8,
          17, 14
        ]
      },
      5
    ),
    createLineLayer(
      'road-major-fill',
      transportationLayer,
      majorRoadFilter,
      {
        'line-color': '#ffffff',
        'line-opacity': 0.96,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, 0.8,
          9, 1.7,
          13, 5.6,
          17, 12
        ]
      },
      5
    ),
    createLineLayer(
      'road-primary-casing',
      transportationLayer,
      primaryRoadFilter,
      {
        'line-color': '#dde1e7',
        'line-opacity': 0.86,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 1.05,
          11, 1.9,
          15, 8,
          17, 11
        ]
      },
      8
    ),
    createLineLayer(
      'road-primary-fill',
      transportationLayer,
      primaryRoadFilter,
      {
        'line-color': '#ffffff',
        'line-opacity': 0.96,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 0.64,
          11, 1.3,
          15, 6.6,
          17, 9.8
        ]
      },
      8
    ),
    createLineLayer(
      'road-secondary-casing',
      transportationLayer,
      secondaryRoadFilter,
      {
        'line-color': '#e3e6eb',
        'line-opacity': 0.82,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 0.9,
          13, 1.5,
          16, 5.8
        ]
      },
      10
    ),
    createLineLayer(
      'road-secondary-fill',
      transportationLayer,
      secondaryRoadFilter,
      {
        'line-color': '#ffffff',
        'line-opacity': 0.94,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 0.48,
          13, 1.05,
          16, 4.6
        ]
      },
      10
    ),
    createLineLayer(
      'road-local-casing',
      transportationLayer,
      localRoadFilter,
      {
        'line-color': '#eaedf1',
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          13, 0.45,
          16, 0.82
        ],
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          13, 0.7,
          16, 3.2,
          18, 5
        ]
      },
      13
    ),
    createLineLayer(
      'road-local-fill',
      transportationLayer,
      localRoadFilter,
      {
        'line-color': '#ffffff',
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          13, 0.6,
          16, 0.94
        ],
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          13, 0.42,
          16, 2.4,
          18, 3.9
        ]
      },
      13
    ),
    createLineLayer(
      'road-path',
      transportationLayer,
      pathRoadFilter,
      {
        'line-color': '#d7dbe0',
        'line-opacity': 0.82,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15, 0.7,
          18, 1.5
        ],
        'line-dasharray': [1.4, 1.2]
      },
      15
    ),
    createLineLayer(
      'rail-line',
      transportationLayer,
      railFilter,
      {
        'line-color': '#c3c9d1',
        'line-opacity': 0.72,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 0.8,
          14, 1.8,
          17, 2.7
        ],
        'line-dasharray': [2.2, 1.4]
      },
      10
    )
  );
}

function appendBuildingLayers(layers: LayerSpecification[], buildingLayer: string | null): void {
  if (!buildingLayer) {
    return;
  }

  layers.push(
    {
      id: 'building-fill',
      type: 'fill',
      source: BASEMAP_SOURCE_ID,
      'source-layer': buildingLayer,
      filter: geometryFilter('Polygon'),
      minzoom: 13,
      paint: {
        'fill-color': '#e8e3dc',
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          13, 0.52,
          16, 0.78
        ]
      }
    },
    {
      id: 'building-outline',
      type: 'line',
      source: BASEMAP_SOURCE_ID,
      'source-layer': buildingLayer,
      filter: geometryFilter('Polygon'),
      minzoom: 14,
      paint: {
        'line-color': '#d8d1c9',
        'line-opacity': 0.72,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          14, 0.45,
          17, 0.9
        ]
      }
    }
  );
}

function appendLabelLayers(layers: LayerSpecification[], layerSelection: BasemapLayerSelection): void {
  if (layerSelection.placeLayer) {
    layers.push(createSymbolLayer({
      id: 'place-label',
      sourceLayer: layerSelection.placeLayer,
      filter: buildNamedSurfaceFilter(),
      minzoom: 4,
      layout: {
        'text-field': buildLabelTextField(LABEL_NAME_FIELDS),
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 10.5,
          7, 11.5,
          11, 13.5,
          15, 16.5
        ],
        'text-max-width': 8,
        'text-letter-spacing': 0.02,
        'text-padding': 4,
        'text-optional': true,
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#445363',
        'text-halo-color': 'rgba(246, 244, 239, 0.94)',
        'text-halo-width': 1.4,
        'text-halo-blur': 0.6
      }
    }));
  }

  if (layerSelection.roadLabelLayer) {
    layers.push(createSymbolLayer({
      id: 'road-label',
      sourceLayer: layerSelection.roadLabelLayer,
      filter: buildRoadLabelFilter(),
      minzoom: 11,
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 380,
        'text-field': buildLabelTextField(LABEL_NAME_FIELDS),
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          11, 10,
          14, 11.5,
          16, 12.5,
          18, 14
        ],
        'text-padding': 2,
        'text-max-angle': 32,
        'text-keep-upright': true,
        'text-optional': true,
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#5a6676',
        'text-halo-color': 'rgba(255, 255, 255, 0.96)',
        'text-halo-width': 1.5,
        'text-halo-blur': 0.45
      }
    }));
  }

  if (layerSelection.poiLayer) {
    layers.push(createSymbolLayer({
      id: 'poi-label',
      sourceLayer: layerSelection.poiLayer,
      filter: buildNamedSurfaceFilter(),
      minzoom: 13,
      layout: {
        'text-field': buildLabelTextField(LABEL_NAME_FIELDS),
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          13, 10,
          15, 11,
          17, 12.5
        ],
        'text-max-width': 10,
        'text-padding': 6,
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.65,
        'text-justify': 'auto',
        'text-optional': true,
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#495768',
        'text-halo-color': 'rgba(255, 255, 255, 0.96)',
        'text-halo-width': 1.35,
        'text-halo-blur': 0.5
      }
    }));
  }
}

export function buildAmapLikePmtilesStyle(
  url: string,
  sourceLayers: string[],
  options: AmapLikePmtilesStyleOptions = {}
): StyleSpecification | null {
  const layerSelection = selectBasemapLayers(sourceLayers);

  const hasKnownLayers = [
    layerSelection.waterLayer,
    layerSelection.waterwayLayer,
    layerSelection.landcoverLayer,
    layerSelection.transportationLayer,
    layerSelection.boundaryLayer,
    layerSelection.buildingLayer,
    layerSelection.placeLayer,
    layerSelection.roadLabelLayer,
    layerSelection.poiLayer
  ].some(Boolean);

  if (!hasKnownLayers) {
    return null;
  }

  const layers: LayerSpecification[] = [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#f6f4ef'
      }
    }
  ];

  appendLandscapeLayers(layers, layerSelection);
  appendTransportationLayers(layers, layerSelection.transportationLayer);
  appendBuildingLayers(layers, layerSelection.buildingLayer);
  appendLabelLayers(layers, layerSelection);

  const sourceDefinition: StyleSpecification['sources'][typeof BASEMAP_SOURCE_ID] = {
    type: 'vector',
    url: `pmtiles://${url}`
  };

  if (options.sourceAttribution?.trim()) {
    sourceDefinition.attribution = options.sourceAttribution.trim();
  }

  const style: StyleSpecification = {
    version: 8,
    name: options.styleName?.trim() || 'Fuyao AMap Like',
    sources: {
      [BASEMAP_SOURCE_ID]: sourceDefinition
    },
    layers
  };

  if (options.center) {
    style.center = options.center;
  }

  if (typeof options.zoom === 'number' && Number.isFinite(options.zoom)) {
    style.zoom = options.zoom;
  }

  return style;
}
