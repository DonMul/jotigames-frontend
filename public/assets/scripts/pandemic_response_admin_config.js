(() => {
  if (typeof L === 'undefined') {
    return;
  }

  const mapElement = document.getElementById('pandemic-response-config-map');
  const centerLatInput = document.querySelector('[data-pandemic-center-lat]');
  const centerLonInput = document.querySelector('[data-pandemic-center-lon]');
  const areaInput = document.getElementById('pandemic-response-area-geojson');
  if (!mapElement || !centerLatInput || !centerLonInput || !areaInput) {
    return;
  }

  const parseNumber = (value, fallback) => {
    const parsed = Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const centerLat = parseNumber(mapElement.dataset.centerLat, 51.05);
  const centerLon = parseNumber(mapElement.dataset.centerLon, 3.72);

  const map = L.map(mapElement).setView([centerLat, centerLon], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const centerMarker = L.marker([centerLat, centerLon], { draggable: true }).addTo(map);

  const updateCenterInputs = (lat, lon) => {
    centerLatInput.value = Number(lat).toFixed(6);
    centerLonInput.value = Number(lon).toFixed(6);
  };

  centerMarker.on('dragend', (event) => {
    const { lat, lng } = event.target.getLatLng();
    updateCenterInputs(lat, lng);
  });

  const polygonPoints = [];
  const pointMarkers = [];
  let polygonLayer = null;

  const clearPolygon = () => {
    while (pointMarkers.length) {
      const marker = pointMarkers.pop();
      map.removeLayer(marker);
    }

    polygonPoints.length = 0;

    if (polygonLayer) {
      map.removeLayer(polygonLayer);
      polygonLayer = null;
    }

    areaInput.value = '';
  };

  const syncPolygon = () => {
    if (polygonLayer) {
      map.removeLayer(polygonLayer);
      polygonLayer = null;
    }

    if (polygonPoints.length < 3) {
      areaInput.value = '';
      return;
    }

    polygonLayer = L.polygon(polygonPoints, {
      color: '#dc2626',
      fillColor: '#dc2626',
      fillOpacity: 0.15,
    }).addTo(map);

    const ring = polygonPoints.map((point) => [Number(point.lng), Number(point.lat)]);
    ring.push([Number(polygonPoints[0].lng), Number(polygonPoints[0].lat)]);

    areaInput.value = JSON.stringify({
      type: 'Polygon',
      coordinates: [ring],
    });
  };

  map.on('click', (event) => {
    const marker = L.circleMarker(event.latlng, {
      radius: 5,
      color: '#111827',
      fillColor: '#111827',
      fillOpacity: 1,
    }).addTo(map);

    pointMarkers.push(marker);
    polygonPoints.push(event.latlng);
    syncPolygon();
  });

  const controls = L.control({ position: 'topright' });
  controls.onAdd = () => {
    const wrapper = L.DomUtil.create('div', 'leaflet-bar');
    const clearButton = L.DomUtil.create('button', 'map-fullscreen-control__btn', wrapper);
    clearButton.type = 'button';
    clearButton.textContent = '↺';
    clearButton.title = 'Clear area';
    clearButton.setAttribute('aria-label', 'Clear area');

    const finishButton = L.DomUtil.create('button', 'map-fullscreen-control__btn', wrapper);
    finishButton.type = 'button';
    finishButton.textContent = '✓';
    finishButton.title = 'Close polygon';
    finishButton.setAttribute('aria-label', 'Close polygon');

    L.DomEvent.disableClickPropagation(wrapper);

    L.DomEvent.on(clearButton, 'click', (event) => {
      L.DomEvent.preventDefault(event);
      clearPolygon();
    });

    L.DomEvent.on(finishButton, 'click', (event) => {
      L.DomEvent.preventDefault(event);
      syncPolygon();
    });

    return wrapper;
  };
  controls.addTo(map);

  const rawGeoJson = String(mapElement.dataset.areaGeojson || '').trim();
  if (rawGeoJson !== '') {
    try {
      const geo = JSON.parse(rawGeoJson);
      const ring = Array.isArray(geo?.coordinates?.[0]) ? geo.coordinates[0] : [];
      ring.slice(0, -1).forEach((pair) => {
        if (!Array.isArray(pair) || pair.length < 2) {
          return;
        }
        const latlng = L.latLng(Number(pair[1]), Number(pair[0]));
        polygonPoints.push(latlng);
        pointMarkers.push(L.circleMarker(latlng, {
          radius: 5,
          color: '#111827',
          fillColor: '#111827',
          fillOpacity: 1,
        }).addTo(map));
      });
      syncPolygon();
    } catch (_) {
      areaInput.value = '';
    }
  }

  updateCenterInputs(centerLat, centerLon);
})();
