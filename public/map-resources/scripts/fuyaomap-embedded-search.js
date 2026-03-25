(function (window) {
  'use strict';

  var DEFAULT_SEARCH_TYPES = ['shops', 'areas', 'pois', 'places', 'boundaries'];
  var SEARCH_SOURCE_ID = 'embedded-search-highlight-source';
  var SEARCH_FILL_LAYER_ID = 'embedded-search-highlight-fill';
  var SEARCH_LINE_LAYER_ID = 'embedded-search-highlight-line';
  var SEARCH_POINT_LAYER_ID = 'embedded-search-highlight-point';
  var EMPTY_FEATURE_COLLECTION = {
    type: 'FeatureCollection',
    features: []
  };

  var ENTITY_TYPE_ALIASES = {
    shop: 'shop',
    shops: 'shop',
    area: 'area',
    areas: 'area',
    poi: 'poi',
    pois: 'poi',
    place: 'place',
    places: 'place',
    boundary: 'boundary',
    boundaries: 'boundary'
  };

  var ENTITY_TO_LAYER = {
    shop: 'shops',
    area: 'areas',
    poi: 'pois',
    place: 'places',
    boundary: 'boundaries'
  };

  function toNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      var parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeText(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }

  function normalizeEntityType(rawType) {
    if (typeof rawType !== 'string') {
      return '';
    }

    var normalized = rawType.trim().toLowerCase();
    return ENTITY_TYPE_ALIASES[normalized] || '';
  }

  function normalizeSearchTypes(rawTypes, fallbackTypes, allowEmpty) {
    var fallback = Array.isArray(fallbackTypes) && fallbackTypes.length
      ? fallbackTypes.slice()
      : DEFAULT_SEARCH_TYPES.slice();
    var candidates = [];

    if (Array.isArray(rawTypes)) {
      candidates = rawTypes;
    } else if (typeof rawTypes === 'string' && rawTypes.trim()) {
      candidates = rawTypes.split(',');
    } else if (rawTypes && typeof rawTypes === 'object' && Array.isArray(rawTypes.types)) {
      candidates = rawTypes.types;
    }

    var types = [];
    candidates.forEach(function (item) {
      var normalized = normalizeEntityType(item);
      if (!normalized) {
        return;
      }

      var layerType = ENTITY_TO_LAYER[normalized];
      if (layerType && types.indexOf(layerType) === -1) {
        types.push(layerType);
      }
    });

    if (!types.length && !allowEmpty) {
      return fallback;
    }

    return types;
  }

  function normalizeBbox(rawBbox) {
    var values = null;

    if (Array.isArray(rawBbox)) {
      values = rawBbox;
    } else if (typeof rawBbox === 'string' && rawBbox.trim()) {
      values = rawBbox.split(',');
    }

    if (!values || values.length < 4) {
      return null;
    }

    var bbox = values.slice(0, 4).map(toNumber);
    if (bbox.some(function (item) { return item === null; })) {
      return null;
    }

    return [bbox[0], bbox[1], bbox[2], bbox[3]];
  }

  function parseGeoJsonGeometry(rawGeometry) {
    if (!rawGeometry) {
      return null;
    }

    if (typeof rawGeometry === 'string') {
      try {
        rawGeometry = JSON.parse(rawGeometry);
      } catch (error) {
        return null;
      }
    }

    if (!rawGeometry || typeof rawGeometry !== 'object') {
      return null;
    }

    if (rawGeometry.type === 'Feature' && rawGeometry.geometry) {
      return rawGeometry.geometry;
    }

    if (typeof rawGeometry.type === 'string' && rawGeometry.coordinates) {
      return rawGeometry;
    }

    return null;
  }

  function buildPolygonFromBbox(bbox) {
    if (!bbox) {
      return null;
    }

    return {
      type: 'Polygon',
      coordinates: [[
        [bbox[0], bbox[1]],
        [bbox[2], bbox[1]],
        [bbox[2], bbox[3]],
        [bbox[0], bbox[3]],
        [bbox[0], bbox[1]]
      ]]
    };
  }

  function cloneFeatureCollection() {
    return {
      type: 'FeatureCollection',
      features: []
    };
  }

  function getSourceData(map) {
    var source = map.getSource(SEARCH_SOURCE_ID);
    return source && typeof source.setData === 'function' ? source : null;
  }

  function ensureHighlightLayers(map) {
    if (!map.getSource(SEARCH_SOURCE_ID)) {
      map.addSource(SEARCH_SOURCE_ID, {
        type: 'geojson',
        data: cloneFeatureCollection()
      });
    }

    if (!map.getLayer(SEARCH_FILL_LAYER_ID)) {
      map.addLayer({
        id: SEARCH_FILL_LAYER_ID,
        type: 'fill',
        source: SEARCH_SOURCE_ID,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'fill-color': '#ff8b2b',
          'fill-opacity': 0.16
        }
      });
    }

    if (!map.getLayer(SEARCH_LINE_LAYER_ID)) {
      map.addLayer({
        id: SEARCH_LINE_LAYER_ID,
        type: 'line',
        source: SEARCH_SOURCE_ID,
        filter: ['match', ['geometry-type'], ['Polygon', 'LineString'], true, false],
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ff6b2c',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 14, 3.2, 18, 4.6],
          'line-opacity': 0.92
        }
      });
    }

    if (!map.getLayer(SEARCH_POINT_LAYER_ID)) {
      map.addLayer({
        id: SEARCH_POINT_LAYER_ID,
        type: 'circle',
        source: SEARCH_SOURCE_ID,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 6, 14, 9, 18, 12],
          'circle-color': '#ff6b2c',
          'circle-opacity': 0.96,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.2
        }
      });
    }
  }

  function updateHighlightSource(map, feature) {
    var source = getSourceData(map);
    if (!source) {
      return;
    }

    source.setData(feature ? {
      type: 'FeatureCollection',
      features: [feature]
    } : cloneFeatureCollection());
  }

  function walkCoordinates(coordinates, callback) {
    if (!Array.isArray(coordinates)) {
      return;
    }

    if (
      coordinates.length >= 2 &&
      typeof coordinates[0] === 'number' &&
      typeof coordinates[1] === 'number'
    ) {
      callback(coordinates[0], coordinates[1]);
      return;
    }

    coordinates.forEach(function (item) {
      walkCoordinates(item, callback);
    });
  }

  function getGeometryBounds(geometry) {
    if (!geometry || !geometry.coordinates) {
      return null;
    }

    var minLng = Number.POSITIVE_INFINITY;
    var minLat = Number.POSITIVE_INFINITY;
    var maxLng = Number.NEGATIVE_INFINITY;
    var maxLat = Number.NEGATIVE_INFINITY;
    var found = false;

    walkCoordinates(geometry.coordinates, function (lng, lat) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
      found = true;
    });

    return found ? [minLng, minLat, maxLng, maxLat] : null;
  }

  function isPointLikeBbox(bbox) {
    if (!bbox) {
      return false;
    }

    return Math.abs(bbox[0] - bbox[2]) < 0.00001 && Math.abs(bbox[1] - bbox[3]) < 0.00001;
  }

  function normalizeSearchItem(rawItem) {
    if (!rawItem || typeof rawItem !== 'object') {
      return null;
    }

    var type = normalizeEntityType(rawItem.type || rawItem.entityType || rawItem.itemType);
    if (!type) {
      return null;
    }

    var bbox = normalizeBbox(rawItem.bbox);
    var lng = toNumber(rawItem.lng);
    var lat = toNumber(rawItem.lat);

    if (lng === null) {
      lng = toNumber(rawItem.longitude);
    }
    if (lat === null) {
      lat = toNumber(rawItem.latitude);
    }

    if ((lng === null || lat === null) && bbox) {
      lng = (bbox[0] + bbox[2]) / 2;
      lat = (bbox[1] + bbox[3]) / 2;
    }

    var aliasNames = Array.isArray(rawItem.aliasNames)
      ? rawItem.aliasNames.filter(function (item) { return typeof item === 'string' && item.trim(); })
      : [];

    return {
      id: rawItem.id,
      type: type,
      layer: ENTITY_TO_LAYER[type],
      name: normalizeText(rawItem.name) || normalizeText(rawItem.displayName) || '未命名对象',
      displayName: normalizeText(rawItem.displayName) || normalizeText(rawItem.name) || '未命名对象',
      classification: rawItem.classification || null,
      address: normalizeText(rawItem.address) || null,
      source: normalizeText(rawItem.source || rawItem.sourceType) || null,
      aliasNames: aliasNames,
      score: toNumber(rawItem.score),
      lng: lng,
      lat: lat,
      bbox: bbox,
      geometryGeoJson: rawItem.geometryGeoJson || null
    };
  }

  function buildHighlightFeature(item) {
    if (!item) {
      return null;
    }

    var geometry = parseGeoJsonGeometry(item.geometryGeoJson);
    if (!geometry && item.bbox) {
      geometry = buildPolygonFromBbox(item.bbox);
    }

    if (!geometry && item.lng !== null && item.lng !== undefined && item.lat !== null && item.lat !== undefined) {
      geometry = {
        type: 'Point',
        coordinates: [item.lng, item.lat]
      };
    }

    if (!geometry) {
      return null;
    }

    return {
      type: 'Feature',
      properties: {
        id: item.id,
        type: item.type,
        displayName: item.displayName,
        name: item.name
      },
      geometry: geometry
    };
  }

  function getFeatureBounds(item, feature) {
    if (item && item.bbox) {
      return item.bbox;
    }

    return feature ? getGeometryBounds(feature.geometry) : null;
  }

  function getViewportBbox(map) {
    var bounds = map.getBounds();
    return [
      bounds.getWest().toFixed(6),
      bounds.getSouth().toFixed(6),
      bounds.getEast().toFixed(6),
      bounds.getNorth().toFixed(6)
    ].join(',');
  }

  function getViewportPayload(map) {
    var center = map.getCenter();
    return {
      center: [Number(center.lng.toFixed(6)), Number(center.lat.toFixed(6))],
      zoom: Number(map.getZoom().toFixed(2)),
      bearing: Number(map.getBearing().toFixed(2)),
      pitch: Number(map.getPitch().toFixed(2))
    };
  }

  function buildSearchQuery(params, map) {
    var keyword = normalizeText(params.keyword || params.q);
    var searchTypes = normalizeSearchTypes(params.types, DEFAULT_SEARCH_TYPES, false);
    var page = clamp(toNumber(params.page) || 1, 1, 999999);
    var limit = clamp(toNumber(params.limit) || 10, 1, 50);
    var query = new URLSearchParams();

    if (keyword) {
      query.set('q', keyword);
    }
    if (searchTypes.length) {
      query.set('types', searchTypes.join(','));
    }
    query.set('page', String(page));
    query.set('limit', String(limit));

    var bbox = normalizeText(params.bbox);
    if (!bbox && params.useViewportBbox && map) {
      bbox = getViewportBbox(map);
    }
    if (bbox) {
      query.set('bbox', bbox);
    }

    var near = normalizeText(params.near);
    var radius = toNumber(params.radius);
    if (near && radius !== null) {
      query.set('near', near);
      query.set('radius', String(radius));
    }

    return {
      query: keyword,
      searchTypes: searchTypes,
      page: page,
      limit: limit,
      queryString: query.toString()
    };
  }

  function createManager(options) {
    var managerOptions = options && typeof options === 'object' ? options : {};
    var map = managerOptions.map;
    var manifest = managerOptions.manifest && typeof managerOptions.manifest === 'object' ? managerOptions.manifest : {};
    var searchUrl = normalizeText(managerOptions.searchUrl || manifest.searchUrl) || '/api/map/search';
    var state = {
      lastQuery: '',
      lastResults: [],
      currentFeature: null
    };

    ensureHighlightLayers(map);

    function highlightFeature(rawFeature) {
      var item = normalizeSearchItem(rawFeature && rawFeature.feature ? rawFeature.feature : rawFeature);
      if (!item) {
        return null;
      }

      var feature = buildHighlightFeature(item);
      updateHighlightSource(map, feature);
      state.currentFeature = item;
      return item;
    }

    function clearHighlight() {
      updateHighlightSource(map, null);
      state.currentFeature = null;
    }

    function locateFeature(rawFeature, locateOptions) {
      var item = normalizeSearchItem(rawFeature && rawFeature.feature ? rawFeature.feature : rawFeature);
      if (!item) {
        return null;
      }

      var options = locateOptions && typeof locateOptions === 'object' ? locateOptions : {};
      var feature = buildHighlightFeature(item);
      if (options.highlight === false) {
        clearHighlight();
      } else {
        highlightFeature(item);
      }

      var bbox = getFeatureBounds(item, feature);
      var preferredZoom = toNumber(options.zoom);
      var method = 'flyTo';

      if (bbox && !isPointLikeBbox(bbox)) {
        method = 'fitBounds';
        map.fitBounds(
          [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
          {
            padding: clamp(toNumber(options.padding) || 72, 24, 180),
            maxZoom: clamp(preferredZoom || 16, 3, 18),
            duration: clamp(toNumber(options.duration) || 900, 0, 5000)
          }
        );
      } else if (item.lng !== null && item.lng !== undefined && item.lat !== null && item.lat !== undefined) {
        map.flyTo({
          center: [item.lng, item.lat],
          zoom: clamp(preferredZoom || Math.max(map.getZoom(), 14), 3, 20),
          duration: clamp(toNumber(options.duration) || 900, 0, 5000),
          essential: true
        });
      } else if (bbox) {
        method = 'fitBounds';
        map.fitBounds(
          [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
          {
            padding: clamp(toNumber(options.padding) || 72, 24, 180),
            maxZoom: 16,
            duration: clamp(toNumber(options.duration) || 900, 0, 5000)
          }
        );
      } else {
        return null;
      }

      state.currentFeature = item;
      return {
        item: item,
        method: method,
        bbox: bbox,
        viewport: getViewportPayload(map)
      };
    }

    function search(params) {
      var searchParams = params && typeof params === 'object' ? params : {};
      var queryConfig = buildSearchQuery(searchParams, map);

      if (!queryConfig.query) {
        state.lastQuery = '';
        state.lastResults = [];
        clearHighlight();
        return Promise.resolve({
          query: '',
          page: queryConfig.page,
          limit: queryConfig.limit,
          types: queryConfig.searchTypes,
          total: 0,
          items: []
        });
      }

      return window.fetch(searchUrl + '?' + queryConfig.queryString, {
        credentials: 'same-origin'
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Search failed: ' + response.status);
          }

          return response.json();
        })
        .then(function (data) {
          var items = Array.isArray(data && data.items)
            ? data.items.map(normalizeSearchItem).filter(Boolean)
            : [];

          state.lastQuery = queryConfig.query;
          state.lastResults = items;

          var result = {
            query: queryConfig.query,
            page: toNumber(data && data.page) || queryConfig.page,
            limit: toNumber(data && (data.pageSize || data.limit)) || queryConfig.limit,
            total: toNumber(data && data.total) || items.length,
            types: queryConfig.searchTypes,
            items: items
          };

          if (!items.length) {
            if (searchParams.clearHighlightOnEmpty !== false) {
              clearHighlight();
            }
            return result;
          }

          if (searchParams.autoLocate !== false) {
            result.located = locateFeature(items[0], {
              zoom: searchParams.zoom,
              duration: searchParams.duration,
              padding: searchParams.padding,
              highlight: searchParams.highlight !== false
            });
          } else if (searchParams.highlight !== false) {
            highlightFeature(items[0]);
          }

          return result;
        });
    }

    return {
      search: search,
      locateFeature: locateFeature,
      highlightFeature: highlightFeature,
      clearHighlight: clearHighlight,
      normalizeResult: normalizeSearchItem,
      getState: function () {
        return {
          lastQuery: state.lastQuery,
          lastResults: state.lastResults.slice(),
          currentFeature: state.currentFeature
        };
      }
    };
  }

  window.FuyaoEmbeddedSearch = {
    DEFAULT_SEARCH_TYPES: DEFAULT_SEARCH_TYPES.slice(),
    normalizeSearchTypes: normalizeSearchTypes,
    normalizeResult: normalizeSearchItem,
    create: createManager,
    EMPTY_FEATURE_COLLECTION: EMPTY_FEATURE_COLLECTION
  };
})(window);
