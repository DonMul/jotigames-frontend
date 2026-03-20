(() => {
  const mapContainer = document.getElementById('checkpoint-heist-form-map');
  if (!mapContainer || typeof L === 'undefined') {
    return;
  }

  const latInput = document.querySelector('[data-checkpoint-lat]');
  const lonInput = document.querySelector('[data-checkpoint-lon]');
  const radiusInput = document.getElementById('checkpoint-radius');
  const colorInput = document.getElementById('checkpoint-color');

  if (!latInput || !lonInput) {
    return;
  }

  const parseFloatSafe = (value, fallback) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const parseIntSafe = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const fallbackLat = 51.05;
  const fallbackLon = 3.72;
  const hasInitialCoordinates = latInput.value !== '' && lonInput.value !== '';

  const initialLat = hasInitialCoordinates
    ? parseFloatSafe(latInput.value, fallbackLat)
    : parseFloatSafe(mapContainer.dataset.lat, fallbackLat);
  const initialLon = hasInitialCoordinates
    ? parseFloatSafe(lonInput.value, fallbackLon)
    : parseFloatSafe(mapContainer.dataset.lon, fallbackLon);

  const map = L.map(mapContainer).setView([initialLat, initialLon], hasInitialCoordinates ? 15 : 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  let marker = null;
  let radius = null;

  const syncVisual = () => {
    const lat = parseFloatSafe(latInput.value, initialLat);
    const lon = parseFloatSafe(lonInput.value, initialLon);
    const radiusMeters = Math.max(5, parseIntSafe(radiusInput?.value, 25));
    const markerColor = colorInput?.value || '#dc2626';

    if (!marker) {
      marker = L.marker([lat, lon]).addTo(map);
    } else {
      marker.setLatLng([lat, lon]);
    }

    if (!radius) {
      radius = L.circle([lat, lon], {
        radius: radiusMeters,
        color: markerColor,
        fillColor: markerColor,
        fillOpacity: 0.15,
      }).addTo(map);
    } else {
      radius.setLatLng([lat, lon]);
      radius.setRadius(radiusMeters);
      radius.setStyle({ color: markerColor, fillColor: markerColor });
    }
  };

  const updateCoordinates = (lat, lon) => {
    latInput.value = String(lat.toFixed(6));
    lonInput.value = String(lon.toFixed(6));
    syncVisual();
  };

  map.on('click', (event) => {
    updateCoordinates(event.latlng.lat, event.latlng.lng);
  });

  latInput.addEventListener('input', syncVisual);
  lonInput.addEventListener('input', syncVisual);
  if (radiusInput) {
    radiusInput.addEventListener('input', syncVisual);
  }
  if (colorInput) {
    colorInput.addEventListener('input', syncVisual);
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], hasInitialCoordinates ? 15 : 16);
        if (!hasInitialCoordinates) {
          updateCoordinates(latitude, longitude);
        }
      },
      () => {
        syncVisual();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  } else {
    syncVisual();
  }

  syncVisual();
})();
