(() => {
  const root = document.getElementById('birds-of-prey-team');
  const mapElement = document.getElementById('birds-of-prey-team-map');
  const ownEggsElement = document.getElementById('birds-of-prey-own-eggs');
  const enemyEggsElement = document.getElementById('birds-of-prey-enemy-eggs');
  const dropButton = root?.querySelector('[data-bop-drop]');
  const scoreElement = root?.querySelector('[data-bop-score]');
  const statusElement = root?.querySelector('[data-bop-status]');
  if (!root || !mapElement || typeof L === 'undefined') {
    return;
  }

  const copy = (() => {
    try {
      return JSON.parse(root.dataset.copy || '{}');
    } catch (_) {
      return {};
    }
  })();

  const t = (key, fallback = '') => String(copy[key] || fallback);
  const dashboardUrl = root.dataset.dashboardUrl || '/team';
  const logoUrl = root.dataset.logoUrl || '';

  const map = L.map(mapElement).setView([51.05, 3.72], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const teamIcon = logoUrl ? L.icon({
    iconUrl: logoUrl,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    className: 'geo-team-icon',
  }) : null;

  let ws = null;
  let teamMarker = null;
  let latestLocation = null;
  let locationPushInterval = null;
  let ownEggLayers = new Map();
  let enemyEggLayers = new Map();

  const setStatus = (value) => {
    if (statusElement) {
      statusElement.textContent = value;
    }
  };

  const requestSnapshot = () => {
    if (!ws || !ws.isOpen() || (typeof ws.isAuthenticated === 'function' && !ws.isAuthenticated())) {
      return;
    }

    ws.send('birds_of_prey.team.bootstrap', {});
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
    const gameWindowStatus = String(payload?.gameWindow?.status || '').toLowerCase();
    if (gameWindowStatus && gameWindowStatus !== 'active') {
      window.location.assign(dashboardUrl);
      return;
    }

    if (scoreElement && payload.score !== undefined) {
      scoreElement.textContent = String(payload.score);
    }

    window.JotiTeamLeaderboard?.create(
      root.querySelector('[data-team-leaderboard]'),
      { currentTeamId: root.dataset.wsTeamId || '' }
    )?.render(payload.leaderboard || [], {
      metricDirection: payload.leaderboardMetricDirection || 'desc',
    });

    const ownEggs = Array.isArray(payload.ownEggs) ? payload.ownEggs : [];
    const enemyEggs = Array.isArray(payload.enemyEggs) ? payload.enemyEggs : [];

    const syncLayers = (collection, layers, color, fillOpacity) => {
      const ids = new Set(collection.map((egg) => String(egg.id || '')));
      layers.forEach((layer, id) => {
        if (!ids.has(id)) {
          map.removeLayer(layer);
          layers.delete(id);
        }
      });

      collection.forEach((egg) => {
        const id = String(egg.id || '');
        const lat = Number(egg.latitude);
        const lon = Number(egg.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          return;
        }

        if (!layers.has(id)) {
          const marker = L.circleMarker([lat, lon], {
            radius: 8,
            color,
            fillColor: color,
            fillOpacity,
          }).addTo(map);
          layers.set(id, marker);
        } else {
          layers.get(id).setLatLng([lat, lon]);
        }
      });
    };

    syncLayers(ownEggs, ownEggLayers, '#16a34a', 0.85);
    syncLayers(enemyEggs, enemyEggLayers, '#dc2626', 0.9);

    ownEggsElement.innerHTML = ownEggs.length
      ? `<div class="stack">${ownEggs.map((egg) => `<div class="geo-card"><strong>${egg.title || 'Egg'}</strong><p>${new Date(egg.droppedAt).toLocaleTimeString()}</p></div>`).join('')}</div>`
      : `<p class="muted">${t('no_eggs', 'No eggs yet')}</p>`;

    enemyEggsElement.innerHTML = enemyEggs.length
      ? `<div class="stack">${enemyEggs.map((egg) => `<div class="geo-card"><strong>${egg.title || 'Enemy egg'}</strong><p>${egg.ownerName || ''}</p>${egg.canDestroy ? `<button class="btn btn-remove btn-small" data-destroy-egg="${egg.id}">${t('destroy', 'Destroy')}</button>` : `<p class="muted">${t('owner_nearby', 'Owner nearby')}</p>`}</div>`).join('')}</div>`
      : `<p class="muted">${t('no_eggs', 'No eggs yet')}</p>`;

    enemyEggsElement.querySelectorAll('[data-destroy-egg]').forEach((button) => {
      button.addEventListener('click', () => {
        ws?.send('birds_of_prey.egg.destroy', {
          eggId: button.dataset.destroyEgg,
        });
      });
    });
  };

  dropButton?.addEventListener('click', () => {
    ws?.send('birds_of_prey.egg.drop', {});
  });

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        updateLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setStatus(t('gps_active', 'GPS active'));
      },
      () => setStatus(t('location_required', 'Location required')),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  if (!window.JotiWs || !root.dataset.wsTeamId || !root.dataset.wsTeamCode) {
    return;
  }

  ws = window.JotiWs.connect({
    role: 'team',
    teamId: root.dataset.wsTeamId,
    teamCode: root.dataset.wsTeamCode,
    reconnectMs: 3000,
  });

  const startLocationInterval = () => {
    if (locationPushInterval) {
      window.clearInterval(locationPushInterval);
    }

    locationPushInterval = window.setInterval(() => {
      if (latestLocation) {
        updateLocation(latestLocation);
      }
    }, 10000);
  };

  ws.onOpen(() => {
    requestSnapshot();
    if (latestLocation) {
      updateLocation(latestLocation);
    }
    startLocationInterval();
  });

  ws.onAuthenticated(() => {
    requestSnapshot();
    if (latestLocation) {
      updateLocation(latestLocation);
    }
    startLocationInterval();
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
    if (ack.command === 'birds_of_prey.team.bootstrap') {
      render(ack.payload || {});
      return;
    }

    if (ack.command === 'birds_of_prey.egg.drop' || ack.command === 'birds_of_prey.egg.destroy') {
      requestSnapshot();
    }
  });
})();
