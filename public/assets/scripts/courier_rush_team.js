(() => {
  const root = document.getElementById('courier-rush-team');
  const mapElement = document.getElementById('courier-rush-team-map');
  const scoreElement = document.querySelector('[data-courier-score]');
  const statusElement = document.querySelector('[data-courier-status]');
  const missionElement = document.getElementById('courier-rush-mission');
  const actionBtn = document.getElementById('courier-rush-action-btn');
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
  const pickupCircles = new Map();
  let dropoffCircle = null;
  let ws = null;
  let latestSnapshot = null;
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

  const updateLocation = (coords) => {
    latestLocation = { latitude: Number(coords.latitude), longitude: Number(coords.longitude) };
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

  const requestSnapshot = () => {
    if (!ws || !ws.isOpen() || (typeof ws.isAuthenticated === 'function' && !ws.isAuthenticated())) {
      return;
    }

    ws.send('courier_rush.team.bootstrap', {});
  };

  const snapshotPollIntervalMs = 2500;
  setInterval(() => {
    requestSnapshot();
  }, snapshotPollIntervalMs);

  const renderMission = (payload) => {
    if (!ensureActive(payload)) {
      return;
    }

    latestSnapshot = payload;
    if (scoreElement && payload.score !== undefined) {
      scoreElement.textContent = String(payload.score);
    }

    leaderboard?.render(payload.leaderboard || [], {
      metricDirection: payload.leaderboardMetricDirection || 'desc',
    });

    const pickupOptions = payload.pickupOptions || [];
    const dropoff = payload.dropoff || null;
    const phase = String(payload.phase || 'pickup');
    const carriedPackages = Math.max(0, Number(payload.carriedPackages || 0));

    const pickupIds = new Set(pickupOptions.map((option) => option.id));
    pickupCircles.forEach((circle, id) => {
      if (!pickupIds.has(id)) {
        map.removeLayer(circle);
        pickupCircles.delete(id);
      }
    });

    pickupOptions.forEach((option) => {
      if (!pickupCircles.has(option.id)) {
        const circle = L.circle([option.latitude, option.longitude], {
          radius: Number(option.radius || 25),
          color: option.markerColor || '#2563eb',
          fillColor: option.markerColor || '#2563eb',
          fillOpacity: 0.15,
        }).addTo(map);
        pickupCircles.set(option.id, circle);
        return;
      }

      const circle = pickupCircles.get(option.id);
      circle.setLatLng([option.latitude, option.longitude]);
      circle.setRadius(Number(option.radius || 25));
      circle.setStyle({
        color: option.markerColor || '#2563eb',
        fillColor: option.markerColor || '#2563eb',
      });
    });

    if (dropoff) {
      if (!dropoffCircle) {
        dropoffCircle = L.circle([dropoff.latitude, dropoff.longitude], {
          radius: Number(dropoff.radius || 25),
          color: dropoff.markerColor || '#16a34a',
          fillColor: dropoff.markerColor || '#16a34a',
          fillOpacity: 0.15,
        }).addTo(map);
      } else {
        dropoffCircle.setLatLng([dropoff.latitude, dropoff.longitude]);
        dropoffCircle.setRadius(Number(dropoff.radius || 25));
        dropoffCircle.setStyle({
          color: dropoff.markerColor || '#16a34a',
          fillColor: dropoff.markerColor || '#16a34a',
        });
      }
    } else if (dropoffCircle) {
      map.removeLayer(dropoffCircle);
      dropoffCircle = null;
    }

    if (phase !== 'idle') {
      missionElement.innerHTML = [
        `<p>${t('carrying', 'Carrying')}: <strong>${carriedPackages}</strong> ${t('package_suffix', 'package(s)')}</p>`,
        pickupOptions.length
          ? `<p>${t('pickup_from', 'Pick up from:')}</p><ul>${pickupOptions.map((option) => `<li>${option.title}</li>`).join('')}</ul>`
          : `<p class="muted">${t('waiting_assignment', 'Waiting for pickup assignment…')}</p>`,
        dropoff ? `<p>${tr('dropoff_when_ready', { title: dropoff.title }, 'Drop off at %title% when ready.')}</p>` : '',
      ].join('');

      const nearbyPickup = pickupOptions.find((option) => option.nearby);
      const canDropoff = Boolean(dropoff && dropoff.nearby && carriedPackages > 0);

      if (canDropoff) {
        actionBtn.disabled = false;
        actionBtn.textContent = tr('dropoff_ready', { count: carriedPackages }, 'Drop off %count% package(s)');
        actionBtn.dataset.actionType = 'dropoff';
        actionBtn.dataset.pickupId = '';
        setStatus(t('dropoff_ready', 'Dropoff ready'));
        return;
      }

      if (nearbyPickup) {
        actionBtn.disabled = false;
        actionBtn.textContent = tr('pickup_at', { title: nearbyPickup.title }, 'Pick up at %title%');
        actionBtn.dataset.actionType = 'pickup';
        actionBtn.dataset.pickupId = nearbyPickup.id;
      } else {
        actionBtn.disabled = true;
        actionBtn.textContent = carriedPackages > 0 ? t('move_pickup_or_dropoff', 'Move to pickup or dropoff point') : t('move_pickup', 'Move to a pickup point');
        actionBtn.dataset.actionType = '';
        actionBtn.dataset.pickupId = '';
      }

      setStatus(t('pickup_phase', 'Pickup phase'));
      return;
    }

    missionElement.innerHTML = `<p class="muted">${t('waiting_next_assignment', 'Waiting for next assignment…')}</p>`;
    actionBtn.disabled = true;
    actionBtn.textContent = t('waiting_short', 'Waiting…');
    actionBtn.dataset.actionType = '';
    setStatus(t('idle', 'Idle'));
  };

  actionBtn.addEventListener('click', () => {
    if (!ws || !ws.isOpen() || !latestSnapshot) {
      return;
    }

    if (actionBtn.dataset.actionType === 'pickup' && actionBtn.dataset.pickupId) {
      ws.send('courier_rush.pickup.confirm', { pickupId: actionBtn.dataset.pickupId });
      return;
    }

    if (actionBtn.dataset.actionType === 'dropoff') {
      ws.send('courier_rush.dropoff.confirm', {});
    }
  });

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        updateLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => setStatus(t('location_required', 'Location required')),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  } else {
    setStatus(t('location_unsupported', 'Location unsupported'));
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

      if (
        event.command === 'courier_rush.state.updated'
        || event.command === 'team.location.updated'
        || event.command === 'super_admin.team.force_updated'
      ) {
        requestSnapshot();
      }
    });

    ws.onAck((ack) => {
      if (ack.command === 'courier_rush.team.bootstrap') {
        renderMission(ack.payload || {});
      }

      if (ack.command === 'courier_rush.pickup.confirm' || ack.command === 'courier_rush.dropoff.confirm') {
        requestSnapshot();
      }
    });

    ws.onError((error) => {
      if (error?.code === 'game_frozen') {
        ensureActive({ gameWindow: error.details?.gameWindow });
      }
      if (error?.code === 'out_of_range') {
        setStatus(t('out_of_range', 'You are not in range.'));
      }
    });
  }
})();
