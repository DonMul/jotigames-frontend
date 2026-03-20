(() => {
  const root = document.getElementById('territory-team');
  const mapElement = document.getElementById('territory-team-map');
  const zonesElement = document.getElementById('territory-team-zones');
  const scoreElement = document.querySelector('[data-territory-score]');
  const statusElement = document.querySelector('[data-territory-status]');
  if (!root || !mapElement || typeof L === 'undefined') {
    return;
  }

  let copy = {};
  try {
    copy = JSON.parse(root.dataset.copy || '{}');
  } catch {
    copy = {};
  }

  const map = L.map(mapElement).setView([51.05, 3.72], 15);
  const dashboardUrl = root.dataset.dashboardUrl || '/team/dashboard';
  const leaderboard = window.JotiTeamLeaderboard?.create(
    root.querySelector('[data-team-leaderboard]'),
    { currentTeamId: root.dataset.wsTeamId || root.dataset.currentTeamId || '' }
  );
  const logoUrl = root.dataset.logoUrl || '';
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

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setView([position.coords.latitude, position.coords.longitude], 16);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  let teamMarker;
  let wsClient = null;
  let locationPushTimer = null;
  let currentPosition = null;
  let redirectedToDashboard = false;
  const zoneLayerGroup = L.layerGroup().addTo(map);
  const fallbackCurrentTeamId = root.dataset.currentTeamId || null;

  const locationHeaders = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-TOKEN': root.dataset.csrfLocation,
  };

  const captureHeaders = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-TOKEN': root.dataset.csrfCapture,
  };

  const setStatus = (text) => {
    if (statusElement) statusElement.textContent = text;
  };

  const ensureActiveGameWindow = (payload) => {
    const status = String(payload?.gameWindow?.status || '').toLowerCase();
    const active = status === '' ? true : status === 'active';
    if (active || redirectedToDashboard) {
      return true;
    }

    redirectedToDashboard = true;
    window.location.assign(dashboardUrl);
    return false;
  };

  const updateLocation = (coords) => {
    currentPosition = {
      latitude: coords.latitude,
      longitude: coords.longitude,
    };

    if (wsClient && wsClient.isOpen()) {
      wsClient.send('team.location.update', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        requestNearby: false,
      });

      if (!teamMarker) {
        teamMarker = L.marker([coords.latitude, coords.longitude], teamIcon ? { icon: teamIcon } : undefined).addTo(map);
        map.setView([coords.latitude, coords.longitude], 16);
      } else {
        teamMarker.setLatLng([coords.latitude, coords.longitude]);
        if (teamIcon) {
          teamMarker.setIcon(teamIcon);
        }
      }
      return;
    }

    fetch(root.dataset.locationUrl, {
      method: 'POST',
      headers: locationHeaders,
      credentials: 'same-origin',
      body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
    });

    if (!teamMarker) {
      teamMarker = L.marker([coords.latitude, coords.longitude], teamIcon ? { icon: teamIcon } : undefined).addTo(map);
      map.setView([coords.latitude, coords.longitude], 16);
      return;
    }
    teamMarker.setLatLng([coords.latitude, coords.longitude]);
    if (teamIcon) {
      teamMarker.setIcon(teamIcon);
    }
  };

  const pushLocation = () => {
    if (!currentPosition || !wsClient || !wsClient.isOpen()) {
      return;
    }

    wsClient.send('team.location.update', {
      latitude: currentPosition.latitude,
      longitude: currentPosition.longitude,
      requestNearby: false,
    });
  };

  const captureZone = async (zoneId) => {
    const url = root.dataset.captureUrlTemplate.replace('ZONE_ID', String(zoneId));
    const response = await fetch(url, {
      method: 'POST',
      headers: captureHeaders,
      credentials: 'same-origin',
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      setStatus(copy.capture_failed || '');
      return;
    }
    const payload = await response.json();
    if (scoreElement && payload.score !== undefined) {
      scoreElement.textContent = String(payload.score);
    }
    setStatus(copy.captured || '');
    requestSnapshot();
  };

  const normalizeId = (value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  };

  const getZoneColor = (zone, currentTeamId) => {
    const ownerId = normalizeId(zone.ownerTeamId);
    if (!ownerId) {
      return '#2563eb';
    }

    const currentId = normalizeId(currentTeamId);
    if (currentId && ownerId === currentId) {
      return '#16a34a';
    }

    return '#dc2626';
  };

  const renderZonesOnMap = (zones, currentTeamId) => {
    zoneLayerGroup.clearLayers();

    zones.forEach((zone) => {
      const color = getZoneColor(zone, currentTeamId);

      L.circle([zone.latitude, zone.longitude], {
        radius: zone.radius,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.18,
      })
        .bindPopup(`<strong>${zone.title}</strong>`)
        .addTo(zoneLayerGroup);

      L.circleMarker([zone.latitude, zone.longitude], {
        radius: 6,
        color,
        fillColor: color,
        fillOpacity: 1,
        weight: 1,
      }).addTo(zoneLayerGroup);
    });
  };

  const render = (payload) => {
    if (!ensureActiveGameWindow(payload)) {
      return;
    }

    if (scoreElement && payload.score !== undefined) {
      scoreElement.textContent = String(payload.score);
    }

    leaderboard?.render(payload.leaderboard || [], {
      metricDirection: payload.leaderboardMetricDirection || 'desc',
    });

    const allZones = payload.zones || [];
    const currentTeamId = payload.currentTeamId ?? fallbackCurrentTeamId;
    renderZonesOnMap(allZones, currentTeamId);

    const zones = allZones
      .filter((zone) => zone.nearby)
      .map((zone) => {
        const ownerLabel = zone.ownerTeam || '-';
        return `<div class="geo-card"><strong>${zone.title}</strong><p>${copy.owner_label || ''}: ${ownerLabel}</p><button class="btn btn-primary btn-small" data-zone="${zone.id}">${copy.capture || ''}</button></div>`;
      })
      .join('');

    zonesElement.innerHTML = zones || '<p class="muted">-</p>';
    zonesElement.querySelectorAll('[data-zone]').forEach((button) => {
      button.addEventListener('click', () => captureZone(button.dataset.zone));
    });
  };

  const requestSnapshot = () => {
    if (!wsClient || !wsClient.isOpen()) {
      return;
    }

    if (typeof wsClient.isAuthenticated === 'function' && !wsClient.isAuthenticated()) {
      return;
    }

    wsClient.send('territory_control.team.bootstrap', {});
  };

  if (!navigator.geolocation) {
    setStatus(copy.location_unsupported || '');
  } else {
    navigator.geolocation.watchPosition(
      (position) => {
        const coords = position.coords;
        updateLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setStatus(copy.gps_active || '');
      },
      () => setStatus(copy.location_required || ''),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
  }

  let snapshotTimer = null;

  const wsTeamId = root.dataset.wsTeamId || '';
  const wsTeamCode = root.dataset.wsTeamCode || '';
  if (window.JotiWs && wsTeamId && wsTeamCode) {
    wsClient = window.JotiWs.connect({
      role: 'team',
      teamId: wsTeamId,
      teamCode: wsTeamCode,
      reconnectMs: 3000,
    });

    wsClient.onOpen(() => {
      if (snapshotTimer) {
        window.clearInterval(snapshotTimer);
      }
      snapshotTimer = window.setInterval(requestSnapshot, 10000);
      pushLocation();

      if (locationPushTimer) {
        window.clearInterval(locationPushTimer);
      }
      locationPushTimer = window.setInterval(pushLocation, 10000);

      requestSnapshot();
    });

    wsClient.onAuthenticated(() => {
      requestSnapshot();
    });

    wsClient.onClose(() => {
      if (snapshotTimer) {
        window.clearInterval(snapshotTimer);
        snapshotTimer = null;
      }

      if (locationPushTimer) {
        window.clearInterval(locationPushTimer);
        locationPushTimer = null;
      }
    });

    wsClient.onEvent((event) => {
      if (event.command === 'admin.message.team') {
        window.JotiTeamMessageModal?.show?.(event.payload?.message);
        return;
      }

      if (
        event.command === 'team.location.updated'
        || event.command === 'territory_control.zone.owner_changed'
        || event.command === 'territory_control.scores.updated'
        || event.command === 'super_admin.team.force_updated'
      ) {
        requestSnapshot();
        return;
      }

      requestSnapshot();
    });
    wsClient.onAck((ack) => {
      if (ack.command === 'territory_control.team.bootstrap') {
        render(ack.payload || {});
        return;
      }

      requestSnapshot();
    });
  }
})();
