(() => {
  const root = document.getElementById('echo-hunt-overview');
  const mapElement = document.getElementById('echo-hunt-overview-map');
  const board = document.getElementById('echo-hunt-team-board');
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
  const tr = (key, replacements = {}, fallback = '') => {
    let text = t(key, fallback);
    Object.entries(replacements).forEach(([token, value]) => {
      text = text.replaceAll(`%${token}%`, String(value ?? ''));
    });
    return text;
  };
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
  const buildTeamIcon = (logoPath) => {
    if (!logoPath) {
      return null;
    }

    return L.icon({
      iconUrl: buildAssetUrl(logoPath),
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      className: 'geo-team-icon',
    });
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

  window.setTimeout(() => map.invalidateSize(), 50);
  window.addEventListener('resize', () => map.invalidateSize());

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
  const beaconMarkers = new Map();

  const buildLoginAction = (teamId) => {
    const meta = teamLoginMeta[String(teamId)] || teamLoginMeta[teamId] || null;
    if (!meta || !meta.url || !meta.token) {
      return '';
    }

    return `<form method="post" action="${meta.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-left:8px;"><input type="hidden" name="_token" value="${meta.token}"><button class="btn btn-ghost btn-small" type="submit">${loginAsLabel}</button></form>`;
  };

  const render = (payload) => {
    const teams = payload.teams || [];
    const beacons = payload.beacons || [];
    const teamIds = new Set(teams.map((team) => team.id));
    const beaconIds = new Set(beacons.map((beacon) => beacon.id));

    teamMarkers.forEach((marker, id) => {
      if (!teamIds.has(id)) {
        map.removeLayer(marker);
        teamMarkers.delete(id);
      }
    });

    beaconMarkers.forEach((marker, id) => {
      if (!beaconIds.has(id)) {
        map.removeLayer(marker);
        beaconMarkers.delete(id);
      }
    });

    teams.forEach((team) => {
      if (team.latitude === null || team.longitude === null) {
        return;
      }

      const teamIcon = buildTeamIcon(team.logoPath);

      if (!teamMarkers.has(team.id)) {
        const marker = L.marker([team.latitude, team.longitude], teamIcon ? { icon: teamIcon } : undefined).addTo(map);
        marker.bindPopup(`${team.name} (${team.score || 0})`);
        teamMarkers.set(team.id, marker);
      } else {
        const marker = teamMarkers.get(team.id);
        marker.setLatLng([team.latitude, team.longitude]);
        if (teamIcon) {
          marker.setIcon(teamIcon);
        }
        marker.bindPopup(`${team.name} (${team.score || 0})`);
      }
    });

    beacons.forEach((beacon) => {
      if (!beaconMarkers.has(beacon.id)) {
        const marker = L.circle([beacon.latitude, beacon.longitude], {
          radius: Number(beacon.radius || 25),
          color: beacon.markerColor || '#7c3aed',
          fillColor: beacon.markerColor || '#7c3aed',
          fillOpacity: 0.15,
        }).addTo(map);
        marker.bindPopup(tr('beacon_popup', { title: beacon.title }, 'Beacon: %title%'));
        beaconMarkers.set(beacon.id, marker);
        return;
      }

      const marker = beaconMarkers.get(beacon.id);
      marker.setLatLng([beacon.latitude, beacon.longitude]);
      marker.setRadius(Number(beacon.radius || 25));
      marker.setStyle({
        color: beacon.markerColor || '#7c3aed',
        fillColor: beacon.markerColor || '#7c3aed',
      });
      marker.bindPopup(tr('beacon_popup', { title: beacon.title }, 'Beacon: %title%'));
    });

    board.innerHTML = teams.length
      ? `<section class="overview-grid">${teams.map((team) => `<article class="team-card"><div class="team-card-header"><div class="team-identity">${team.logoPath ? `<img class="team-logo" src="${buildAssetUrl(team.logoPath)}" alt="${escapeHtml(team.name || '')}">` : ''}<div><h2>${escapeHtml(team.name || '')}</h2><p class="team-code">${escapeHtml(team.code || '')}</p></div></div><div class="team-lives"><span class="team-lives-value">${Number(team.score || 0)}</span><span class="team-lives-label">${escapeHtml(t('points_short', 'pts'))}</span></div></div><div class="team-section"><h3>${escapeHtml(t('found_short', 'Found'))}</h3><p class="muted">${Number(team.found || 0)}</p></div><div class="team-card-actions">${buildLoginAction(team.id)}</div></article>`).join('')}</section>`
      : `<p class="muted">${t('no_teams', 'No teams')}</p>`;

    const boundsPoints = [];
    teams.forEach((team) => {
      if (Number.isFinite(team.latitude) && Number.isFinite(team.longitude)) {
        boundsPoints.push([team.latitude, team.longitude]);
      }
    });
    beacons.forEach((beacon) => {
      if (Number.isFinite(beacon.latitude) && Number.isFinite(beacon.longitude)) {
        boundsPoints.push([beacon.latitude, beacon.longitude]);
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

    ws.send('echo_hunt.overview.bootstrap', {});
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
      if (ack.command === 'echo_hunt.overview.bootstrap') {
        render(ack.payload || {});
      }
    });
  }
})();
