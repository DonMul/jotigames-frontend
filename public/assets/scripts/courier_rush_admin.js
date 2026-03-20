(() => {
  const root = document.getElementById('courier-rush-overview');
  const mapElement = document.getElementById('courier-rush-overview-map');
  const board = document.getElementById('courier-rush-team-board');
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
  const t = (key, fallback) => String(copy[key] || fallback || '');
  let teamLoginMeta = {};
  try {
    teamLoginMeta = JSON.parse(root.dataset.teamLoginMeta || '{}');
  } catch (_) {
    teamLoginMeta = {};
  }
  const loginAsLabel = root.dataset.loginAsLabel || 'Login as team';

  const map = L.map(mapElement).setView([0, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setView([position.coords.latitude, position.coords.longitude], 14);
      },
      () => {}
    );
  }

  const antiCheatFeed = document.createElement('div');
  antiCheatFeed.style.position = 'absolute';
  antiCheatFeed.style.top = '10px';
  antiCheatFeed.style.right = '10px';
  antiCheatFeed.style.maxWidth = '280px';
  antiCheatFeed.style.maxHeight = '180px';
  antiCheatFeed.style.overflowY = 'auto';
  antiCheatFeed.style.zIndex = '500';
  antiCheatFeed.style.fontSize = '12px';
  antiCheatFeed.style.padding = '6px';
  antiCheatFeed.style.borderRadius = '8px';
  antiCheatFeed.style.background = 'rgba(255,255,255,0.92)';
  antiCheatFeed.style.border = '1px solid rgba(0,0,0,0.12)';
  mapElement.appendChild(antiCheatFeed);

  const pushAntiCheatLog = (payload) => {
    const reason = String(payload?.reason || payload?.device?.lastViolationCode || 'rejected').replaceAll('_', ' ');
    const teamName = String(payload?.teamName || 'Unknown team');
    const detailValue = payload?.details?.speed || payload?.details?.movedMeters || payload?.details?.accuracy;
    const detailSuffix = Number.isFinite(Number(detailValue)) ? ` (${Math.round(Number(detailValue))})` : '';
    const entry = document.createElement('div');
    const at = payload?.at ? new Date(payload.at) : new Date();
    entry.textContent = `${at.toLocaleTimeString()} · ${teamName} · ${reason}${detailSuffix}`;
    antiCheatFeed.prepend(entry);
    while (antiCheatFeed.childElementCount > 8) {
      antiCheatFeed.removeChild(antiCheatFeed.lastElementChild);
    }
  };

  const hydrateAntiCheatLog = (history) => {
    antiCheatFeed.innerHTML = '';
    const items = Array.isArray(history) ? history.slice(0, 8) : [];
    items.reverse().forEach((item) => pushAntiCheatLog(item));
  };

  const teamMarkers = new Map();
  const teamHalos = new Map();
  const deviceMarkers = new Map();
  const pickupMarkers = new Map();
  const dropoffMarkers = new Map();
  const teamsById = new Map();
  const teamColorById = new Map();
  let devices = [];
  let hasInitialFit = false;

  const mergeTeamDevices = (teamId, nextDevices) => {
    const key = String(teamId || '');
    if (!key) {
      return;
    }

    const retained = devices.filter((device) => String(device.teamId || '') !== key);
    devices = [...retained, ...(Array.isArray(nextDevices) ? nextDevices : [])];
  };

  const teamColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16',
  ];

  const buildAssetUrl = (path) => {
    if (!path) {
      return '';
    }
    const base = (root.dataset.assetBase || '').endsWith('/') ? (root.dataset.assetBase || '').slice(0, -1) : (root.dataset.assetBase || '');
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return `${base}${suffix}`;
  };

  const buildIcon = (logoPath) => {
    if (!logoPath) return null;
    return L.icon({
      iconUrl: buildAssetUrl(logoPath),
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      className: 'geo-team-icon',
    });
  };

  const hashId = (value) => {
    const input = String(value || '');
    let hash = 0;
    for (let index = 0; index < input.length; index += 1) {
      hash = ((hash << 5) - hash) + input.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const getTeamColor = (teamId) => {
    const key = String(teamId || '');
    if (!teamColorById.has(key)) {
      teamColorById.set(key, teamColors[hashId(key) % teamColors.length]);
    }
    return teamColorById.get(key);
  };

  const buildLoginAction = (teamId) => {
    const meta = teamLoginMeta[String(teamId)] || teamLoginMeta[teamId] || null;
    if (!meta || !meta.url || !meta.token) {
      return '';
    }

    return `<form method="post" action="${meta.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-left:8px;"><input type="hidden" name="_token" value="${meta.token}"><button class="btn btn-ghost btn-small" type="submit">${loginAsLabel}</button></form>`;
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const formatInventory = (team) => {
    const inventory = team?.inventory;
    if (inventory && typeof inventory === 'object') {
      const entries = Object.entries(inventory)
        .filter(([, amount]) => Number(amount || 0) > 0)
        .map(([name, amount]) => `${escapeHtml(name)}: ${Number(amount || 0)}`);
      if (entries.length > 0) {
        return entries.join(', ');
      }
    }

    const carried = Number(team?.carriedPackages || 0);
    const delivered = Number(team?.completedDeliveries || 0);
    return `Carrying: ${carried} · Delivered: ${delivered}`;
  };

  const renderTeamBoard = (teams) => {
    board.innerHTML = teams.length
      ? `<section class="overview-grid">${teams.map((team) => {
          const color = getTeamColor(team.id);
          return `<article class="team-card"><div class="team-card-header"><div class="team-identity">${team.logoPath ? `<img class="team-logo" src="${buildAssetUrl(team.logoPath)}" alt="${escapeHtml(team.name || '')}">` : ''}<div><h2>${escapeHtml(team.name || '')}</h2><p class="team-code">${escapeHtml(team.code || '')}</p></div></div><div class="team-lives"><span class="team-lives-value">${Number(team.score || 0)}</span><span class="team-lives-label">${t('points_short', 'pts')}</span></div></div><div class="team-section" style="border-left:4px solid ${color};padding-left:0.8rem;"><h3>Inventory</h3><p class="muted">${formatInventory(team)}</p></div><div class="team-card-actions">${buildLoginAction(team.id)}</div></article>`;
        }).join('')}</section>`
      : `<p class="muted">${t('no_teams', 'No teams')}</p>`;
  };

  const fitToDataIfNeeded = (teams, pickups, dropoffs) => {
    if (hasInitialFit) {
      return;
    }

    const latLngs = [];
    teams.forEach((team) => {
      if (Number.isFinite(team.latitude) && Number.isFinite(team.longitude)) {
        latLngs.push([team.latitude, team.longitude]);
      }
    });
    pickups.forEach((point) => {
      if (Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) {
        latLngs.push([point.latitude, point.longitude]);
      }
    });
    dropoffs.forEach((point) => {
      if (Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) {
        latLngs.push([point.latitude, point.longitude]);
      }
    });

    if (latLngs.length >= 2) {
      map.fitBounds(latLngs, { padding: [28, 28], maxZoom: 16 });
      hasInitialFit = true;
      return;
    }

    if (latLngs.length === 1) {
      map.setView(latLngs[0], 15);
      hasInitialFit = true;
    }
  };

  const renderDeviceMarkers = () => {
    const deviceIds = new Set(devices.map((device) => String(device.deviceId || '')));
    deviceMarkers.forEach((marker, id) => {
      if (!deviceIds.has(id)) {
        map.removeLayer(marker);
        deviceMarkers.delete(id);
      }
    });

    devices.forEach((device) => {
      const deviceId = String(device.deviceId || '');
      const latitude = Number(device.latitude);
      const longitude = Number(device.longitude);
      if (!deviceId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      const teamName = teamsById.get(String(device.teamId || ''))?.name || 'Team';
      const status = device.suspicious ? `Suspicious (${device.lastViolationCode || 'rejected'})` : 'Active';
      const popup = `<strong>${teamName}</strong><br>Device: ${deviceId}<br>Status: ${status}`;
      const markerColor = device.suspicious ? '#dc2626' : '#111827';
      const fillColor = device.suspicious ? '#fecaca' : '#ffffff';
      if (!deviceMarkers.has(deviceId)) {
        const marker = L.circleMarker([latitude, longitude], {
          radius: 5,
          color: markerColor,
          fillColor,
          fillOpacity: 1,
          weight: 2,
        }).addTo(map);
        marker.bindPopup(popup);
        deviceMarkers.set(deviceId, marker);
        return;
      }

      const marker = deviceMarkers.get(deviceId);
      marker.setLatLng([latitude, longitude]);
      marker.setStyle({ color: markerColor, fillColor });
      marker.bindPopup(popup);
    });
  };

  const render = (payload) => {
    const teams = payload.teams || [];
    const pickups = payload.pickups || [];
    const dropoffs = payload.dropoffs || [];
    devices = Array.isArray(payload.devices) ? payload.devices : devices;

    teams.forEach((t) => teamsById.set(t.id, t));

    const teamIds = new Set(teams.map((team) => team.id));
    teamMarkers.forEach((marker, id) => {
      if (!teamIds.has(id)) {
        map.removeLayer(marker);
        teamMarkers.delete(id);
        teamsById.delete(id);
      }
    });
    teamHalos.forEach((halo, id) => {
      if (!teamIds.has(id)) {
        map.removeLayer(halo);
        teamHalos.delete(id);
        teamColorById.delete(id);
      }
    });

    teams.forEach((team) => {
      if (team.latitude === null || team.longitude === null) {
        return;
      }

      const icon = buildIcon(team.logoPath);
      const color = getTeamColor(team.id);
      if (!teamHalos.has(team.id)) {
        const halo = L.circleMarker([team.latitude, team.longitude], {
          radius: 20,
          color,
          fillColor: '#ffffff',
          fillOpacity: 0.75,
          weight: 5,
        }).addTo(map);
        halo.bindPopup(`<strong>${team.name}</strong><br>Score: ${team.score || 0}`);
        teamHalos.set(team.id, halo);
      } else {
        const halo = teamHalos.get(team.id);
        halo.setLatLng([team.latitude, team.longitude]);
        halo.setStyle({ color });
        halo.bindPopup(`<strong>${team.name}</strong><br>Score: ${team.score || 0}`);
      }

      if (!teamMarkers.has(team.id)) {
        const marker = L.marker(
          [team.latitude, team.longitude],
          icon ? { icon, zIndexOffset: 1000 } : { zIndexOffset: 1000 }
        ).addTo(map);
        marker.bindPopup(`<strong>${team.name}</strong><br>Score: ${team.score || 0}`);
        teamMarkers.set(team.id, marker);
      } else {
        const marker = teamMarkers.get(team.id);
        marker.setLatLng([team.latitude, team.longitude]);
        if (icon) marker.setIcon(icon);
        marker.bindPopup(`<strong>${team.name}</strong><br>Score: ${team.score || 0}`);
      }
    });

    const pickupIds = new Set(pickups.map((point) => point.id));
    pickupMarkers.forEach((marker, id) => {
      if (!pickupIds.has(id)) {
        map.removeLayer(marker);
        pickupMarkers.delete(id);
      }
    });

    pickups.forEach((point) => {
      const assignedTeamIds = Array.isArray(point.teamIds) ? point.teamIds.map((value) => String(value || '')).filter(Boolean) : [];
      const assignedTeamColor = assignedTeamIds.length > 0 ? getTeamColor(assignedTeamIds[0]) : null;
      const pickupColor = assignedTeamColor || point.markerColor || '#2563eb';
      const assignedTeamNames = assignedTeamIds
        .map((teamId) => teamsById.get(teamId)?.name)
        .filter(Boolean);
      const teamLabel = assignedTeamNames.length > 0 ? `<br>Team: ${assignedTeamNames.join(', ')}` : '';

      if (!pickupMarkers.has(point.id)) {
        const marker = L.circle([point.latitude, point.longitude], {
          radius: Number(point.radius || 25),
          color: pickupColor,
          fillColor: pickupColor,
          fillOpacity: point.isActive ? 0.15 : 0.06,
          dashArray: point.isActive ? null : '6 6',
        }).addTo(map);
        marker.bindPopup(`Pickup: ${point.title}${point.isActive ? '' : ' (inactive)'}${teamLabel}`);
        pickupMarkers.set(point.id, marker);
      } else {
        const marker = pickupMarkers.get(point.id);
        marker.setLatLng([point.latitude, point.longitude]);
        marker.setRadius(Number(point.radius || 25));
        marker.setStyle({
          color: pickupColor,
          fillColor: pickupColor,
          fillOpacity: point.isActive ? 0.15 : 0.06,
          dashArray: point.isActive ? null : '6 6',
        });
        marker.bindPopup(`Pickup: ${point.title}${point.isActive ? '' : ' (inactive)'}${teamLabel}`);
      }
    });

    const dropoffIds = new Set(dropoffs.map((point) => point.id));
    dropoffMarkers.forEach((marker, id) => {
      if (!dropoffIds.has(id)) {
        map.removeLayer(marker);
        dropoffMarkers.delete(id);
      }
    });

    dropoffs.forEach((point) => {
      if (!dropoffMarkers.has(point.id)) {
        const marker = L.circle([point.latitude, point.longitude], {
          radius: Number(point.radius || 25),
          color: point.markerColor || '#16a34a',
          fillColor: point.markerColor || '#16a34a',
          fillOpacity: point.isActive ? 0.15 : 0.06,
          dashArray: point.isActive ? null : '6 6',
        }).addTo(map);
        marker.bindPopup(`Dropoff: ${point.title}${point.isActive ? '' : ' (inactive)'}`);
        dropoffMarkers.set(point.id, marker);
      } else {
        const marker = dropoffMarkers.get(point.id);
        marker.setLatLng([point.latitude, point.longitude]);
        marker.setRadius(Number(point.radius || 25));
        marker.setStyle({
          color: point.markerColor || '#16a34a',
          fillColor: point.markerColor || '#16a34a',
          fillOpacity: point.isActive ? 0.15 : 0.06,
          dashArray: point.isActive ? null : '6 6',
        });
        marker.bindPopup(`Dropoff: ${point.title}${point.isActive ? '' : ' (inactive)'}`);
      }
    });

    fitToDataIfNeeded(teams, pickups, dropoffs);
    renderDeviceMarkers();

    renderTeamBoard(teams);
  };

  let ws = null;
  const requestSnapshot = () => {
    if (!ws || !ws.isOpen() || (typeof ws.isAuthenticated === 'function' && !ws.isAuthenticated())) {
      return;
    }

    ws.send('courier_rush.overview.bootstrap', {});
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

    ws.onEvent((event) => {
      if (event.command === 'team.location.updated') {
        const payload = event.payload || {};
        const teamId = String(payload.teamId || '');
        const lat = Number(payload?.location?.latitude);
        const lon = Number(payload?.location?.longitude);
        if (teamId && Number.isFinite(lat) && Number.isFinite(lon)) {
          const team = teamsById.get(teamId);
          if (team) {
            team.latitude = lat;
            team.longitude = lon;
            const color = getTeamColor(teamId);
            const halo = teamHalos.get(teamId);
            if (!halo) {
              const newHalo = L.circleMarker([lat, lon], {
                radius: 20,
                color,
                fillColor: '#ffffff',
                fillOpacity: 0.75,
                weight: 5,
              }).addTo(map);
              newHalo.bindPopup(`<strong>${team.name}</strong><br>Score: ${team.score || 0}`);
              teamHalos.set(teamId, newHalo);
            } else {
              halo.setLatLng([lat, lon]);
              halo.setStyle({ color });
              halo.bindPopup(`<strong>${team.name}</strong><br>Score: ${team.score || 0}`);
            }
            const marker = teamMarkers.get(teamId);
            const icon = buildIcon(team.logoPath);
            if (!marker) {
              const m = L.marker([lat, lon], icon ? { icon, zIndexOffset: 1000 } : { zIndexOffset: 1000 }).addTo(map);
              m.bindPopup(`<strong>${team.name}</strong><br>Score: ${team.score || 0}`);
              teamMarkers.set(teamId, m);
            } else {
              marker.setLatLng([lat, lon]);
              if (icon) marker.setIcon(icon);
              marker.bindPopup(`<strong>${team.name}</strong><br>Score: ${team.score || 0}`);
            }
            board.querySelectorAll('li').forEach(() => {}); // keep board in-sync via render snapshots
          }
          if (Array.isArray(payload.teamDevices)) {
            mergeTeamDevices(teamId, payload.teamDevices);
            renderDeviceMarkers();
          }
          return;
        }
      }

      if (event.command === 'team.location.rejected') {
        const payload = event.payload || {};
        const teamId = String(payload.teamId || '');
        if (!teamId) {
          return;
        }

        if (Array.isArray(payload.teamDevices)) {
          mergeTeamDevices(teamId, payload.teamDevices);
        } else if (payload.device && typeof payload.device === 'object') {
          mergeTeamDevices(teamId, [payload.device]);
        }
        pushAntiCheatLog(payload);
        renderDeviceMarkers();
        return;
      }

      if (event.command === 'courier_rush.state.updated') {
        // update team status/score locally if present
        const payload = event.payload || {};
        const teamId = String(payload.teamId || '');
        const spawnedOutsideWss = Boolean(payload.spawnedOutsideWss);
          const mapNodesChanged = Boolean(payload.mapNodesChanged);
        if (teamId && teamsById.has(teamId)) {
          const team = teamsById.get(teamId);
          if (payload.phase) team.status = payload.phase;
          if (typeof payload.pointsAwarded === 'number') {
            team.score = Number((team.score || 0) + payload.pointsAwarded);
          }
          const marker = teamMarkers.get(teamId);
          if (marker) marker.bindPopup(`<strong>${team.name}</strong><br>Score: ${team.score || 0}`);
          // refresh board
          renderTeamBoard(Array.from(teamsById.values()));

          return;
        }
      }
    });

    ws.onAck((ack) => {
      if (ack.command === 'courier_rush.overview.bootstrap') {
        hydrateAntiCheatLog(ack.payload?.antiCheatLog || []);
        render(ack.payload || {});
      }
    });
  }
})();
