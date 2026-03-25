(function (window) {
  'use strict';

  var AVAILABLE_LAYERS = ['shops', 'areas', 'pois', 'places', 'boundaries'];
  var DEFAULT_LAYERS = ['shops', 'areas'];
  var EMPTY_FEATURE_COLLECTION = {
    type: 'FeatureCollection',
    features: []
  };

  function cloneFeatureCollection() {
    return {
      type: 'FeatureCollection',
      features: []
    };
  }

  function getGeometryTypeFilter(type) {
    return ['==', ['geometry-type'], type];
  }

  function getLineOrPolygonFilter() {
    return ['match', ['geometry-type'], ['LineString', 'Polygon'], true, false];
  }

  var LAYER_DEFINITIONS = {
    shops: {
      sourceId: 'business-shops',
      apiPath: '/map/shops/geojson',
      minZoom: 12,
      layerIds: ['business-shops-circle'],
      buildLayers: function () {
        return [
          {
            id: 'business-shops-circle',
            type: 'circle',
            source: 'business-shops',
            filter: getGeometryTypeFilter('Point'),
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4.6, 12, 6.2, 16, 8.8],
              'circle-color': '#3e7fe0',
              'circle-opacity': 0.95,
              'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1.3, 16, 2],
              'circle-stroke-color': '#ffffff'
            }
          }
        ];
      }
    },
    areas: {
      sourceId: 'business-areas',
      apiPath: '/map/areas/geojson',
      minZoom: 9,
      layerIds: ['business-areas-fill', 'business-areas-line'],
      buildLayers: function () {
        return [
          {
            id: 'business-areas-fill',
            type: 'fill',
            source: 'business-areas',
            filter: getGeometryTypeFilter('Polygon'),
            paint: {
              'fill-color': '#5a8ee6',
              'fill-opacity': 0.12
            }
          },
          {
            id: 'business-areas-line',
            type: 'line',
            source: 'business-areas',
            filter: getGeometryTypeFilter('Polygon'),
            layout: {
              'line-join': 'round'
            },
            paint: {
              'line-color': '#4478d6',
              'line-opacity': 0.9,
              'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.2, 13, 1.8, 17, 2.6]
            }
          }
        ];
      }
    },
    pois: {
      sourceId: 'business-pois',
      apiPath: '/map/pois/geojson',
      minZoom: 13,
      layerIds: ['business-pois-circle'],
      buildLayers: function () {
        return [
          {
            id: 'business-pois-circle',
            type: 'circle',
            source: 'business-pois',
            filter: getGeometryTypeFilter('Point'),
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4.2, 12, 5.9, 16, 8.4],
              'circle-color': '#1d9ab0',
              'circle-opacity': 0.94,
              'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1.2, 16, 1.9],
              'circle-stroke-color': '#ffffff'
            }
          }
        ];
      }
    },
    places: {
      sourceId: 'business-places',
      apiPath: '/map/places/geojson',
      minZoom: 11,
      layerIds: ['business-places-fill', 'business-places-line', 'business-places-circle'],
      buildLayers: function () {
        return [
          {
            id: 'business-places-fill',
            type: 'fill',
            source: 'business-places',
            filter: getGeometryTypeFilter('Polygon'),
            paint: {
              'fill-color': '#7b78d6',
              'fill-opacity': 0.08
            }
          },
          {
            id: 'business-places-line',
            type: 'line',
            source: 'business-places',
            filter: getGeometryTypeFilter('Polygon'),
            layout: {
              'line-join': 'round'
            },
            paint: {
              'line-color': '#6f6ad2',
              'line-opacity': 0.8,
              'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 13, 1.6, 17, 2.2]
            }
          },
          {
            id: 'business-places-circle',
            type: 'circle',
            source: 'business-places',
            filter: getGeometryTypeFilter('Point'),
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 5.8, 16, 8],
              'circle-color': '#6f6ad2',
              'circle-opacity': 0.92,
              'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 8, 1.1, 16, 1.8],
              'circle-stroke-color': '#ffffff'
            }
          }
        ];
      }
    },
    boundaries: {
      sourceId: 'business-boundaries',
      apiPath: '/map/boundaries/geojson',
      minZoom: 8,
      layerIds: ['business-boundaries-fill', 'business-boundaries-line'],
      buildLayers: function () {
        return [
          {
            id: 'business-boundaries-fill',
            type: 'fill',
            source: 'business-boundaries',
            filter: getGeometryTypeFilter('Polygon'),
            paint: {
              'fill-color': '#8d6a4a',
              'fill-opacity': 0.06
            }
          },
          {
            id: 'business-boundaries-line',
            type: 'line',
            source: 'business-boundaries',
            filter: getLineOrPolygonFilter(),
            layout: {
              'line-join': 'round'
            },
            paint: {
              'line-color': '#8d6a4a',
              'line-opacity': 0.88,
              'line-dasharray': [2.2, 1.6],
              'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.1, 13, 1.8, 17, 2.4]
            }
          }
        ];
      }
    }
  };

  function cloneArray(items) {
    return Array.isArray(items) ? items.slice() : [];
  }

  function normalizeLayerName(rawLayer) {
    if (typeof rawLayer !== 'string') {
      return '';
    }

    return rawLayer.trim().toLowerCase();
  }

  function toLayerCandidates(rawLayers) {
    if (Array.isArray(rawLayers)) {
      return rawLayers;
    }

    if (typeof rawLayers === 'string') {
      if (!rawLayers.trim()) {
        return [];
      }

      return rawLayers.split(',');
    }

    if (rawLayers && typeof rawLayers === 'object' && Array.isArray(rawLayers.layers)) {
      return rawLayers.layers;
    }

    if (rawLayers && typeof rawLayers === 'object' && typeof rawLayers.layer === 'string') {
      return [rawLayers.layer];
    }

    return [];
  }

  function normalizeLayerList(rawLayers, fallbackLayers, allowEmpty) {
    var fallback = Array.isArray(fallbackLayers) ? fallbackLayers : DEFAULT_LAYERS;
    var candidates = toLayerCandidates(rawLayers);
    var deduped = [];

    candidates.forEach(function (item) {
      var normalized = normalizeLayerName(item);
      if (!normalized || AVAILABLE_LAYERS.indexOf(normalized) === -1 || deduped.indexOf(normalized) !== -1) {
        return;
      }

      deduped.push(normalized);
    });

    if (!deduped.length && !allowEmpty) {
      return cloneArray(fallback);
    }

    return deduped;
  }

  function joinApiUrl(baseUrl, apiPath) {
    var normalizedBase = typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim().replace(/\/+$/, '') : '/api';
    var normalizedPath = apiPath.startsWith('/') ? apiPath : '/' + apiPath;
    return normalizedBase + normalizedPath;
  }

  function createRequestUrl(baseUrl, apiPath, bbox) {
    var requestUrl = joinApiUrl(baseUrl, apiPath);
    var query = bbox ? '?bbox=' + encodeURIComponent(bbox) : '';
    return requestUrl + query;
  }

  function getViewportSnapshot(map) {
    var bounds = map.getBounds();
    return {
      bbox: [
        bounds.getWest().toFixed(6),
        bounds.getSouth().toFixed(6),
        bounds.getEast().toFixed(6),
        bounds.getNorth().toFixed(6)
      ].join(','),
      zoom: Number(map.getZoom().toFixed(2))
    };
  }

  function ensureSource(map, sourceId) {
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: cloneFeatureCollection()
      });
    }
  }

  function ensureLayer(map, layerDefinition) {
    if (!map.getLayer(layerDefinition.id)) {
      map.addLayer(layerDefinition);
    }
  }

  function setSourceData(map, sourceId, data) {
    var source = map.getSource(sourceId);
    if (source && typeof source.setData === 'function') {
      source.setData(data);
    }
  }

  function setLayerVisibility(map, layerIds, visible) {
    layerIds.forEach(function (layerId) {
      if (!map.getLayer(layerId)) {
        return;
      }

      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    });
  }

  function isSameLayerList(left, right) {
    return left.join('|') === right.join('|');
  }

  function createManager(map, options) {
    var managerOptions = options && typeof options === 'object' ? options : {};
    var enabledLayers = normalizeLayerList(managerOptions.defaultLayers, DEFAULT_LAYERS, false);
    var apiBaseUrl = typeof managerOptions.apiBaseUrl === 'string' && managerOptions.apiBaseUrl.trim()
      ? managerOptions.apiBaseUrl.trim()
      : '/api';
    var requestControllers = {};
    var lastRequestSignatureByLayer = {};
    var readyEmitted = false;

    function getState() {
      return {
        availableLayers: cloneArray(AVAILABLE_LAYERS),
        enabledLayers: cloneArray(enabledLayers)
      };
    }

    function emitReady() {
      if (typeof managerOptions.onReady === 'function') {
        managerOptions.onReady(getState());
      }
    }

    function emitChange() {
      if (typeof managerOptions.onChange === 'function') {
        managerOptions.onChange(getState());
      }
    }

    function ensureSourcesAndLayers() {
      AVAILABLE_LAYERS.forEach(function (layerName) {
        var definition = LAYER_DEFINITIONS[layerName];
        ensureSource(map, definition.sourceId);
        definition.buildLayers().forEach(function (layer) {
          ensureLayer(map, layer);
        });
      });
    }

    function applyVisibility() {
      AVAILABLE_LAYERS.forEach(function (layerName) {
        var definition = LAYER_DEFINITIONS[layerName];
        setLayerVisibility(map, definition.layerIds, enabledLayers.indexOf(layerName) !== -1);
      });
    }

    function clearLayerData(layerName) {
      var definition = LAYER_DEFINITIONS[layerName];
      var controller = requestControllers[layerName];
      if (controller) {
        controller.abort();
        delete requestControllers[layerName];
      }

      setSourceData(map, definition.sourceId, cloneFeatureCollection());
      lastRequestSignatureByLayer[layerName] = '';
    }

    function refreshLayer(layerName, viewport, force) {
      var definition = LAYER_DEFINITIONS[layerName];
      var isEnabled = enabledLayers.indexOf(layerName) !== -1;
      var canLoad = isEnabled && viewport.zoom >= definition.minZoom && !!viewport.bbox;

      if (!canLoad) {
        clearLayerData(layerName);
        return Promise.resolve();
      }

      var requestSignature = viewport.bbox + '@' + viewport.zoom.toFixed(2);
      if (!force && lastRequestSignatureByLayer[layerName] === requestSignature) {
        return Promise.resolve();
      }

      if (requestControllers[layerName]) {
        requestControllers[layerName].abort();
      }

      var controller = new AbortController();
      requestControllers[layerName] = controller;

      return window.fetch(createRequestUrl(apiBaseUrl, definition.apiPath, viewport.bbox), {
        signal: controller.signal,
        credentials: 'same-origin'
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Failed to load ' + layerName + ': ' + response.status);
          }

          return response.json();
        })
        .then(function (data) {
          if (requestControllers[layerName] !== controller) {
            return;
          }

          var featureCollection = data && data.type === 'FeatureCollection' && Array.isArray(data.features)
            ? data
            : cloneFeatureCollection();

          setSourceData(map, definition.sourceId, featureCollection);
          lastRequestSignatureByLayer[layerName] = requestSignature;
        })
        .catch(function (error) {
          if (controller.signal.aborted) {
            return;
          }

          console.warn('[FuyaoBusinessLayers] failed to load ' + layerName, error);
          setSourceData(map, definition.sourceId, cloneFeatureCollection());
        });
    }

    function refresh(reason, force) {
      var viewport = getViewportSnapshot(map);

      return Promise.all(AVAILABLE_LAYERS.map(function (layerName) {
        return refreshLayer(layerName, viewport, force);
      })).finally(function () {
        if (!readyEmitted) {
          readyEmitted = true;
          emitReady();
        }
      });
    }

    function setLayers(nextLayers) {
      var normalized = normalizeLayerList(nextLayers, [], true);
      if (isSameLayerList(enabledLayers, normalized)) {
        return Promise.resolve(getState());
      }

      enabledLayers = normalized;
      applyVisibility();

      return refresh('set-layers', true).finally(function () {
        emitChange();
      });
    }

    function showLayer(layerName) {
      var normalized = normalizeLayerName(layerName);
      if (!normalized || AVAILABLE_LAYERS.indexOf(normalized) === -1 || enabledLayers.indexOf(normalized) !== -1) {
        return Promise.resolve(getState());
      }

      return setLayers(enabledLayers.concat(normalized));
    }

    function hideLayer(layerName) {
      var normalized = normalizeLayerName(layerName);
      if (!normalized || enabledLayers.indexOf(normalized) === -1) {
        return Promise.resolve(getState());
      }

      return setLayers(enabledLayers.filter(function (item) {
        return item !== normalized;
      }));
    }

    ensureSourcesAndLayers();
    applyVisibility();
    map.on('moveend', function () {
      void refresh('moveend', false);
    });
    void refresh('initial', true);

    return {
      refresh: function (force) {
        return refresh('manual', Boolean(force));
      },
      setLayers: setLayers,
      showLayer: showLayer,
      hideLayer: hideLayer,
      getState: getState
    };
  }

  window.FuyaoBusinessLayerManager = {
    AVAILABLE_LAYERS: cloneArray(AVAILABLE_LAYERS),
    DEFAULT_LAYERS: cloneArray(DEFAULT_LAYERS),
    normalizeLayerList: function (rawLayers, fallbackLayers, allowEmpty) {
      return normalizeLayerList(rawLayers, fallbackLayers, allowEmpty);
    },
    create: createManager,
    emptyFeatureCollection: cloneFeatureCollection,
    EMPTY_FEATURE_COLLECTION: EMPTY_FEATURE_COLLECTION
  };
})(window);
