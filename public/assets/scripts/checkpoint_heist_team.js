(() => {
  const root = document.getElementById('checkpoint-heist-team');
  const mapElement = document.getElementById('checkpoint-heist-team-map');
  const scoreElement = document.querySelector('[data-checkpoint-score]');
  const statusElement = document.querySelector('[data-checkpoint-status]');
  const stageElement = document.getElementById('checkpoint-heist-stage');
  const captureButton = document.getElementById('checkpoint-heist-capture-btn');
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
  let checkpointCircle = null;
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

    ws.send('checkpoint_heist.team.bootstrap', {});
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

    const checkpoint = payload.currentCheckpoint || null;
    if (!checkpoint) {
      stageElement.innerHTML = `<p class="muted">${t('all_captured', 'All checkpoints captured.')}</p>`;
      captureButton.disabled = true;
      captureButton.textContent = t('completed', 'Completed');
      setStatus(t('finished', 'Finished'));
      return;
    }

    stageElement.innerHTML = `<p><strong>${tr('stage_label', { order: checkpoint.orderIndex, title: checkpoint.title }, 'Stage %order%: %title%')}</strong></p><p class="muted">${tr('value_points', { points: checkpoint.pointsValue || 0 }, 'Value: %points% points')}</p>`;

    if (!checkpointCircle) {
      checkpointCircle = L.circle([checkpoint.latitude, checkpoint.longitude], {
        radius: Number(checkpoint.radius || 25),
        color: checkpoint.markerColor || '#dc2626',
        fillColor: checkpoint.markerColor || '#dc2626',
        fillOpacity: 0.15,
      }).addTo(map);
    } else {
      checkpointCircle.setLatLng([checkpoint.latitude, checkpoint.longitude]);
    }

    captureButton.disabled = !checkpoint.nearby;
    captureButton.textContent = checkpoint.nearby ? t('capture_checkpoint', 'Capture checkpoint') : t('move_into_range', 'Move into range');
    setStatus(checkpoint.nearby ? t('ready_to_capture', 'Ready to capture') : t('in_progress', 'In progress'));
  };

  captureButton.addEventListener('click', () => {
    if (!ws || !ws.isOpen() || captureButton.disabled) {
      return;
    }

    ws.send('checkpoint_heist.capture.confirm', {});
  });

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => updateLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
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
      if (ack.command === 'checkpoint_heist.team.bootstrap') {
        render(ack.payload || {});
      }

      if (ack.command === 'checkpoint_heist.capture.confirm') {
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
