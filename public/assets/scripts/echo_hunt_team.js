(() => {
  const root = document.getElementById('echo-hunt-team');
  const mapElement = document.getElementById('echo-hunt-team-map');
  const scoreElement = document.querySelector('[data-echo-score]');
  const statusElement = document.querySelector('[data-echo-status]');
  const signalsElement = document.getElementById('echo-hunt-signals');
  if (!root || !mapElement || typeof L === 'undefined') {
    return;
  }

  const dashboardUrl = root.dataset.dashboardUrl || '/team/dashboard';
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
  const beaconCircles = new Map();
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

    ws.send('echo_hunt.team.bootstrap', {});
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

    const signals = payload.signals || [];

    const visibleBeaconSignals = signals.filter((signal) => (
      Boolean(signal?.nearby)
      && !Boolean(signal?.found)
      && Number.isFinite(Number(signal?.latitude))
      && Number.isFinite(Number(signal?.longitude))
    ));

    const visibleBeaconIds = new Set(visibleBeaconSignals.map((signal) => String(signal.id || '')));
    beaconCircles.forEach((circle, id) => {
      if (!visibleBeaconIds.has(id)) {
        map.removeLayer(circle);
        beaconCircles.delete(id);
      }
    });

    visibleBeaconSignals.forEach((signal) => {
      const signalId = String(signal.id || '');
      const latitude = Number(signal.latitude);
      const longitude = Number(signal.longitude);
      const radius = Number(signal.radius || 25);
      const markerColor = signal.markerColor || '#7c3aed';

      if (!beaconCircles.has(signalId)) {
        const circle = L.circle([latitude, longitude], {
          radius,
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.15,
        }).addTo(map);
        circle.bindPopup(tr('beacon_in_range', { title: signal.title }, 'Beacon in range: %title%'));
        beaconCircles.set(signalId, circle);
        return;
      }

      const circle = beaconCircles.get(signalId);
      circle.setLatLng([latitude, longitude]);
      circle.setRadius(radius);
      circle.setStyle({
        color: markerColor,
        fillColor: markerColor,
      });
      circle.bindPopup(tr('beacon_in_range', { title: signal.title }, 'Beacon in range: %title%'));
    });

    signalsElement.innerHTML = signals.length
      ? `<div class="stack">${signals.map((signal) => `<div class="geo-card"><strong>${signal.title}</strong><p>${tr('signal_percent', { value: signal.signal || 0 }, 'Signal: %value%%')}</p>${signal.found ? `<p class="muted">${t('found', 'Found')}</p>` : (signal.nearby ? `<button class="btn btn-primary btn-small" data-claim="${signal.id}">${t('claim', 'Claim')}</button>` : `<p class="muted">${t('move_closer', 'Move closer')}</p>`)}</div>`).join('')}</div>`
      : `<p class="muted">${t('no_signals', 'No signals available.')}</p>`;

    signalsElement.querySelectorAll('[data-claim]').forEach((button) => {
      button.addEventListener('click', () => {
        ws?.send('echo_hunt.beacon.claim', { beaconId: button.dataset.claim });
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
      if (ack.command === 'echo_hunt.team.bootstrap') {
        render(ack.payload || {});
      }

      if (ack.command === 'echo_hunt.beacon.claim') {
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
