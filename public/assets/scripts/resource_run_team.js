(() => {
  const root = document.getElementById('resource-run-team');
  const mapElement = document.getElementById('resource-run-team-map');
  const nodesElement = document.getElementById('resource-run-nodes');
  const inventoryElement = document.getElementById('resource-run-inventory');
  const scoreElement = document.querySelector('[data-resource-score]');
  const statusElement = document.querySelector('[data-resource-status]');
  const modal = document.getElementById('resource-run-result-modal');
  const modalTitle = document.getElementById('resource-run-modal-title');
  const modalMessage = document.getElementById('resource-run-modal-message');
  if (!root || !mapElement || typeof L === 'undefined') {
    return;
  }

  let copy = {};
  try {
    copy = JSON.parse(root.dataset.copy || '{}');
  } catch {
    copy = {};
  }

  const teamLogoUrl = root.dataset.logoUrl || '';
  const dashboardUrl = root.dataset.dashboardUrl || '/team';
  const leaderboard = window.JotiTeamLeaderboard?.create(
    root.querySelector('[data-team-leaderboard]'),
    { currentTeamId: root.dataset.wsTeamId || '' }
  );

  const map = L.map(mapElement).setView([51.05, 3.72], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  let teamMarker;
  let wsClient = null;
  let redirectedToDashboard = false;
  const nodeCircles = new Map();
  const nodeMarkers = new Map();
  let latestCoords = null;

  const teamIcon = teamLogoUrl
    ? L.icon({
      iconUrl: teamLogoUrl,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      className: 'geo-team-icon',
    })
    : null;

  const locationHeaders = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-TOKEN': root.dataset.csrfLocation,
  };

  const collectHeaders = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-TOKEN': root.dataset.csrfCollect,
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

  const openModal = (message) => {
    if (!modal || !modalMessage) {
      return;
    }
    if (modalTitle) {
      modalTitle.textContent = copy.modal_title || '';
    }
    modalMessage.textContent = message;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeModal = () => {
    if (!modal) {
      return;
    }
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  };

  if (modal) {
    modal.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.modalClose !== undefined) {
        closeModal();
      }
    });
  }

  const updateTeamMarker = (coords) => {
    if (!teamMarker) {
      const markerOptions = teamIcon ? { icon: teamIcon } : undefined;
      teamMarker = L.marker([coords.latitude, coords.longitude], markerOptions).addTo(map);
      map.setView([coords.latitude, coords.longitude], 16);
      return;
    }

    teamMarker.setLatLng([coords.latitude, coords.longitude]);
  };

  const requestSnapshot = () => {
    if (!wsClient || !wsClient.isOpen()) {
      return;
    }

    if (typeof wsClient.isAuthenticated === 'function' && !wsClient.isAuthenticated()) {
      return;
    }

    wsClient.send('resource_run.team.bootstrap', {});
  };

  const updateLocation = async (coords) => {
    latestCoords = {
      latitude: Number(coords.latitude),
      longitude: Number(coords.longitude),
    };

    if (wsClient && wsClient.isOpen()) {
      wsClient.send('team.location.update', {
        latitude: latestCoords.latitude,
        longitude: latestCoords.longitude,
        requestNearby: false,
      });

      updateTeamMarker(latestCoords);
      return true;
    }

    const response = await fetch(root.dataset.locationUrl, {
      method: 'POST',
      headers: locationHeaders,
      credentials: 'same-origin',
      body: JSON.stringify({ latitude: latestCoords.latitude, longitude: latestCoords.longitude }),
    });

    if (!response.ok) {
      return false;
    }

    updateTeamMarker(latestCoords);
    return true;
  };

  const refreshLocationFromBrowser = () => {
    if (!navigator.geolocation) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const success = await updateLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          resolve(success);
        },
        () => resolve(false),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
    });
  };

  const collectNodeViaHttp = async (nodeId, hasRetriedForLocation = false) => {
    const url = root.dataset.collectUrlTemplate.replace('NODE_ID', String(nodeId));
    const response = await fetch(url, {
      method: 'POST',
      headers: collectHeaders,
      credentials: 'same-origin',
      body: JSON.stringify({}),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (payload.status === 'missing_location') {
        const refreshed = await refreshLocationFromBrowser();
        if (refreshed && !hasRetriedForLocation) {
          await collectNodeViaHttp(nodeId, true);
          return;
        }
        setStatus(copy.location_required || '');
        return;
      }

      if (payload.status === 'out_of_range') {
        const message = copy.out_of_range || '';
        setStatus(message);
        openModal(message);
        return;
      }

      setStatus(copy.collect_failed || '');
      return;
    }

    if (payload.alreadyCollected) {
      const message = copy.collected || '';
      setStatus(message);
      openModal(message);
    } else {
      setStatus(copy.points_gain || '');
    }

    requestSnapshot();
  };

  const collectNode = async (nodeId) => {
    if (wsClient && wsClient.isOpen() && (typeof wsClient.isAuthenticated !== 'function' || wsClient.isAuthenticated())) {
      wsClient.send('resource_run.resource.claim', { nodeId: String(nodeId) });
      return;
    }

    await collectNodeViaHttp(nodeId);
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

    const inventory = Object.entries(payload.inventory || {})
      .map(([type, amount]) => `<li>${type}: ${amount}</li>`)
      .join('');
    inventoryElement.innerHTML = inventory ? `<ul>${inventory}</ul>` : '<p class="muted">-</p>';

    const nodesInRange = (payload.nodes || []).filter((node) => node.nearby && !node.collected);

    const currentNodeIds = new Set((payload.nodes || []).map((node) => node.id));
    nodeCircles.forEach((circle, id) => {
      if (!currentNodeIds.has(id)) {
        map.removeLayer(circle);
        nodeCircles.delete(id);
      }
    });
    nodeMarkers.forEach((marker, id) => {
      if (!currentNodeIds.has(id)) {
        map.removeLayer(marker);
        nodeMarkers.delete(id);
      }
    });

    (payload.nodes || []).forEach((node) => {
      const markerColor = node.markerColor || '#ef4444';
      if (!nodeCircles.has(node.id)) {
        const circle = L.circle([node.latitude, node.longitude], {
          radius: node.radius ?? node.radiusMeters ?? 25,
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.18,
          weight: 2,
        }).addTo(map);
        nodeCircles.set(node.id, circle);

        const marker = L.circleMarker([node.latitude, node.longitude], {
          radius: 7,
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.95,
          weight: 2,
        }).addTo(map);
        marker.bindPopup(`${node.title} (${node.resourceType})`);
        nodeMarkers.set(node.id, marker);
      } else {
        const circle = nodeCircles.get(node.id);
        circle.setLatLng([node.latitude, node.longitude]);
        circle.setRadius(node.radius ?? node.radiusMeters ?? 25);
        circle.setStyle({ color: markerColor, fillColor: markerColor });

        const marker = nodeMarkers.get(node.id);
        marker.setLatLng([node.latitude, node.longitude]);
        marker.setStyle({ color: markerColor, fillColor: markerColor });
      }
    });

    const nodes = nodesInRange
      .map((node) => {
        return `<div class="geo-card"><strong>${node.title}</strong><p>${node.resourceType} • ${node.points} ${copy.points || ''}</p><button class="btn btn-primary btn-small" data-node="${node.id}">${copy.collect || ''}</button></div>`;
      })
      .join('');

    nodesElement.innerHTML = nodes || `<p class="muted">${copy.no_nearby_nodes || ''}</p>`;
    nodesElement.querySelectorAll('[data-node]').forEach((button) => {
      button.addEventListener('click', () => collectNode(button.dataset.node));
    });
  };

  if (!navigator.geolocation) {
    setStatus(copy.location_unsupported || '');
  } else {
    navigator.geolocation.watchPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        await updateLocation(coords);
        setStatus(copy.gps_active || '');
      },
      () => setStatus(copy.location_required || ''),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );

    window.setInterval(() => {
      if (!latestCoords) {
        return;
      }

      updateLocation(latestCoords);
    }, 10000);
  }

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
      requestSnapshot();
      if (latestCoords) {
        updateLocation(latestCoords);
      }
    });

    wsClient.onAuthenticated(() => {
      requestSnapshot();
      if (latestCoords) {
        updateLocation(latestCoords);
      }
    });

    wsClient.onEvent((event) => {
      if (event.command === 'admin.message.team') {
        window.JotiTeamMessageModal?.show?.(event.payload?.message);
        return;
      }

      if (
        event.command === 'team.location.updated'
        || event.command === 'resource_run.resource.claimed'
        || event.command === 'resource_run.nodes.updated'
        || event.command === 'super_admin.team.force_updated'
      ) {
        requestSnapshot();
        return;
      }

      requestSnapshot();
    });

    wsClient.onAck((ack) => {
      if (ack.command === 'resource_run.team.bootstrap') {
        render(ack.payload || {});
        return;
      }

      if (ack.command === 'team.location.update') {
        requestSnapshot();
        return;
      }

      if (ack.command === 'resource_run.resource.claim') {
        if (ack.payload?.alreadyCollected) {
          const message = copy.collected || '';
          setStatus(message);
          openModal(message);
        } else {
          setStatus(copy.points_gain || '');
        }
        requestSnapshot();
      }
    });

    wsClient.onError((error) => {
      if (!error || typeof error !== 'object') {
        return;
      }

      if (error.code === 'missing_location') {
        setStatus(copy.location_required || '');
        return;
      }

      if (error.code === 'out_of_range') {
        const message = copy.out_of_range || '';
        setStatus(message);
        openModal(message);
        return;
      }

      if (error.code === 'game_frozen') {
        ensureActiveGameWindow({ gameWindow: error.details?.gameWindow });
      }
    });
  }

  requestSnapshot();
})();
