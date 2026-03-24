(function (window, document) {
  'use strict';

  var EMBEDDED_SOURCE = 'fuyaomap-embedded';
  var DEFAULT_STYLE_NAME = 'amap-like';
  var UNI_BRIDGE_QUEUE = [];

  var state = {
    manifest: null,
    map: null,
    markers: [],
    config: null,
    mapReady: false,
    pendingMessages: []
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

  function parseLngLat(rawValue) {
    if (Array.isArray(rawValue) && rawValue.length >= 2) {
      var lngFromArray = toNumber(rawValue[0]);
      var latFromArray = toNumber(rawValue[1]);
      if (lngFromArray !== null && latFromArray !== null) {
        return [lngFromArray, latFromArray];
      }
    }

    if (rawValue && typeof rawValue === 'object') {
      var lngFromObject = toNumber(rawValue.lng);
      var latFromObject = toNumber(rawValue.lat);
      if (lngFromObject !== null && latFromObject !== null) {
        return [lngFromObject, latFromObject];
      }
    }

    if (typeof rawValue !== 'string' || !rawValue.trim()) {
      return null;
    }

    var parts = rawValue.split(',');
    if (parts.length < 2) {
      return null;
    }

    var lng = toNumber(parts[0]);
    var lat = toNumber(parts[1]);
    if (lng === null || lat === null) {
      return null;
    }

    return [lng, lat];
  }

  function parseMarkerEntry(rawValue, index) {
    var lngLat = parseLngLat(rawValue);
    if (!lngLat) {
      return null;
    }

    var normalized = {
      id: 'marker-' + (index + 1),
      lng: lngLat[0],
      lat: lngLat[1]
    };

    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      if (typeof rawValue.id === 'string' && rawValue.id.trim()) {
        normalized.id = rawValue.id.trim();
      }

      if (typeof rawValue.label === 'string' && rawValue.label.trim()) {
        normalized.label = rawValue.label.trim();
      }

      if (typeof rawValue.color === 'string' && rawValue.color.trim()) {
        normalized.color = rawValue.color.trim();
      }
    }

    return normalized;
  }

  function parseMarkers(rawValue) {
    if (!rawValue) {
      return [];
    }

    if (Array.isArray(rawValue)) {
      return rawValue.map(parseMarkerEntry).filter(Boolean);
    }

    if (typeof rawValue === 'object') {
      var singleMarker = parseMarkerEntry(rawValue, 0);
      return singleMarker ? [singleMarker] : [];
    }

    if (typeof rawValue !== 'string' || !rawValue.trim()) {
      return [];
    }

    try {
      var parsedJson = JSON.parse(rawValue);
      if (Array.isArray(parsedJson)) {
        return parsedJson.map(parseMarkerEntry).filter(Boolean);
      }
    } catch (error) {
      // 非 JSON 时继续尝试按分号分隔的坐标串解析。
    }

    return rawValue
      .split(';')
      .map(function (item, index) {
        return parseMarkerEntry(item, index);
      })
      .filter(Boolean);
  }

  function parseMode(rawValue) {
    return rawValue === 'pick' ? 'pick' : 'view';
  }

  function resolveStyleUrl(styleName, manifest) {
    if (!styleName || styleName === DEFAULT_STYLE_NAME) {
      return manifest.styles && manifest.styles[DEFAULT_STYLE_NAME]
        ? manifest.styles[DEFAULT_STYLE_NAME]
        : manifest.styleUrl;
    }

    if (manifest.styles && manifest.styles[styleName]) {
      return manifest.styles[styleName];
    }

    if (/^https?:\/\//i.test(styleName) || styleName.startsWith('/')) {
      return styleName;
    }

    if (styleName.endsWith('.json')) {
      return new URL(styleName, window.location.href).toString();
    }

    return manifest.styleUrl;
  }

  function getParams() {
    return new URLSearchParams(window.location.search);
  }

  function buildInitialConfig(manifest) {
    var params = getParams();
    var marker = parseLngLat(params.get('marker'));
    var markers = parseMarkers(params.get('markers'));
    var center = parseLngLat(params.get('center'));

    if (!center) {
      if (marker) {
        center = marker;
      } else if (markers.length > 0) {
        center = [markers[0].lng, markers[0].lat];
      } else if (Array.isArray(manifest.defaultCenter) && manifest.defaultCenter.length >= 2) {
        center = [manifest.defaultCenter[0], manifest.defaultCenter[1]];
      } else {
        center = [113.4445, 22.4915];
      }
    }

    var zoom = toNumber(params.get('zoom'));
    if (zoom === null) {
      zoom = toNumber(manifest.defaultZoom);
    }
    if (zoom === null) {
      zoom = 10;
    }

    var bearing = toNumber(params.get('bearing'));
    var pitch = toNumber(params.get('pitch'));

    return {
      center: center,
      zoom: clamp(zoom, 1, 20),
      bearing: bearing === null ? 0 : bearing,
      pitch: pitch === null ? 0 : clamp(pitch, 0, 60),
      mode: parseMode(params.get('mode')),
      keyword: params.get('keyword') || '',
      layers: (params.get('layers') || '')
        .split(',')
        .map(function (item) {
          return item.trim();
        })
        .filter(Boolean),
      styleName: params.get('style') || DEFAULT_STYLE_NAME,
      styleUrl: resolveStyleUrl(params.get('style') || DEFAULT_STYLE_NAME, manifest),
      markers: markers,
      marker: marker
    };
  }

  function loadManifest(manifestUrl) {
    return window.fetch(manifestUrl).then(function (response) {
      if (!response.ok) {
        throw new Error('Failed to load manifest: ' + response.status);
      }

      return response.json();
    });
  }

  function buildMessage(type, payload) {
    return {
      source: EMBEDDED_SOURCE,
      type: type,
      payload: payload || {}
    };
  }

  function flushUniBridgeQueue() {
    if (!window.uni || typeof window.uni.postMessage !== 'function') {
      return;
    }

    while (UNI_BRIDGE_QUEUE.length > 0) {
      var nextMessage = UNI_BRIDGE_QUEUE.shift();
      window.uni.postMessage({
        data: nextMessage
      });
    }
  }

  function emitHostMessage(type, payload) {
    var message = buildMessage(type, payload);

    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(message, '*');
      }
    } catch (error) {
      console.warn('[FuyaoEmbedded] failed to post message to parent', error);
    }

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(message, '*');
      }
    } catch (error) {
      console.warn('[FuyaoEmbedded] failed to post message to opener', error);
    }

    if (window.uni && typeof window.uni.postMessage === 'function') {
      window.uni.postMessage({
        data: message
      });
    } else {
      UNI_BRIDGE_QUEUE.push(message);
    }

    return message;
  }

  function getViewportPayload() {
    if (!state.map) {
      return {};
    }

    var center = state.map.getCenter();
    var bounds = state.map.getBounds();

    return {
      center: [Number(center.lng.toFixed(6)), Number(center.lat.toFixed(6))],
      zoom: Number(state.map.getZoom().toFixed(2)),
      bearing: Number(state.map.getBearing().toFixed(2)),
      pitch: Number(state.map.getPitch().toFixed(2)),
      bounds: [
        [Number(bounds.getWest().toFixed(6)), Number(bounds.getSouth().toFixed(6))],
        [Number(bounds.getEast().toFixed(6)), Number(bounds.getNorth().toFixed(6))]
      ]
    };
  }

  function setStatusText(value) {
    var statusEl = document.getElementById('embedded-status');
    if (statusEl) {
      statusEl.textContent = value;
    }
  }

  function setCoordinatesText(value) {
    var coordinatesEl = document.getElementById('embedded-coordinates');
    if (coordinatesEl) {
      coordinatesEl.textContent = value;
    }
  }

  function updateModeBadge(mode) {
    var modeEl = document.getElementById('embedded-mode');
    if (modeEl) {
      modeEl.textContent = mode === 'pick' ? 'PICK' : 'VIEW';
    }
  }

  function showError(message) {
    var errorEl = document.getElementById('embedded-error');
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
    setStatusText('Failed');
  }

  function serializeMarkerSpec(markerSpec) {
    return {
      id: markerSpec.id || '',
      lng: Number(markerSpec.lng),
      lat: Number(markerSpec.lat),
      label: markerSpec.label || '',
      color: markerSpec.color || '#1f7cff'
    };
  }

  function buildMarkerPayload(action) {
    var markers = state.markers.map(function (marker) {
      return serializeMarkerSpec(marker.spec);
    });

    return {
      action: action || 'set',
      mode: state.config ? state.config.mode : 'view',
      zoom: state.map ? Number(state.map.getZoom().toFixed(2)) : null,
      markerCount: markers.length,
      marker: markers.length > 0 ? markers[0] : null,
      markers: markers
    };
  }

  function emitMarkerUpdated(action) {
    emitHostMessage('marker-updated', buildMarkerPayload(action));
  }

  function clearMarkers(options) {
    var shouldEmit = !options || options.emitEvent !== false;
    var action = options && typeof options.action === 'string' ? options.action : 'cleared';

    while (state.markers.length > 0) {
      var marker = state.markers.pop();
      marker.instance.remove();
    }

    if (shouldEmit) {
      emitMarkerUpdated(action);
    }
  }

  function createMarker(markerSpec, index) {
    var marker = new maplibregl.Marker({
      color: markerSpec.color || '#1f7cff'
    })
      .setLngLat([markerSpec.lng, markerSpec.lat])
      .addTo(state.map);

    if (markerSpec.label) {
      marker.setPopup(new maplibregl.Popup({ offset: 18 }).setText(markerSpec.label));
    }

    marker.getElement().addEventListener('click', function (event) {
      event.stopPropagation();
      emitHostMessage('marker-click', {
        id: markerSpec.id || 'marker-' + (index + 1),
        lng: markerSpec.lng,
        lat: markerSpec.lat,
        label: markerSpec.label || ''
      });
    });

    return {
      id: markerSpec.id || 'marker-' + (index + 1),
      spec: markerSpec,
      instance: marker
    };
  }

  function setMarkers(markerSpecs) {
    var options = arguments.length > 1 && arguments[1] ? arguments[1] : null;
    var shouldEmit = !options || options.emitEvent !== false;
    var action = options && typeof options.action === 'string' ? options.action : 'set';

    clearMarkers({ emitEvent: false });

    markerSpecs.forEach(function (markerSpec, index) {
      state.markers.push(createMarker(markerSpec, index));
    });

    if (shouldEmit) {
      emitMarkerUpdated(action);
    }
  }

  function normalizeHostMessage(rawMessage) {
    if (!rawMessage || typeof rawMessage !== 'object') {
      return null;
    }

    if (rawMessage.source === EMBEDDED_SOURCE) {
      return null;
    }

    if (typeof rawMessage.type !== 'string' || !rawMessage.type.trim()) {
      return null;
    }

    return {
      type: rawMessage.type.trim(),
      payload: rawMessage.payload && typeof rawMessage.payload === 'object' ? rawMessage.payload : {}
    };
  }

  function jumpToCenter(center, zoom) {
    if (!state.map || !center) {
      return;
    }

    state.map.easeTo({
      center: center,
      zoom: zoom !== null && zoom !== undefined ? zoom : state.map.getZoom(),
      duration: 600
    });
  }

  function handleCommand(message) {
    if (!state.map) {
      return;
    }

    var payload = message.payload || {};

    if (message.type === 'set-center') {
      var center = parseLngLat(payload.center || payload);
      if (center) {
        jumpToCenter(center, null);
      }
      return;
    }

    if (message.type === 'set-zoom') {
      var zoom = toNumber(payload.zoom);
      if (zoom !== null) {
        state.map.easeTo({
          zoom: clamp(zoom, 1, 20),
          duration: 450
        });
      }
      return;
    }

    if (message.type === 'fly-to') {
      var flyCenter = parseLngLat(payload.center || payload);
      var flyZoom = toNumber(payload.zoom);
      var flyBearing = toNumber(payload.bearing);
      var flyPitch = toNumber(payload.pitch);

      state.map.flyTo({
        center: flyCenter || state.map.getCenter().toArray(),
        zoom: flyZoom !== null ? clamp(flyZoom, 1, 20) : state.map.getZoom(),
        bearing: flyBearing !== null ? flyBearing : state.map.getBearing(),
        pitch: flyPitch !== null ? clamp(flyPitch, 0, 60) : state.map.getPitch(),
        duration: clamp(toNumber(payload.duration) || 1200, 0, 5000),
        essential: true
      });
      return;
    }

    if (message.type === 'set-marker') {
      var markers = [];

      if (Array.isArray(payload.markers)) {
        markers = parseMarkers(payload.markers);
      } else if (payload.marker) {
        markers = parseMarkers(payload.marker);
      } else {
        markers = parseMarkers(payload);
      }

      if (markers.length > 0) {
        setMarkers(markers, { action: 'host-set' });
        if (payload.flyTo !== false) {
          jumpToCenter([markers[0].lng, markers[0].lat], toNumber(payload.zoom));
        }
      }
      return;
    }

    if (message.type === 'clear-marker') {
      clearMarkers({ action: 'host-clear' });
    }
  }

  function drainPendingMessages() {
    if (!state.mapReady || !state.map) {
      return;
    }

    while (state.pendingMessages.length > 0) {
      handleCommand(state.pendingMessages.shift());
    }
  }

  function queueOrHandleMessage(message) {
    if (!message) {
      return false;
    }

    if (!state.mapReady) {
      state.pendingMessages.push(message);
      return true;
    }

    handleCommand(message);
    return true;
  }

  function handleMapClick(event) {
    var lngLat = event.lngLat;
    var payload = {
      lng: Number(lngLat.lng.toFixed(6)),
      lat: Number(lngLat.lat.toFixed(6)),
      zoom: state.map ? Number(state.map.getZoom().toFixed(2)) : Number(state.config.zoom.toFixed(2)),
      mode: state.config.mode
    };

    if (state.config.mode === 'pick') {
      setMarkers([
        {
          id: 'picked-location',
          lng: payload.lng,
          lat: payload.lat,
          label: 'Picked Location',
          color: '#ff6b2c'
        }
      ], { action: 'picked' });
      setStatusText('Picked');
    } else {
      setStatusText('Ready');
    }

    setCoordinatesText(payload.lng + ', ' + payload.lat + ' · z' + payload.zoom);
    emitHostMessage('map-click', payload);
  }

  function createMap(manifest, config) {
    state.map = new maplibregl.Map({
      container: 'embedded-map',
      style: config.styleUrl,
      center: config.center,
      zoom: config.zoom,
      bearing: config.bearing,
      pitch: config.pitch,
      attributionControl: true,
      localIdeographFontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    });

    state.map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    state.map.on('load', function () {
      state.mapReady = true;
      setStatusText('Ready');
      setCoordinatesText(config.center[0] + ', ' + config.center[1]);

      var initialMarkers = [];
      if (config.markers.length > 0) {
        initialMarkers = config.markers;
      } else if (config.marker) {
        initialMarkers = parseMarkers([config.marker]);
      }

      if (initialMarkers.length > 0) {
        setMarkers(initialMarkers, { emitEvent: false });
      }

      emitHostMessage('map-ready', {
        mode: config.mode,
        styleUrl: config.styleUrl,
        center: config.center,
        zoom: config.zoom,
        bearing: config.bearing,
        pitch: config.pitch,
        keyword: config.keyword,
        layers: config.layers,
        manifest: {
          name: manifest.name,
          version: manifest.version
        }
      });

      if (initialMarkers.length > 0) {
        emitMarkerUpdated('initial');
      }

      drainPendingMessages();
    });

    state.map.on('click', handleMapClick);
    state.map.on('moveend', function () {
      emitHostMessage('viewport-change', getViewportPayload());
    });
    state.map.on('error', function (event) {
      var message = event && event.error && event.error.message ? event.error.message : 'Unknown map error';
      showError(message);
      emitHostMessage('map-error', { message: message });
    });
  }

  function receiveHostMessage(rawMessage) {
    return queueOrHandleMessage(normalizeHostMessage(rawMessage));
  }

  function bootstrap() {
    var manifestUrl = './manifest.json';

    updateModeBadge('view');
    setStatusText('Loading');
    setCoordinatesText('--');

    loadManifest(manifestUrl)
      .then(function (manifest) {
        state.manifest = manifest;
        state.config = buildInitialConfig(manifest);
        updateModeBadge(state.config.mode);
        createMap(manifest, state.config);
      })
      .catch(function (error) {
        console.error('[FuyaoEmbedded] failed to initialize map', error);
        showError(error && error.message ? error.message : 'Failed to initialize map');
      });
  }

  document.addEventListener('message', function (event) {
    receiveHostMessage(event && event.data ? event.data : null);
  });

  window.addEventListener('message', function (event) {
    receiveHostMessage(event && event.data ? event.data : null);
  });

  document.addEventListener('UniAppJSBridgeReady', function () {
    flushUniBridgeQueue();
  });

  window.__FUYAO_EMBEDDED_MAP__ = {
    receiveHostMessage: receiveHostMessage,
    clearMarker: function () {
      clearMarkers();
    },
    getViewport: getViewportPayload
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})(window, document);
