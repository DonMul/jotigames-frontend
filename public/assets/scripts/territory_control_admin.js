(() => {
  const mapContainer = document.getElementById('territory-admin-map') || document.getElementById('territory-zone-map');
  if (!mapContainer || typeof L === 'undefined') {
    return;
  }

  const parseFloatSafe = (value, fallback) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const latInput = document.querySelector('[data-territory-lat]');
  const lonInput = document.querySelector('[data-territory-lon]');
  const isNewZoneForm = mapContainer.id === 'territory-zone-map' && mapContainer.dataset.isNew === '1';

  const hasZoneData = mapContainer.dataset.zones !== undefined;
  const initialLat = parseFloatSafe(mapContainer.dataset.lat, 51.05);
  const initialLon = parseFloatSafe(mapContainer.dataset.lon, 3.72);

  const map = L.map(mapContainer).setView(
    [initialLat, initialLon],
    hasZoneData ? 13 : 15,
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const centerOnCurrentLocation = (zoom = 15, onSuccess) => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        map.setView([lat, lon], zoom);
        if (onSuccess) {
          onSuccess(lat, lon);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  if (hasZoneData) {
    let zones = [];
    try {
      zones = JSON.parse(mapContainer.dataset.zones || '[]');
    } catch {
      zones = [];
    }

    const bounds = [];
    zones.forEach((zone) => {
      const marker = L.marker([zone.latitude, zone.longitude]).addTo(map);
      marker.bindPopup(zone.title);
      L.circle([zone.latitude, zone.longitude], {
        radius: zone.radius ?? zone.radiusMeters ?? 35,
      }).addTo(map);
      bounds.push([zone.latitude, zone.longitude]);
    });

    centerOnCurrentLocation(13, () => {});
    return;
  }

  const marker = L.marker([initialLat, initialLon], { draggable: true }).addTo(map);

  const syncInputs = (lat, lon) => {
    if (latInput) latInput.value = lat.toFixed(6);
    if (lonInput) lonInput.value = lon.toFixed(6);
  };

  syncInputs(initialLat, initialLon);

  if (isNewZoneForm) {
    centerOnCurrentLocation(15, (lat, lon) => {
      marker.setLatLng([lat, lon]);
      syncInputs(lat, lon);
    });
  }

  marker.on('dragend', (event) => {
    const { lat, lng } = event.target.getLatLng();
    syncInputs(lat, lng);
  });

  map.on('click', (event) => {
    marker.setLatLng(event.latlng);
    syncInputs(event.latlng.lat, event.latlng.lng);
  });
})();
