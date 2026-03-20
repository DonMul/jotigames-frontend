(() => {
  if (typeof L === 'undefined') {
    return;
  }

  const parseFloatSafe = (value, fallback) => {
    const parsed = Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const initDropoffMap = () => {
    const mapElement = document.getElementById('courier-rush-dropoff-map');
    const latInput = document.querySelector('[data-courier-dropoff-lat]');
    const lonInput = document.querySelector('[data-courier-dropoff-lon]');
    if (!mapElement || !latInput || !lonInput) {
      return;
    }

    const fallbackLat = parseFloatSafe(mapElement.dataset.centerLat, 51.05);
    const fallbackLon = parseFloatSafe(mapElement.dataset.centerLon, 3.72);

    const initialLat = parseFloatSafe(latInput.value, fallbackLat);
    const initialLon = parseFloatSafe(lonInput.value, fallbackLon);

    const map = L.map(mapElement).setView([initialLat, initialLon], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.marker([initialLat, initialLon], { draggable: true }).addTo(map);

    const syncInputs = (lat, lon) => {
      latInput.value = lat.toFixed(6);
      lonInput.value = lon.toFixed(6);
    };

    syncInputs(initialLat, initialLon);

    marker.on('dragend', (event) => {
      const { lat, lng } = event.target.getLatLng();
      syncInputs(lat, lng);
    });

    map.on('click', (event) => {
      marker.setLatLng(event.latlng);
      syncInputs(event.latlng.lat, event.latlng.lng);
    });

    if (navigator.geolocation && !latInput.value && !lonInput.value) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          map.setView([lat, lon], 15);
          marker.setLatLng([lat, lon]);
          syncInputs(lat, lon);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    }
  };

  const initSpawnAreaMap = () => {
    const mapElement = document.getElementById('courier-rush-spawn-area-map');
    const outputInput = document.querySelector('[data-courier-spawn-area-input]');
    if (!mapElement || !outputInput) {
      return;
    }

    const centerLat = parseFloatSafe(mapElement.dataset.centerLat, 51.05);
    const centerLon = parseFloatSafe(mapElement.dataset.centerLon, 3.72);

    const map = L.map(mapElement).setView([centerLat, centerLon], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const saveLayerGeometry = (layer) => {
      if (!layer || typeof layer.toGeoJSON !== 'function') {
        outputInput.value = '';
        return;
      }

      const geometry = layer.toGeoJSON().geometry;
      if (!geometry || geometry.type !== 'Polygon') {
        outputInput.value = '';
        return;
      }

      outputInput.value = JSON.stringify(geometry);
    };

    const loadExistingGeometry = () => {
      const raw = mapElement.dataset.areaGeojson || outputInput.value || '';
      if (!raw) {
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        const geometry = parsed?.type === 'Feature' ? parsed.geometry : parsed;
        if (!geometry || geometry.type !== 'Polygon') {
          return;
        }

        const layer = L.geoJSON({ type: 'Feature', geometry }).getLayers()[0];
        if (!layer) {
          return;
        }

        drawnItems.clearLayers();
        drawnItems.addLayer(layer);
        if (typeof layer.getBounds === 'function') {
          map.fitBounds(layer.getBounds(), { padding: [20, 20] });
        }
        saveLayerGeometry(layer);
      } catch {
        outputInput.value = '';
      }
    };

    if (typeof L.Control.Draw !== 'function') {
      loadExistingGeometry();
      return;
    }

    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
      draw: {
        marker: false,
        polyline: false,
        circle: false,
        circlemarker: false,
        polygon: {
          allowIntersection: false,
          showArea: true,
        },
        rectangle: true,
      },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (event) => {
      drawnItems.clearLayers();
      drawnItems.addLayer(event.layer);
      saveLayerGeometry(event.layer);
    });

    map.on(L.Draw.Event.EDITED, (event) => {
      const firstLayer = event.layers.getLayers()[0] || null;
      saveLayerGeometry(firstLayer);
    });

    map.on(L.Draw.Event.DELETED, () => {
      outputInput.value = '';
    });

    loadExistingGeometry();
  };

  initDropoffMap();
  initSpawnAreaMap();
})();
