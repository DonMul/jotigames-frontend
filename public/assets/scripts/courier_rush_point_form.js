(() => {
  if (typeof L === 'undefined') {
    return;
  }

  const mapElement = document.getElementById('courier-rush-pickup-map') || document.getElementById('courier-rush-dropoff-map');
  const latInput = document.querySelector('[data-courier-point-lat]');
  const lonInput = document.querySelector('[data-courier-point-lon]');
  if (!mapElement || !latInput || !lonInput) {
    return;
  }

  const parseFloatSafe = (value, fallback) => {
    const parsed = Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const fallbackLat = parseFloatSafe(mapElement.dataset.centerLat, 51.05);
  const fallbackLon = parseFloatSafe(mapElement.dataset.centerLon, 3.72);
  const initialLat = parseFloatSafe(latInput.value, fallbackLat);
  const initialLon = parseFloatSafe(lonInput.value, fallbackLon);
  const isNew = mapElement.dataset.isNew === '1';

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

  if (isNew && navigator.geolocation) {
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
})();
