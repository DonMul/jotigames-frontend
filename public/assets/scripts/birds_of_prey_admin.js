(() => {
  const root = document.getElementById('birds-of-prey-overview');
  const mapElement = document.getElementById('birds-of-prey-overview-map');
  const board = document.getElementById('birds-of-prey-team-board');
  if (!root || !mapElement || !board || typeof L === 'undefined') {
    return;
  }

  const copy = (() => {
    try {
      return JSON.parse(root.dataset.copy || '{}');
    } catch (_) {
      return {};
    }
  })();
  const t = (key, fallback) => String(copy[key] || fallback || '');
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  const buildAssetUrl = (path) => {
    if (!path) {
      return '';
    }

    const base = (root.dataset.assetBase || '').endsWith('/') ? (root.dataset.assetBase || '').slice(0, -1) : (root.dataset.assetBase || '');
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return `${base}${suffix}`;
  };

  let teamLoginMeta = {};
  try {
    teamLoginMeta = JSON.parse(root.dataset.teamLoginMeta || '{}');
  } catch (_) {
    teamLoginMeta = {};
  }
  const loginAsLabel = root.dataset.loginAsLabel || 'Login as team';

  const map = L.map(mapElement).setView([51.05, 3.72], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setView([position.coords.latitude, position.coords.longitude], 13);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  const teamMarkers = new Map();
  const eggMarkers = new Map();

  const buildLoginAction = (teamId) => {
    const meta = teamLoginMeta[String(teamId)] || teamLoginMeta[teamId] || null;
    if (!meta || !meta.url || !meta.token) {
      return '';
    }

    return `<form method="post" action="${meta.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-left:8px;"><input type="hidden" name="_token" value="${meta.token}"><button class="btn btn-ghost btn-small" type="submit">${loginAsLabel}</button></form>`;
  };

  const render = (payload) => {
    const teams = payload.teams || [];
    const eggs = payload.eggs || [];

    const teamIds = new Set(teams.map((team) => team.id));
    teamMarkers.forEach((marker, id) => {
      if (!teamIds.has(id)) {
        map.removeLayer(marker);
        teamMarkers.delete(id);
      }
    });

    const eggIds = new Set(eggs.map((egg) => egg.id));
    eggMarkers.forEach((marker, id) => {
      if (!eggIds.has(id)) {
        map.removeLayer(marker);
        eggMarkers.delete(id);
      }
    });

    teams.forEach((team) => {
      if (!Number.isFinite(Number(team.latitude)) || !Number.isFinite(Number(team.longitude))) {
        return;
      }

      if (!teamMarkers.has(team.id)) {
        const marker = L.marker([Number(team.latitude), Number(team.longitude)]).addTo(map);
        marker.bindPopup(`${team.name} (${Number(team.score || 0)})`);
        teamMarkers.set(team.id, marker);
      } else {
        const marker = teamMarkers.get(team.id);
        marker.setLatLng([Number(team.latitude), Number(team.longitude)]);
        marker.bindPopup(`${team.name} (${Number(team.score || 0)})`);
      }
    });

    eggs.forEach((egg) => {
      const eggId = String(egg.id || '');
      const latitude = Number(egg.latitude);
      const longitude = Number(egg.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      if (!eggMarkers.has(eggId)) {
        const marker = L.circleMarker([latitude, longitude], {
          radius: 7,
          color: '#dc2626',
          fillColor: '#dc2626',
          fillOpacity: 0.9,
        }).addTo(map);
        marker.bindPopup(`${egg.ownerName || ''}`);
        eggMarkers.set(eggId, marker);
      } else {
        eggMarkers.get(eggId).setLatLng([latitude, longitude]);
      }
    });

    board.innerHTML = teams.length
      ? `<section class="overview-grid">${teams.map((team) => `<article class="team-card"><div class="team-card-header"><div class="team-identity">${team.logoPath ? `<img class="team-logo" src="${buildAssetUrl(team.logoPath)}" alt="${escapeHtml(team.name || '')}">` : ''}<div><h2>${escapeHtml(team.name || '')}</h2><p class="team-code">${escapeHtml(team.code || '')}</p></div></div><div class="team-lives"><span class="team-lives-value">${Number(team.score || 0)}</span><span class="team-lives-label">${escapeHtml(t('points_short', 'pts'))}</span></div></div><div class="team-section"><h3>Eggs</h3><p class="muted">${Number(team.eggCount || 0)}</p></div><div class="team-card-actions">${buildLoginAction(team.id)}</div></article>`).join('')}</section>`
      : `<p class="muted">${t('no_teams', 'No teams')}</p>`;

    const boundsPoints = [];
    teams.forEach((team) => {
      if (Number.isFinite(Number(team.latitude)) && Number.isFinite(Number(team.longitude))) {
        boundsPoints.push([Number(team.latitude), Number(team.longitude)]);
      }
    });
    eggs.forEach((egg) => {
      if (Number.isFinite(Number(egg.latitude)) && Number.isFinite(Number(egg.longitude))) {
        boundsPoints.push([Number(egg.latitude), Number(egg.longitude)]);
      }
    });

    if (boundsPoints.length >= 2) {
      map.fitBounds(boundsPoints, { padding: [24, 24], maxZoom: 16 });
    }

    map.invalidateSize();
  };

  let ws = null;
  const requestSnapshot = () => {
    if (!ws || !ws.isOpen() || (typeof ws.isAuthenticated === 'function' && !ws.isAuthenticated())) {
      return;
    }

    ws.send('birds_of_prey.overview.bootstrap', {});
  };

  if (window.JotiWs && root.dataset.wsGameId && root.dataset.wsAdminToken) {
    ws = window.JotiWs.connect({
      role: 'admin',
      gameId: root.dataset.wsGameId,
      adminToken: root.dataset.wsAdminToken,
      reconnectMs: 3000,
    });

    ws.onOpen(requestSnapshot);
    ws.onAuthenticated(requestSnapshot);
    ws.onEvent(requestSnapshot);
    ws.onAck((ack) => {
      if (ack.command === 'birds_of_prey.overview.bootstrap') {
        render(ack.payload || {});
      }
    });
  }
})();
