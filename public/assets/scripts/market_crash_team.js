(() => {
  const root = document.getElementById('market-crash-team');
  const mapElement = document.getElementById('market-crash-team-map');
  const pointsElement = document.getElementById('market-crash-points');
  const allPointsElement = document.getElementById('market-crash-all-points');
  const inventoryElement = document.getElementById('market-crash-inventory');
  const cashElement = document.querySelector('[data-market-cash]');
  const statusElement = document.querySelector('[data-market-status]');
  const tradeModal = document.getElementById('market-crash-trade-modal');
  const tradeModalMessage = document.getElementById('market-crash-trade-modal-message');
  const tradeModalClose = document.getElementById('market-crash-trade-modal-close');

  if (!root || !mapElement || !pointsElement || !allPointsElement || !inventoryElement || typeof L === 'undefined') {
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
    { currentTeamId: root.dataset.wsTeamId || '' }
  );
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const teamLogoUrl = root.dataset.logoUrl || '';
  const teamIcon = teamLogoUrl
    ? L.icon({ iconUrl: teamLogoUrl, iconSize: [36, 36], iconAnchor: [18, 18], className: 'geo-team-icon' })
    : null;

  let teamMarker = null;
  let wsClient = null;
  let currentPosition = null;
  let locationPushTimer = null;
  let redirectedToDashboard = false;
  const pointCircles = new Map();
  const pointMarkers = new Map();

  const setStatus = (text) => {
    if (statusElement) {
      statusElement.textContent = text;
    }
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

  const showTradeModal = (message) => {
    if (!tradeModal || !tradeModalMessage) {
      setStatus(message);
      return;
    }

    tradeModalMessage.textContent = String(message || '');
    tradeModal.classList.add('is-open');
    tradeModal.setAttribute('aria-hidden', 'false');
  };

  const closeTradeModal = () => {
    if (!tradeModal) {
      return;
    }

    tradeModal.classList.remove('is-open');
    tradeModal.setAttribute('aria-hidden', 'true');
  };

  if (tradeModalClose) {
    tradeModalClose.addEventListener('click', closeTradeModal);
  }

  const updateLocation = async (coords) => {
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
        map.setView([coords.latitude, coords.longitude], Math.max(map.getZoom(), 16));
      }

      return;
    }

    const response = await fetch(root.dataset.locationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': root.dataset.csrfLocation,
      },
      credentials: 'same-origin',
      body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
    });

    if (!response.ok) {
      return;
    }

    if (!teamMarker) {
      teamMarker = L.marker([coords.latitude, coords.longitude], teamIcon ? { icon: teamIcon } : undefined).addTo(map);
      map.setView([coords.latitude, coords.longitude], 16);
      return;
    }

    teamMarker.setLatLng([coords.latitude, coords.longitude]);
    map.setView([coords.latitude, coords.longitude], Math.max(map.getZoom(), 16));
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

  const requestSnapshot = () => {
    if (!wsClient || !wsClient.isOpen()) {
      return;
    }

    if (typeof wsClient.isAuthenticated === 'function' && !wsClient.isAuthenticated()) {
      return;
    }

    wsClient.send('market_crash.team.bootstrap', {});
  };

  const renderInventory = (inventory) => {
    const entries = Object.entries(inventory || {});
    if (entries.length === 0) {
      inventoryElement.innerHTML = '<p class="muted">-</p>';
      return;
    }

    inventoryElement.innerHTML = `<ul>${entries.map(([resource, quantity]) => `<li>${resource}: ${quantity}</li>`).join('')}</ul>`;
  };

  const trade = async (pointId, resource, side, quantity) => {
    const url = root.dataset.tradeUrlTemplate.replace('POINT_ID', String(pointId));
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': root.dataset.csrfTrade,
      },
      credentials: 'same-origin',
      body: JSON.stringify({ resource, side, quantity }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (payload.status === 'insufficient_cash') {
        showTradeModal(copy.insufficient_cash || '');
        return;
      }
      if (payload.status === 'insufficient_inventory') {
        showTradeModal(copy.insufficient_inventory || '');
        return;
      }
      if (payload.status === 'out_of_range') {
        showTradeModal(copy.out_of_range || '');
        return;
      }
      showTradeModal(copy.trade_failed || '');
      return;
    }

    if (cashElement && payload.money !== undefined) {
      cashElement.textContent = String(payload.money);
    }
    renderInventory(payload.inventory || {});
    showTradeModal(`${payload.trade.side.toUpperCase()} ${payload.trade.quantity} ${payload.trade.resource}`);
    requestSnapshot();
  };

  const render = (payload) => {
    if (!ensureActiveGameWindow(payload)) {
      return;
    }

    if (cashElement && payload.money !== undefined) {
      cashElement.textContent = String(payload.money);
    }

    leaderboard?.render(payload.leaderboard || [], {
      metricDirection: payload.leaderboardMetricDirection || 'desc',
    });

    renderInventory(payload.inventory || {});

    const points = payload.points || [];
    const pointIds = new Set(points.map((point) => point.id));

    pointCircles.forEach((layer, id) => {
      if (!pointIds.has(id)) {
        map.removeLayer(layer);
        pointCircles.delete(id);
      }
    });
    pointMarkers.forEach((layer, id) => {
      if (!pointIds.has(id)) {
        map.removeLayer(layer);
        pointMarkers.delete(id);
      }
    });

    points.forEach((point) => {
      const color = point.markerColor || '#2563eb';
      if (!pointCircles.has(point.id)) {
        pointCircles.set(point.id, L.circle([point.latitude, point.longitude], {
          radius: point.radius || 25,
          color,
          fillColor: color,
          fillOpacity: 0.2,
        }).addTo(map));
      } else {
        pointCircles.get(point.id).setLatLng([point.latitude, point.longitude]);
      }

      if (!pointMarkers.has(point.id)) {
        pointMarkers.set(point.id, L.circleMarker([point.latitude, point.longitude], {
          radius: 7,
          color,
          fillColor: color,
          fillOpacity: 1,
        }).addTo(map));
      } else {
        pointMarkers.get(point.id).setLatLng([point.latitude, point.longitude]);
      }
    });

    const nearbyPoints = points.filter((point) => point.nearby);
    if (nearbyPoints.length === 0) {
      pointsElement.innerHTML = `<p class="muted">${copy.no_nearby_points || ''}</p>`;
    } else {
      pointsElement.innerHTML = nearbyPoints.map((point) => {
        const resourceNames = Array.from(new Set([
          ...Object.keys(point.buyPrices || {}),
          ...Object.keys(point.sellPrices || {}),
        ])).sort((a, b) => a.localeCompare(b));

        const tradeRows = resourceNames.map((resource) => {
          const buyPrice = point.buyPrices?.[resource] ?? null;
          const sellPrice = point.sellPrices?.[resource] ?? null;

          return `<div class="market-crash-trade-row">
            <div class="market-crash-trade-resource">
              <strong>${resource}</strong>
              <small class="muted">B: ${buyPrice ?? '-'} · S: ${sellPrice ?? '-'}</small>
            </div>
            <input type="number" min="1" value="1" data-trade-qty="${point.id}:${resource}" class="market-crash-trade-qty">
            <button class="btn btn-add btn-small" data-trade-side="buy" data-point="${point.id}" data-resource="${resource}" ${buyPrice === null ? 'disabled' : ''}>${copy.buy || ''}</button>
            <button class="btn btn-remove btn-small" data-trade-side="sell" data-point="${point.id}" data-resource="${resource}" ${sellPrice === null ? 'disabled' : ''}>${copy.sell || ''}</button>
          </div>`;
        }).join('');

        return `<div class="geo-card">
          <strong>${point.title}</strong>
          <div class="market-crash-trade-list">${tradeRows || `<p class="muted">-</p>`}</div>
        </div>`;
      }).join('');

      pointsElement.querySelectorAll('[data-trade-side]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          const pointId = button.dataset.point;
          const resource = button.dataset.resource;
          const side = button.dataset.tradeSide;
          const qtyInput = pointsElement.querySelector(`[data-trade-qty="${pointId}:${resource}"]`);
          const quantity = Math.max(1, Number.parseInt(qtyInput?.value || '1', 10));
          trade(pointId, resource, side, quantity);
        });
      });
    }

    allPointsElement.innerHTML = points.map((point) => {
      const buyOffer = (point.offersBuy || []).join(', ') || '-';
      const sellOffer = (point.offersSell || []).join(', ') || '-';
      return `<div class="geo-card"><strong>${point.title}</strong><p>${copy.buy || ''}: ${buyOffer}</p><p>${copy.sell || ''}: ${sellOffer}</p></div>`;
    }).join('');

    pointMarkers.forEach((marker, id) => {
      const point = points.find((entry) => entry.id === id);
      if (!point) {
        return;
      }

      marker.bindPopup(`<strong>${point.title}</strong><br>${copy.buy || ''}: ${(point.offersBuy || []).join(', ') || '-'}<br>${copy.sell || ''}: ${(point.offersSell || []).join(', ') || '-'}`);
    });
  };

  if (!navigator.geolocation) {
    setStatus(copy.location_unsupported || '');
  } else {
    navigator.geolocation.watchPosition(
      async (position) => {
        await updateLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setStatus(copy.gps_active || '');
      },
      () => setStatus(copy.location_required || ''),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
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
      pushLocation();

      if (locationPushTimer) {
        window.clearInterval(locationPushTimer);
      }
      locationPushTimer = window.setInterval(pushLocation, 10000);
    });

    wsClient.onAuthenticated(() => {
      requestSnapshot();
    });

    wsClient.onClose(() => {
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
        event.command === 'market_crash.prices.updated'
        || event.command === 'market_crash.trade.executed'
        || event.command === 'team.location.updated'
        || event.command === 'super_admin.team.force_updated'
      ) {
        requestSnapshot();
        return;
      }

      requestSnapshot();
    });

    wsClient.onAck((ack) => {
      if (ack.command === 'team.location.update') {
        requestSnapshot();
        return;
      }

      if (ack.command === 'market_crash.team.bootstrap') {
        render(ack.payload || {});
      }
    });

    wsClient.onError((error) => {
      if (error?.code === 'game_frozen') {
        ensureActiveGameWindow({ gameWindow: error.details?.gameWindow });
      }
    });
  }
})();
