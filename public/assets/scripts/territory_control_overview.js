(() => {
  const root = document.getElementById('territory-overview');
  const mapElement = document.getElementById('territory-overview-map');
  const board = document.getElementById('territory-overview-board');
  if (!root || !mapElement || !board || typeof L === 'undefined') {
    return;
  }

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

  const circles = new Map();
  const teamMarkers = new Map();
  const deviceMarkers = new Map();
  const zoneOwnerMarkers = new Map();
  const assetBase = root.dataset.assetBase || '/';
  const actionLabel = root.dataset.actionLabel || 'Action';
  let teamLoginMeta = {};
  try {
    teamLoginMeta = JSON.parse(root.dataset.teamLoginMeta || '{}');
  } catch {
    teamLoginMeta = {};
  }
  const loginAsLabel = root.dataset.loginAsLabel || 'Login as team';
  const teamsById = new Map();
  const zonesById = new Map();
  let devices = [];

  const mergeTeamDevices = (teamId, nextDevices) => {
    const key = String(teamId || '');
    if (!key) {
      return;
    }

    const retained = devices.filter((device) => String(device.teamId || '') !== key);
    devices = [...retained, ...(Array.isArray(nextDevices) ? nextDevices : [])];
  };

  const resolveLogoUrl = (logoPath) => {
    if (!logoPath) {
      return '';
    }
    if (/^(https?:)?\/\//.test(logoPath) || logoPath.startsWith('data:') || logoPath.startsWith('/')) {
      return logoPath;
    }
    return `${assetBase}${logoPath}`;
  };

  const createTeamIcon = (logoUrl) => {
    if (!logoUrl) {
      return null;
    }

    return L.icon({
      iconUrl: logoUrl,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      className: 'geo-team-icon',
    });
  };

  const createZoneOwnerIcon = (logoUrl) => {
    if (!logoUrl) {
      return null;
    }

    return L.divIcon({
      html: `<img src="${logoUrl}" alt="" class="territory-zone-owner-logo">`,
      className: 'territory-zone-owner-icon',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const buildLoginAction = (teamId) => {
    const meta = teamLoginMeta[String(teamId)] || teamLoginMeta[teamId] || null;
    if (!meta || !meta.url || !meta.token) {
      return '-';
    }

    return `<form method="post" action="${meta.url}" target="_blank" rel="noopener noreferrer"><input type="hidden" name="_token" value="${meta.token}"><button class="btn btn-ghost btn-small" type="submit">${loginAsLabel}</button></form>`;
  };

  const ownedZonesByTeamId = () => {
    const counts = new Map();
    zonesById.forEach((zone) => {
      if (!zone.ownerTeamId) {
        return;
      }
      counts.set(zone.ownerTeamId, (counts.get(zone.ownerTeamId) || 0) + 1);
    });
    return counts;
  };

  const renderBoard = () => {
    const zoneCounts = ownedZonesByTeamId();
    const cards = [...teamsById.values()]
      .map((team) => `
        <article class="team-card" data-team-id="${escapeHtml(team.id)}">
          <div class="team-card-header">
            <div class="team-identity">
              ${team.logoPath ? `<img class="team-logo" src="${resolveLogoUrl(team.logoPath)}" alt="${escapeHtml(team.name || '')}">` : ''}
              <div><h2 data-team-name>${escapeHtml(team.name || '')}</h2><p class="team-code">${escapeHtml(team.code || '')}</p></div>
            </div>
            <div class="team-lives"><span class="team-lives-value" data-team-score>${Number(team.score || 0)}</span><span class="team-lives-label">pts</span></div>
          </div>
          <div class="team-section"><h3>Zones</h3><p class="muted">Zones owned: <span data-team-zones>${zoneCounts.get(team.id) || 0}</span></p></div>
          <div class="team-card-actions">${buildLoginAction(team.id)}</div>
        </article>
      `)
      .join('');

    board.innerHTML = `<section class="overview-grid">${cards}</section>`;
  };

  const updateTeamCard = (teamId) => {
    const team = teamsById.get(teamId);
    if (!team) {
      return;
    }

    const card = board.querySelector(`[data-team-id="${CSS.escape(String(teamId))}"]`);
    if (!card) {
      renderBoard();
      return;
    }

    const scoreNode = card.querySelector('[data-team-score]');
    if (scoreNode) {
      scoreNode.textContent = String(Number(team.score || 0));
    }

    const nameNode = card.querySelector('[data-team-name]');
    if (nameNode) {
      nameNode.textContent = String(team.name || '');
    }
  };

  const updateZoneCountsInBoard = () => {
    const zoneCounts = ownedZonesByTeamId();
    board.querySelectorAll('[data-team-id]').forEach((card) => {
      const teamId = card.getAttribute('data-team-id') || '';
      const zonesNode = card.querySelector('[data-team-zones]');
      if (zonesNode) {
        zonesNode.textContent = String(zoneCounts.get(teamId) || 0);
      }
    });
  };

  const upsertZoneVisual = (zone) => {
    const color = zone.ownerTeamId ? '#1f7a8c' : '#6b7280';
    if (circles.has(zone.id)) {
      circles.get(zone.id).setLatLng([zone.latitude, zone.longitude]);
      circles.get(zone.id).setRadius(zone.radius ?? zone.radiusMeters ?? 35);
      circles.get(zone.id).setStyle({ color, fillColor: color });
    } else {
      const circle = L.circle([zone.latitude, zone.longitude], {
        radius: zone.radius ?? zone.radiusMeters ?? 35,
        color,
        fillColor: color,
        fillOpacity: 0.2,
      }).addTo(map);
      circle.bindPopup(zone.title);
      circles.set(zone.id, circle);
    }

    const ownerTeam = teamsById.get(zone.ownerTeamId);
    const ownerLogoUrl = ownerTeam ? resolveLogoUrl(ownerTeam.logoPath) : '';
    if (!ownerLogoUrl) {
      if (zoneOwnerMarkers.has(zone.id)) {
        map.removeLayer(zoneOwnerMarkers.get(zone.id));
        zoneOwnerMarkers.delete(zone.id);
      }
      return;
    }

    const ownerIcon = createZoneOwnerIcon(ownerLogoUrl);
    if (!ownerIcon) {
      return;
    }

    if (zoneOwnerMarkers.has(zone.id)) {
      const marker = zoneOwnerMarkers.get(zone.id);
      marker.setLatLng([zone.latitude, zone.longitude]);
      marker.setIcon(ownerIcon);
      marker.bindPopup(`<strong>${zone.title}</strong><br>${zone.ownerTeam || ownerTeam?.name || ''}`);
    } else {
      const ownerMarker = L.marker([zone.latitude, zone.longitude], { icon: ownerIcon }).addTo(map);
      ownerMarker.bindPopup(`<strong>${zone.title}</strong><br>${zone.ownerTeam || ownerTeam?.name || ''}`);
      zoneOwnerMarkers.set(zone.id, ownerMarker);
    }
  };

  const upsertTeamMarker = (team) => {
    if (team.latitude === null || team.longitude === null || !Number.isFinite(Number(team.latitude)) || !Number.isFinite(Number(team.longitude))) {
      if (teamMarkers.has(team.id)) {
        map.removeLayer(teamMarkers.get(team.id));
        teamMarkers.delete(team.id);
      }
      return;
    }

    const teamIcon = createTeamIcon(resolveLogoUrl(team.logoPath));
    if (!teamMarkers.has(team.id)) {
      const markerOptions = teamIcon ? { icon: teamIcon } : undefined;
      const marker = L.marker([team.latitude, team.longitude], markerOptions).addTo(map);
      marker.bindPopup(`<strong>${team.name || ''}</strong><br>Score: ${Number(team.score || 0)}`);
      teamMarkers.set(team.id, marker);
      return;
    }

    const marker = teamMarkers.get(team.id);
    marker.setLatLng([team.latitude, team.longitude]);
    if (teamIcon) {
      marker.setIcon(teamIcon);
    }
    marker.bindPopup(`<strong>${team.name || ''}</strong><br>Score: ${Number(team.score || 0)}`);
  };

  const applySnapshot = (payload) => {
    teamsById.clear();
    zonesById.clear();
    devices = Array.isArray(payload.devices) ? payload.devices : [];

    (payload.teams || []).forEach((team) => {
      teamsById.set(team.id, { ...team });
    });

    (payload.zones || []).forEach((zone) => {
      zonesById.set(zone.id, { ...zone });
    });

    renderBoard();

    const currentZoneIds = new Set(zonesById.keys());
    zonesById.forEach((zone) => upsertZoneVisual(zone));
    circles.forEach((circle, zoneId) => {
      if (!currentZoneIds.has(zoneId)) {
        map.removeLayer(circle);
        circles.delete(zoneId);
      }
    });
    zoneOwnerMarkers.forEach((marker, zoneId) => {
      if (!currentZoneIds.has(zoneId)) {
        map.removeLayer(marker);
        zoneOwnerMarkers.delete(zoneId);
      }
    });

    const currentTeamIds = new Set(teamsById.keys());
    teamsById.forEach((team) => upsertTeamMarker(team));
    teamMarkers.forEach((marker, id) => {
      if (!currentTeamIds.has(id)) {
        map.removeLayer(marker);
        teamMarkers.delete(id);
      }
    });

    const currentDeviceIds = new Set(devices.map((device) => String(device.deviceId || '')));
    deviceMarkers.forEach((marker, id) => {
      if (!currentDeviceIds.has(id)) {
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

  let ws = null;
  const requestSnapshot = () => {
    if (!ws || !ws.isOpen()) {
      return;
    }

    if (typeof ws.isAuthenticated === 'function' && !ws.isAuthenticated()) {
      return;
    }

    ws.send('territory_control.overview.bootstrap', {});
  };

  const wsGameId = root.dataset.wsGameId || '';
  const wsAdminToken = root.dataset.wsAdminToken || '';
  if (window.JotiWs && wsGameId && wsAdminToken) {
    ws = window.JotiWs.connect({
      role: 'admin',
      gameId: wsGameId,
      adminToken: wsAdminToken,
      reconnectMs: 3000,
    });

    ws.onOpen(() => {
      requestSnapshot();
    });

    ws.onAuthenticated(() => {
      requestSnapshot();
    });

    ws.onEvent((event) => {
      if (event.command === 'team.location.updated') {
        const payload = event.payload || {};
        const teamId = String(payload.teamId || '');
        if (!teamId || !teamsById.has(teamId)) {
          return;
        }

        const team = teamsById.get(teamId);
        const latitude = Number(payload?.location?.latitude);
        const longitude = Number(payload?.location?.longitude);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          team.latitude = latitude;
          team.longitude = longitude;
        }
        if (Number.isFinite(Number(payload.score))) {
          team.score = Number(payload.score);
        }
        if (payload.teamName) {
          team.name = payload.teamName;
        }
        if (payload.logoPath !== undefined && payload.logoPath !== null) {
          team.logoPath = payload.logoPath;
        }
        if (Array.isArray(payload.teamDevices)) {
          mergeTeamDevices(teamId, payload.teamDevices);
        }

        applySnapshot({
          teams: Array.from(teamsById.values()),
          zones: Array.from(zonesById.values()),
          devices,
        });
        updateTeamCard(teamId);
        return;
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

        applySnapshot({
          teams: Array.from(teamsById.values()),
          zones: Array.from(zonesById.values()),
          devices,
        });
        pushAntiCheatLog(payload);
        return;
      }

      if (event.command === 'territory_control.zone.owner_changed') {
        const payload = event.payload || {};
        const zoneId = String(payload.zoneId || '');
        if (!zoneId || !zonesById.has(zoneId)) {
          return;
        }

        const zone = zonesById.get(zoneId);
        zone.ownerTeamId = payload.ownerTeamId || null;
        zone.ownerTeam = payload.ownerTeam || teamsById.get(zone.ownerTeamId)?.name || null;
        zone.capturedAt = payload.capturedAt || zone.capturedAt || null;

        upsertZoneVisual(zone);
        updateZoneCountsInBoard();
        return;
      }

      if (event.command === 'territory_control.scores.updated') {
        const payload = event.payload || {};
        if (payload.teamId && Number.isFinite(Number(payload.score)) && teamsById.has(String(payload.teamId))) {
          const teamId = String(payload.teamId);
          const team = teamsById.get(teamId);
          team.score = Number(payload.score);
          updateTeamCard(teamId);
          upsertTeamMarker(team);
        }

        if (Array.isArray(payload.teams)) {
          payload.teams.forEach((entry) => {
            const teamId = String(entry?.teamId || entry?.id || '');
            if (!teamId || !teamsById.has(teamId) || !Number.isFinite(Number(entry?.score))) {
              return;
            }
            const team = teamsById.get(teamId);
            team.score = Number(entry.score);
            updateTeamCard(teamId);
            upsertTeamMarker(team);
          });
        }

        if (payload.teamScores && typeof payload.teamScores === 'object') {
          Object.entries(payload.teamScores).forEach(([rawTeamId, rawScore]) => {
            const teamId = String(rawTeamId || '');
            if (!teamId || !teamsById.has(teamId) || !Number.isFinite(Number(rawScore))) {
              return;
            }
            const team = teamsById.get(teamId);
            team.score = Number(rawScore);
            updateTeamCard(teamId);
            upsertTeamMarker(team);
          });
        }

        return;
      }

      if (event.command === 'super_admin.team.force_updated') {
        const forcedTeam = event.payload?.team || null;
        const teamId = String(forcedTeam?.id || '');
        if (!teamId || !teamsById.has(teamId)) {
          return;
        }

        const team = teamsById.get(teamId);
        if (forcedTeam.name) {
          team.name = forcedTeam.name;
        }
        if (forcedTeam.logoPath !== undefined) {
          team.logoPath = forcedTeam.logoPath;
        }
        if (Number.isFinite(Number(forcedTeam.score))) {
          team.score = Number(forcedTeam.score);
        }
        if (forcedTeam.location) {
          const latitude = Number(forcedTeam.location.latitude);
          const longitude = Number(forcedTeam.location.longitude);
          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            team.latitude = latitude;
            team.longitude = longitude;
          }
        }

        updateTeamCard(teamId);
        upsertTeamMarker(team);
      }
    });

    ws.onAck((ack) => {
      if (ack.command === 'territory_control.overview.bootstrap') {
        hydrateAntiCheatLog(ack.payload?.antiCheatLog || []);
        applySnapshot(ack.payload || {});
      }
    });
  }
})();
