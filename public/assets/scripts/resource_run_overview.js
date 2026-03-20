(() => {
  const root = document.getElementById('resource-run-overview');
  const mapElement = document.getElementById('resource-run-overview-map');
  const board = document.getElementById('resource-run-team-board');
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

  const nodeMarkers = new Map();
  const nodeCircles = new Map();
  const teamMarkers = new Map();
  const deviceMarkers = new Map();
  const pollUrl = root.dataset.pollUrl || '';
  const assetBase = root.dataset.assetBase || '/';
  const actionLabel = root.dataset.actionLabel || 'Action';
  let teamLoginMeta = {};
  try {
    teamLoginMeta = JSON.parse(root.dataset.teamLoginMeta || '{}');
  } catch {
    teamLoginMeta = {};
  }
  const loginAsLabel = root.dataset.loginAsLabel || 'Login as team';
  const state = {
    teams: [],
    nodes: [],
    devices: [],
  };

  const mergeTeamDevices = (teamId, devices) => {
    const key = String(teamId || '');
    if (!key) {
      return;
    }

    const retained = state.devices.filter((device) => String(device.teamId || '') !== key);
    state.devices = [...retained, ...(Array.isArray(devices) ? devices : [])];
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

  const render = (payload) => {
    const teamCards = (payload.teams || []).map((team) => {
      const resources = Object.entries(team.resources || {}).map(([name, amount]) => `${escapeHtml(name)}: ${Number(amount || 0)}`).join(', ') || '-';
      return `
        <article class="team-card">
          <div class="team-card-header">
            <div class="team-identity">
              ${team.logoPath ? `<img class="team-logo" src="${resolveLogoUrl(team.logoPath)}" alt="${escapeHtml(team.name || '')}">` : ''}
              <div><h2>${escapeHtml(team.name || '')}</h2><p class="team-code">${escapeHtml(team.code || '')}</p></div>
            </div>
            <div class="team-lives"><span class="team-lives-value">${Number(team.score || 0)}</span><span class="team-lives-label">pts</span></div>
          </div>
          <div class="team-section"><h3>Inventory</h3><p class="muted">${resources}</p></div>
          <div class="team-card-actions">${buildLoginAction(team.id)}</div>
        </article>
      `;
    }).join('');
    board.innerHTML = `<section class="overview-grid">${teamCards}</section>`;

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
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(map);
        const marker = L.circleMarker([node.latitude, node.longitude], {
          radius: 7,
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.95,
          weight: 2,
        }).addTo(map);
        marker.bindPopup(`${node.title} (${node.resourceType})`);
        nodeCircles.set(node.id, circle);
        nodeMarkers.set(node.id, marker);
        return;
      }

      const circle = nodeCircles.get(node.id);
      circle.setLatLng([node.latitude, node.longitude]);
      circle.setRadius(node.radius ?? node.radiusMeters ?? 25);
      circle.setStyle({ color: markerColor, fillColor: markerColor });

      const marker = nodeMarkers.get(node.id);
      marker.setLatLng([node.latitude, node.longitude]);
      marker.setStyle({ color: markerColor, fillColor: markerColor });
    });

    const currentTeamIds = new Set((payload.teams || []).map((team) => team.id));
    teamMarkers.forEach((marker, id) => {
      if (!currentTeamIds.has(id)) {
        map.removeLayer(marker);
        teamMarkers.delete(id);
      }
    });

    (payload.teams || []).forEach((team) => {
      if (team.latitude === null || team.longitude === null) {
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
        marker.bindPopup(`<strong>${team.name}</strong><br>Score: ${team.score}`);
        teamMarkers.set(team.id, marker);
        return;
      }

      const marker = teamMarkers.get(team.id);
      marker.setLatLng([team.latitude, team.longitude]);
      if (teamIcon) {
        marker.setIcon(teamIcon);
      }
      marker.bindPopup(`<strong>${team.name}</strong><br>Score: ${team.score}`);
    });

    const teamNameById = new Map((payload.teams || []).map((team) => [String(team.id), String(team.name || '')]));
    const formatDevicePopup = (device, deviceId) => {
      const teamName = teamNameById.get(String(device.teamId || '')) || 'Team';
      const status = device.suspicious ? `Suspicious (${device.lastViolationCode || 'rejected'})` : 'Active';
      return `<strong>${teamName}</strong><br>Device: ${deviceId}<br>Status: ${status}`;
    };
    const currentDeviceIds = new Set((payload.devices || []).map((device) => String(device.deviceId || '')));
    deviceMarkers.forEach((marker, id) => {
      if (!currentDeviceIds.has(id)) {
        map.removeLayer(marker);
        deviceMarkers.delete(id);
      }
    });

    (payload.devices || []).forEach((device) => {
      const deviceId = String(device.deviceId || '');
      const latitude = Number(device.latitude);
      const longitude = Number(device.longitude);
      if (!deviceId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      const popup = formatDevicePopup(device, deviceId);
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

  const applyState = () => {
    render({
      teams: state.teams,
      nodes: state.nodes,
      devices: state.devices,
    });
  };

  const upsertTeam = (nextTeam) => {
    const teamId = String(nextTeam?.id || '');
    if (!teamId) {
      return;
    }

    const index = state.teams.findIndex((team) => String(team.id) === teamId);
    if (index === -1) {
      state.teams.push({ ...nextTeam, id: teamId });
      return;
    }

    state.teams[index] = {
      ...state.teams[index],
      ...nextTeam,
      id: teamId,
    };
  };

  const upsertNode = (nextNode) => {
    const nodeId = String(nextNode?.id || '');
    if (!nodeId) {
      return;
    }

    const index = state.nodes.findIndex((node) => String(node.id) === nodeId);
    if (index === -1) {
      state.nodes.push({ ...nextNode, id: nodeId });
      return;
    }

    state.nodes[index] = {
      ...state.nodes[index],
      ...nextNode,
      id: nodeId,
    };
  };

  const poll = async () => {
    if (!pollUrl) {
      return;
    }

    try {
      const response = await fetch(pollUrl, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      state.teams = Array.isArray(payload?.teams) ? payload.teams : [];
      state.nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
      state.devices = Array.isArray(payload?.devices) ? payload.devices : [];
      applyState();
    } catch (_error) {
    }
  };

  let ws = null;
  const requestSnapshot = () => {
    if (!ws || !ws.isOpen()) {
      return;
    }

    if (typeof ws.isAuthenticated === 'function' && !ws.isAuthenticated()) {
      return;
    }

    ws.send('resource_run.overview.bootstrap', {});
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
        const team = state.teams.find((entry) => String(entry.id) === teamId);
        if (!team) {
          return;
        }

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
        applyState();
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

        pushAntiCheatLog(payload);
        applyState();
        return;
      }

      if (event.command === 'resource_run.resource.claimed') {
        const payload = event.payload || {};
        const teamId = String(payload.teamId || '');
        const team = state.teams.find((entry) => String(entry.id) === teamId);
        if (!team) {
          return;
        }

        const pointsAwarded = Number(payload.pointsAwarded || 0);
        if (Number.isFinite(pointsAwarded)) {
          team.score = Number(team.score || 0) + pointsAwarded;
        }

        const resourceType = String(payload.resourceType || '').trim();
        if (resourceType) {
          team.resources = team.resources && typeof team.resources === 'object' ? team.resources : {};
          team.resources[resourceType] = Number(team.resources[resourceType] || 0) + 1;
        }

        applyState();
        return;
      }

      if (event.command === 'resource_run.nodes.updated') {
        const payload = event.payload || {};
        const nodeId = String(payload.nodeId || payload?.node?.id || '');
        if (!nodeId) {
          return;
        }

        if (payload.reason === 'deleted') {
          state.nodes = state.nodes.filter((node) => String(node.id) !== nodeId);
          applyState();
          return;
        }

        if (payload.node && typeof payload.node === 'object') {
          upsertNode(payload.node);
          applyState();
        }
        return;
      }

      if (event.command === 'super_admin.team.force_updated') {
        const forcedTeam = event.payload?.team;
        if (!forcedTeam || !forcedTeam.id) {
          return;
        }

        const teamId = String(forcedTeam.id);
        upsertTeam({
          id: teamId,
          name: forcedTeam.name,
          code: forcedTeam.code,
          latitude: forcedTeam.geoLatitude ?? forcedTeam.latitude ?? null,
          longitude: forcedTeam.geoLongitude ?? forcedTeam.longitude ?? null,
          score: Number(forcedTeam.geoScore ?? forcedTeam.score ?? 0),
          logoPath: forcedTeam.logoPath ?? null,
        });
        applyState();
      }
    });

    ws.onAck((ack) => {
      if (ack.command === 'resource_run.overview.bootstrap') {
        state.teams = Array.isArray(ack.payload?.teams) ? ack.payload.teams : [];
        state.nodes = Array.isArray(ack.payload?.nodes) ? ack.payload.nodes : [];
        state.devices = Array.isArray(ack.payload?.devices) ? ack.payload.devices : [];
        hydrateAntiCheatLog(ack.payload?.antiCheatLog || []);
        applyState();
      }
    });
  }

  if (!ws) {
    poll();
  }
})();
