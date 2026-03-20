(() => {
  const mapContainer = document.getElementById('resource-run-admin-map') || document.getElementById('resource-run-node-map');
  if (!mapContainer || typeof L === 'undefined') {
    return;
  }

  const parseFloatSafe = (value, fallback) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const latInput = document.querySelector('[data-resource-lat]');
  const lonInput = document.querySelector('[data-resource-lon]');
  const isNewNodeForm = mapContainer.id === 'resource-run-node-map' && mapContainer.dataset.isNew === '1';

  const hasNodeData = mapContainer.dataset.nodes !== undefined;
  const fallbackLat = 51.05;
  const fallbackLon = 3.72;
  const initialLat = parseFloatSafe(mapContainer.dataset.lat, fallbackLat);
  const initialLon = parseFloatSafe(mapContainer.dataset.lon, fallbackLon);

  const map = L.map(mapContainer).setView(
    [initialLat, initialLon],
    hasNodeData ? 13 : 15,
  );

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const centerOnCurrentLocation = (zoom = 15, onSuccess) => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        map.setView([lat, lon], zoom);
        if (onSuccess) {
          onSuccess(lat, lon);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  if (hasNodeData) {
    let nodes = [];
    let teams = [];
    try {
      nodes = JSON.parse(mapContainer.dataset.nodes || '[]');
    } catch {
      nodes = [];
    }
    try {
      teams = JSON.parse(mapContainer.dataset.teams || '[]');
    } catch {
      teams = [];
    }

    const assetBase = mapContainer.dataset.assetBase || '/';
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

    const nodeMarkers = new Map();
    const nodeCircles = new Map();
    const teamMarkers = new Map();
    const deviceMarkers = new Map();
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
    mapContainer.appendChild(antiCheatFeed);

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

    const renderDevices = (liveDevices, liveTeams) => {
      const teamNameById = new Map((liveTeams || []).map((team) => [String(team.id), String(team.name || '')]));
      const formatDevicePopup = (device, deviceId) => {
        const teamName = teamNameById.get(String(device.teamId || '')) || 'Team';
        const status = device.suspicious ? `Suspicious (${device.lastViolationCode || 'rejected'})` : 'Active';
        return `<strong>${teamName}</strong><br>Device: ${deviceId}<br>Status: ${status}`;
      };
      const currentDeviceIds = new Set((liveDevices || []).map((device) => String(device.deviceId || '')));
      deviceMarkers.forEach((marker, id) => {
        if (!currentDeviceIds.has(id)) {
          map.removeLayer(marker);
          deviceMarkers.delete(id);
        }
      });

      (liveDevices || []).forEach((device) => {
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

    const renderLive = (liveNodes, liveTeams, liveDevices) => {
      const currentNodeIds = new Set((liveNodes || []).map((node) => node.id));
      nodeMarkers.forEach((marker, id) => {
        if (!currentNodeIds.has(id)) {
          map.removeLayer(marker);
          nodeMarkers.delete(id);
        }
      });
      nodeCircles.forEach((circle, id) => {
        if (!currentNodeIds.has(id)) {
          map.removeLayer(circle);
          nodeCircles.delete(id);
        }
      });

      (liveNodes || []).forEach((node) => {
        const markerColor = node.markerColor || '#ef4444';

        if (!nodeMarkers.has(node.id)) {
          const marker = L.marker([node.latitude, node.longitude]).addTo(map);
          marker.bindPopup(`${node.title} (${node.resourceType})`);
          nodeMarkers.set(node.id, marker);

          const circle = L.circle([node.latitude, node.longitude], {
            radius: node.radius ?? node.radiusMeters ?? 25,
            color: markerColor,
            fillColor: markerColor,
            fillOpacity: 0.2,
          }).addTo(map);
          nodeCircles.set(node.id, circle);
          return;
        }

        const marker = nodeMarkers.get(node.id);
        marker.setLatLng([node.latitude, node.longitude]);
        marker.bindPopup(`${node.title} (${node.resourceType})`);

        const circle = nodeCircles.get(node.id);
        circle.setLatLng([node.latitude, node.longitude]);
        circle.setRadius(node.radius ?? node.radiusMeters ?? 25);
        circle.setStyle({ color: markerColor, fillColor: markerColor });
      });

      const currentTeamIds = new Set((liveTeams || []).map((team) => team.id));
      teamMarkers.forEach((marker, id) => {
        if (!currentTeamIds.has(id)) {
          map.removeLayer(marker);
          teamMarkers.delete(id);
        }
      });

      (liveTeams || []).forEach((team) => {
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
          marker.bindPopup(`<strong>${team.name}</strong><br>Score: ${team.score ?? ''}`);
          teamMarkers.set(team.id, marker);
          return;
        }

        const marker = teamMarkers.get(team.id);
        marker.setLatLng([team.latitude, team.longitude]);
        if (teamIcon) {
          marker.setIcon(teamIcon);
        }
        marker.bindPopup(`<strong>${team.name}</strong><br>Score: ${team.score ?? ''}`);
      });

      renderDevices(liveDevices, liveTeams);
    };

    const liveState = {
      nodes,
      teams,
      devices: [],
    };

    const mergeTeamDevices = (teamId, devices) => {
      const key = String(teamId || '');
      if (!key) {
        return;
      }

      const retained = (liveState.devices || []).filter((device) => String(device.teamId || '') !== key);
      const incoming = Array.isArray(devices) ? devices : [];
      liveState.devices = [...retained, ...incoming];
    };

    const applyLiveState = () => {
      renderLive(liveState.nodes, liveState.teams, liveState.devices);
    };

    applyLiveState();

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

    const wsGameId = mapContainer.dataset.wsGameId || '';
    const wsAdminToken = mapContainer.dataset.wsAdminToken || '';
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
          const team = liveState.teams.find((entry) => String(entry.id) === teamId);
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
          applyLiveState();
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
          applyLiveState();
          return;
        }

        if (event.command === 'resource_run.resource.claimed') {
          const payload = event.payload || {};
          const teamId = String(payload.teamId || '');
          const team = liveState.teams.find((entry) => String(entry.id) === teamId);
          if (!team) {
            return;
          }

          const pointsAwarded = Number(payload.pointsAwarded || 0);
          if (Number.isFinite(pointsAwarded)) {
            team.score = Number(team.score || 0) + pointsAwarded;
          }
          applyLiveState();
          return;
        }

        if (event.command === 'resource_run.nodes.updated') {
          const payload = event.payload || {};
          const nodeId = String(payload.nodeId || payload?.node?.id || '');
          if (!nodeId) {
            return;
          }

          if (payload.reason === 'deleted') {
            liveState.nodes = liveState.nodes.filter((node) => String(node.id) !== nodeId);
            applyLiveState();
            return;
          }

          if (payload.node && typeof payload.node === 'object') {
            const index = liveState.nodes.findIndex((node) => String(node.id) === nodeId);
            if (index === -1) {
              liveState.nodes.push(payload.node);
            } else {
              liveState.nodes[index] = {
                ...liveState.nodes[index],
                ...payload.node,
              };
            }
            applyLiveState();
          }
          return;
        }

        if (event.command === 'super_admin.team.force_updated') {
          const forcedTeam = event.payload?.team;
          const teamId = String(forcedTeam?.id || '');
          if (!teamId) {
            return;
          }

          const index = liveState.teams.findIndex((team) => String(team.id) === teamId);
          if (index === -1) {
            return;
          }

          liveState.teams[index] = {
            ...liveState.teams[index],
            name: forcedTeam.name ?? liveState.teams[index].name,
            score: Number(forcedTeam.geoScore ?? forcedTeam.score ?? liveState.teams[index].score ?? 0),
            logoPath: forcedTeam.logoPath ?? liveState.teams[index].logoPath,
            latitude: forcedTeam.geoLatitude ?? forcedTeam.latitude ?? liveState.teams[index].latitude,
            longitude: forcedTeam.geoLongitude ?? forcedTeam.longitude ?? liveState.teams[index].longitude,
          };
          applyLiveState();
          return;
        }
      });

      ws.onAck((ack) => {
        if (ack.command === 'resource_run.overview.bootstrap') {
          const payload = ack.payload || {};
          liveState.nodes = payload.nodes || [];
          liveState.teams = payload.teams || [];
          liveState.devices = payload.devices || [];
          hydrateAntiCheatLog(payload.antiCheatLog || []);
          applyLiveState();
        }
      });
    }
    requestSnapshot();

    centerOnCurrentLocation(13, () => {});
    return;
  }

  const marker = L.marker([initialLat, initialLon], { draggable: true }).addTo(map);

  const syncInputs = (lat, lon) => {
    if (latInput) latInput.value = lat.toFixed(6);
    if (lonInput) lonInput.value = lon.toFixed(6);
  };

  syncInputs(initialLat, initialLon);

  if (isNewNodeForm) {
    centerOnCurrentLocation(15, (lat, lon) => {
      marker.setLatLng([lat, lon]);
      syncInputs(lat, lon);
    });
  }

  marker.on('dragend', (event) => {
    const { lat, lng } = event.target.getLatLng();
    syncInputs(lat, lng);
  });

  map.on('click', (event) => {
    marker.setLatLng(event.latlng);
    syncInputs(event.latlng.lat, event.latlng.lng);
  });
})();
