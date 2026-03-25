(() => {
  const root = document.getElementById('pandemic-response-team');
  const mapElement = document.getElementById('pandemic-response-team-map');
  const scoreElement = document.querySelector('[data-pandemic-score]');
  const statusElement = document.querySelector('[data-pandemic-status]');
  const hotspotsElement = document.getElementById('pandemic-response-hotspots');
  const pickupsElement = document.getElementById('pandemic-response-pickups');
  const resourcesElement = document.getElementById('pandemic-response-resources');
  if (!root || !mapElement || typeof L === 'undefined') {
    return;
  }

  const dashboardUrl = root.dataset.dashboardUrl || '/team';
  const logoUrl = root.dataset.logoUrl || '';
  const copy = (() => {
    try {
      return JSON.parse(root.dataset.copy || '{}');
    } catch (_) {
      return {};
    }
  })();
  const t = (key, fallback) => String(copy[key] || fallback || '');
  const tr = (key, replacements = {}, fallback = '') => {
    let text = t(key, fallback);
    Object.entries(replacements).forEach(([token, value]) => {
      text = text.replaceAll(`%${token}%`, String(value ?? ''));
    });
    return text;
  };

  const map = L.map(mapElement).setView([51.05, 3.72], 15);
  const leaderboard = window.JotiTeamLeaderboard?.create(
    root.querySelector('[data-team-leaderboard]'),
    { currentTeamId: root.dataset.wsTeamId || '' }
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const teamIcon = logoUrl
    ? L.icon({
      iconUrl: logoUrl,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      className: 'geo-team-icon',
    })
    : null;

  let teamMarker = null;
  const hotspotCircles = new Map();
  const pickupMarkers = new Map();
  let centerMarker = null;
  let ws = null;
  let latestLocation = null;
  let locationPushInterval = null;

  const setStatus = (text) => {
    if (statusElement) {
      statusElement.textContent = text || '';
    }
  };

  const ensureActive = (payload) => {
    const status = String(payload?.gameWindow?.status || '').toLowerCase();
    if (status && status !== 'active') {
      window.location.assign(dashboardUrl);
      return false;
    }

    return true;
  };

  const requestSnapshot = () => {
    if (!ws || !ws.isOpen() || (typeof ws.isAuthenticated === 'function' && !ws.isAuthenticated())) {
      return;
    }

    ws.send('pandemic_response.team.bootstrap', {});
  };

  const updateLocation = (coords) => {
    latestLocation = {
      latitude: Number(coords.latitude),
      longitude: Number(coords.longitude),
    };

    if (!teamMarker) {
      teamMarker = L.marker([latestLocation.latitude, latestLocation.longitude], teamIcon ? { icon: teamIcon } : undefined).addTo(map);
      map.setView([latestLocation.latitude, latestLocation.longitude], 16);
    } else {
      teamMarker.setLatLng([latestLocation.latitude, latestLocation.longitude]);
      if (teamIcon) {
        teamMarker.setIcon(teamIcon);
      }
    }

    if (ws && ws.isOpen()) {
      ws.send('team.location.update', {
        latitude: latestLocation.latitude,
        longitude: latestLocation.longitude,
        requestNearby: false,
      });
    }
  };

  const render = (payload) => {
    if (!ensureActive(payload)) {
      return;
    }

    if (scoreElement && payload.score !== undefined) {
      scoreElement.textContent = String(payload.score);
    }

    leaderboard?.render(payload.leaderboard || [], {
      metricDirection: payload.leaderboardMetricDirection || 'desc',
    });

    const hotspots = payload.hotspots || [];
    const pickupPoints = payload.pickupPoints || [];
    const resources = payload.resources || {};

    if (resourcesElement) {
      resourcesElement.innerHTML = `<div class="stack"><div class="geo-card"><strong>${t('resources', 'Resources')}</strong><p>First aid: ${Number(resources.first_aid || 0)}</p><p>Portable lab: ${Number(resources.portable_lab || 0)}</p><p>Field kit: ${Number(resources.field_kit || 0)}</p></div></div>`;
    }

    const centerPoint = payload.centerPoint || null;
    if (centerPoint && Number.isFinite(Number(centerPoint.latitude)) && Number.isFinite(Number(centerPoint.longitude))) {
      const centerLatLng = [Number(centerPoint.latitude), Number(centerPoint.longitude)];
      if (!centerMarker) {
        centerMarker = L.circleMarker(centerLatLng, {
          radius: 7,
          color: '#2563eb',
          fillColor: '#2563eb',
          fillOpacity: 1,
        }).addTo(map);
        centerMarker.bindPopup('Central depot');
      } else {
        centerMarker.setLatLng(centerLatLng);
      }
    }

    const visibleHotspots = hotspots.filter((hotspot) => (
      Boolean(hotspot?.nearby)
      && !Boolean(hotspot?.resolved)
      && Number.isFinite(Number(hotspot?.latitude))
      && Number.isFinite(Number(hotspot?.longitude))
    ));

    const visibleHotspotIds = new Set(visibleHotspots.map((hotspot) => String(hotspot.id || '')));
    hotspotCircles.forEach((circle, id) => {
      if (!visibleHotspotIds.has(id)) {
        map.removeLayer(circle);
        hotspotCircles.delete(id);
      }
    });

    visibleHotspots.forEach((hotspot) => {
      const hotspotId = String(hotspot.id || '');
      const latitude = Number(hotspot.latitude);
      const longitude = Number(hotspot.longitude);
      const radius = Number(hotspot.radius || 25);
      const markerColor = hotspot.markerColor || '#dc2626';

      if (!hotspotCircles.has(hotspotId)) {
        const circle = L.circle([latitude, longitude], {
          radius,
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.15,
        }).addTo(map);
        circle.bindPopup(tr('hotspot_in_range', { title: hotspot.title }, 'Hotspot in range: %title%'));
        hotspotCircles.set(hotspotId, circle);
        return;
      }

      const circle = hotspotCircles.get(hotspotId);
      circle.setLatLng([latitude, longitude]);
      circle.setRadius(radius);
      circle.setStyle({
        color: markerColor,
        fillColor: markerColor,
      });
      circle.bindPopup(tr('hotspot_in_range', { title: hotspot.title }, 'Hotspot in range: %title%'));
    });

    const pickupIds = new Set(pickupPoints.map((pickup) => String(pickup.id || '')));
    pickupMarkers.forEach((marker, id) => {
      if (!pickupIds.has(id)) {
        map.removeLayer(marker);
        pickupMarkers.delete(id);
      }
    });

    pickupPoints.forEach((pickup) => {
      const pickupId = String(pickup.id || '');
      const latitude = Number(pickup.latitude);
      const longitude = Number(pickup.longitude);
      const radius = Number(pickup.radius || 25);
      const markerColor = pickup.markerColor || '#2563eb';
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      if (!pickupMarkers.has(pickupId)) {
        const marker = L.circle([latitude, longitude], {
          radius,
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.1,
        }).addTo(map);
        marker.bindPopup(`${pickup.title} (${pickup.resourceType})`);
        pickupMarkers.set(pickupId, marker);
      } else {
        const marker = pickupMarkers.get(pickupId);
        marker.setLatLng([latitude, longitude]);
        marker.setRadius(radius);
        marker.setStyle({ color: markerColor, fillColor: markerColor });
      }
    });

    hotspotsElement.innerHTML = hotspots.length
      ? `<div class="stack">${hotspots.map((hotspot) => {
        const req = hotspot.requiredResources || {};
        const reqText = `🧰${Number(req.first_aid || 0)} 🔬${Number(req.portable_lab || 0)} 🧪${Number(req.field_kit || 0)}`;
        if (hotspot.resolved) {
          return `<div class="geo-card"><strong>${hotspot.title}</strong><p>${tr('severity', { value: hotspot.severity || 1 }, 'Severity: %value%')}</p><p class="muted">${t('resolved', 'Resolved')}</p></div>`;
        }
        if (!hotspot.nearby) {
          return `<div class="geo-card"><strong>${hotspot.title}</strong><p>${tr('severity', { value: hotspot.severity || 1 }, 'Severity: %value%')}</p><p>Need: ${reqText}</p><p class="muted">${t('move_closer', 'Move closer')}</p></div>`;
        }
        if (!hotspot.canResolve) {
          return `<div class="geo-card"><strong>${hotspot.title}</strong><p>${tr('severity', { value: hotspot.severity || 1 }, 'Severity: %value%')}</p><p>Need: ${reqText}</p><p class="muted">${t('missing_resources', 'Missing resources')}</p></div>`;
        }
        return `<div class="geo-card"><strong>${hotspot.title}</strong><p>${tr('severity', { value: hotspot.severity || 1 }, 'Severity: %value%')}</p><p>${t('points', 'Points')}: ${Number(hotspot.points || 0)}</p><p>Need: ${reqText}</p><button class="btn btn-primary btn-small" data-resolve="${hotspot.id}">${t('resolve', 'Resolve')}</button></div>`;
      }).join('')}</div>`
      : `<p class="muted">${t('no_hotspots', 'No hotspots available.')}</p>`;

    if (pickupsElement) {
      pickupsElement.innerHTML = pickupPoints.length
        ? `<div class="stack">${pickupPoints.map((pickup) => `<div class="geo-card"><strong>${pickup.title}</strong><p>${pickup.resourceType}</p>${pickup.nearby ? `<button class="btn btn-info btn-small" data-collect="${pickup.id}">${t('collect', 'Collect')}</button>` : `<p class="muted">${t('move_closer', 'Move closer')}</p>`}</div>`).join('')}</div>`
        : `<p class="muted">${t('no_pickups', 'No supply points available.')}</p>`;
    }

    hotspotsElement.querySelectorAll('[data-resolve]').forEach((button) => {
      button.addEventListener('click', () => {
        ws?.send('pandemic_response.hotspot.resolve', { hotspotId: button.dataset.resolve });
      });
    });

    pickupsElement?.querySelectorAll('[data-collect]').forEach((button) => {
      button.addEventListener('click', () => {
        ws?.send('pandemic_response.pickup.collect', { pickupId: button.dataset.collect });
      });
    });
  };

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        updateLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setStatus(t('gps_active', 'GPS active'));
      },
      () => setStatus(t('location_required', 'Location required')),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  if (window.JotiWs && root.dataset.wsTeamId && root.dataset.wsTeamCode) {
    ws = window.JotiWs.connect({
      role: 'team',
      teamId: root.dataset.wsTeamId,
      teamCode: root.dataset.wsTeamCode,
      reconnectMs: 3000,
    });

    ws.onOpen(() => {
      requestSnapshot();
      if (latestLocation) {
        updateLocation(latestLocation);
      }

      if (locationPushInterval) {
        window.clearInterval(locationPushInterval);
      }
      locationPushInterval = window.setInterval(() => {
        if (latestLocation) {
          updateLocation(latestLocation);
        }
      }, 10000);
    });

    ws.onAuthenticated(() => {
      requestSnapshot();
      if (latestLocation) {
        updateLocation(latestLocation);
      }

      if (locationPushInterval) {
        window.clearInterval(locationPushInterval);
      }
      locationPushInterval = window.setInterval(() => {
        if (latestLocation) {
          updateLocation(latestLocation);
        }
      }, 10000);
    });

    ws.onClose(() => {
      if (locationPushInterval) {
        window.clearInterval(locationPushInterval);
        locationPushInterval = null;
      }
    });

    ws.onEvent((event) => {
      if (event.command === 'admin.message.team') {
        window.JotiTeamMessageModal?.show?.(event.payload?.message);
        return;
      }

      requestSnapshot();
    });

    ws.onAck((ack) => {
      if (ack.command === 'pandemic_response.team.bootstrap') {
        render(ack.payload || {});
      }

      if (ack.command === 'pandemic_response.hotspot.resolve') {
        requestSnapshot();
      }

      if (ack.command === 'pandemic_response.pickup.collect') {
        requestSnapshot();
      }
    });

    ws.onError((error) => {
      if (error?.code === 'game_frozen') {
        ensureActive({ gameWindow: error.details?.gameWindow });
      }
    });
  }
})();
