import type {
  FilterSpecification,
  LayerSpecification,
  LineLayerSpecification,
  StyleSpecification
} from 'maplibre-gl';

export const BASEMAP_SOURCE_ID = 'pmtiles-basemap';

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

function layerExists(sourceLayers: string[], candidates: string[]): boolean {
  return candidates.some((candidate) => sourceLayers.includes(candidate));
}

function pickSourceLayer(sourceLayers: string[], candidates: string[]): string | null {
  return candidates.find((candidate) => sourceLayers.includes(candidate)) ?? null;
}

function geometryFilter(geometryType: 'Polygon' | 'LineString' | 'Point'): FilterSpecification {
  return ['==', ['geometry-type'], geometryType] as unknown as FilterSpecification;
}

function matchProperty(property: string, values: string[]): FilterSpecification {
  return ['match', ['get', property], values, true, false] as unknown as FilterSpecification;
}

function matchAnyProperty(properties: string[], values: string[]): FilterSpecification {
  return ['any', ...properties.map((property) => matchProperty(property, values))] as unknown as FilterSpecification;
}

function allFilters(...filters: FilterSpecification[]): FilterSpecification {
  return ['all', ...filters] as unknown as FilterSpecification;
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

export function buildAmapLikePmtilesStyle(url: string, sourceLayers: string[]): StyleSpecification | null {
  const waterLayer = pickSourceLayer(sourceLayers, ['water', 'water_polygon']);
  const waterwayLayer = pickSourceLayer(sourceLayers, ['waterway', 'water_line']);
  const landcoverLayer = pickSourceLayer(sourceLayers, ['landcover', 'landuse']);
  const transportationLayer = pickSourceLayer(sourceLayers, ['transportation', 'roads', 'road']);
  const boundaryLayer = pickSourceLayer(sourceLayers, ['boundary', 'boundaries', 'admin']);
  const buildingLayer = pickSourceLayer(sourceLayers, ['building', 'buildings', 'structure']);

  const hasKnownLayers = [
    waterLayer,
    waterwayLayer,
    landcoverLayer,
    transportationLayer,
    boundaryLayer,
    buildingLayer
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

  if (landcoverLayer) {
    layers.push({
      id: 'landcover-green',
      type: 'fill',
      source: BASEMAP_SOURCE_ID,
      'source-layer': landcoverLayer,
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

  if (waterLayer) {
    layers.push({
      id: 'water-fill',
      type: 'fill',
      source: BASEMAP_SOURCE_ID,
      'source-layer': waterLayer,
      filter: geometryFilter('Polygon'),
      paint: {
        'fill-color': '#cfe3f5',
        'fill-opacity': 0.96
      }
    });
  }

  if (waterwayLayer) {
    layers.push(createLineLayer(
      'waterway-line',
      waterwayLayer,
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

  if (boundaryLayer) {
    layers.push(createLineLayer(
      'boundary-line',
      boundaryLayer,
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

  if (transportationLayer) {
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

  if (buildingLayer && layerExists(sourceLayers, [buildingLayer])) {
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

  return {
    version: 8,
    name: 'Fuyao AMap Like',
    sources: {
      [BASEMAP_SOURCE_ID]: {
        type: 'vector',
        url: `pmtiles://${url}`
      }
    },
    layers
  };
}
