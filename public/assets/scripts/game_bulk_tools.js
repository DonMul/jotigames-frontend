(() => {
  const mapElement = document.getElementById('game-bulk-geo-map');
  const form = document.getElementById('game-bulk-geo-form');
  if (!mapElement || !form || typeof L === 'undefined') {
    return;
  }

  const latInput = form.querySelector('[data-bulk-lat]');
  const lonInput = form.querySelector('[data-bulk-lon]');
  const radiusInput = form.querySelector('[data-bulk-scatter-radius]');
  if (!latInput || !lonInput || !radiusInput) {
    return;
  }

  const toNumber = (value, fallback) => {
    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const toInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const initialLat = toNumber(latInput.value, 51.05);
  const initialLon = toNumber(lonInput.value, 3.72);
  const initialRadius = Math.max(20, toInt(radiusInput.value, 400));

  const map = L.map(mapElement).setView([initialLat, initialLon], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const marker = L.marker([initialLat, initialLon], { draggable: true }).addTo(map);
  const circle = L.circle([initialLat, initialLon], {
    radius: initialRadius,
    color: '#1f7a8c',
    fillColor: '#1f7a8c',
    fillOpacity: 0.12,
  }).addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        latInput.value = lat.toFixed(6);
        lonInput.value = lon.toFixed(6);
        map.setView([lat, lon], 13);
        marker.setLatLng([lat, lon]);
        circle.setLatLng([lat, lon]);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 },
    );
  }

  const syncCenter = (lat, lon) => {
    latInput.value = lat.toFixed(6);
    lonInput.value = lon.toFixed(6);
    marker.setLatLng([lat, lon]);
    circle.setLatLng([lat, lon]);
  };

  marker.on('dragend', (event) => {
    const next = event.target.getLatLng();
    syncCenter(next.lat, next.lng);
  });

  map.on('click', (event) => {
    syncCenter(event.latlng.lat, event.latlng.lng);
  });

  radiusInput.addEventListener('input', () => {
    const radius = Math.max(20, toInt(radiusInput.value, 400));
    circle.setRadius(radius);
  });

  latInput.addEventListener('change', () => {
    const lat = toNumber(latInput.value, marker.getLatLng().lat);
    const lon = toNumber(lonInput.value, marker.getLatLng().lng);
    syncCenter(lat, lon);
    map.setView([lat, lon], map.getZoom());
  });

  lonInput.addEventListener('change', () => {
    const lat = toNumber(latInput.value, marker.getLatLng().lat);
    const lon = toNumber(lonInput.value, marker.getLatLng().lng);
    syncCenter(lat, lon);
    map.setView([lat, lon], map.getZoom());
  });
})();
