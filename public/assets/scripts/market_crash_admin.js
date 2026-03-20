(() => {
  const adminMap = document.getElementById('market-crash-admin-map');
  const pointMap = document.getElementById('market-crash-point-map');
  const overviewRoot = document.getElementById('market-crash-overview');

  if (typeof L === 'undefined') {
    return;
  }

  const toFloat = (value, fallback) => {
    const number = Number.parseFloat(String(value));
    return Number.isFinite(number) ? number : fallback;
  };

  const centerOnCurrentPosition = (map, zoom = 15) => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setView([position.coords.latitude, position.coords.longitude], zoom);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 7000 },
    );
  };

  if (adminMap) {
    let points = [];
    try {
      points = JSON.parse(adminMap.dataset.points || '[]');
    } catch {
      points = [];
    }

    const map = L.map(adminMap).setView([51.05, 3.72], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    centerOnCurrentPosition(map, 15);

    points.forEach((point) => {
      const color = point.markerColor || '#2563eb';
      L.circle([point.latitude, point.longitude], {
        radius: point.radius || 25,
        color,
        fillColor: color,
        fillOpacity: 0.2,
      }).addTo(map);

      const buyRows = Object.entries(point.buyPrices || {})
        .map(([name, price]) => `${name}: ${price}`)
        .join('<br>') || '-';
      const sellRows = Object.entries(point.sellPrices || {})
        .map(([name, price]) => `${name}: ${price}`)
        .join('<br>') || '-';
      const fluctuationRows = Object.entries(point.fluctuationSettings || {})
        .map(([name, config]) => `${name}: ${config.tickSeconds}s ±${config.fluctuationPercent}%`)
        .join('<br>') || '-';

      L.circleMarker([point.latitude, point.longitude], {
        radius: 7,
        color,
        fillColor: color,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup(`<strong>${point.title}</strong><br>Buy:<br>${buyRows}<br><br>Sell:<br>${sellRows}<br><br>Fluctuation:<br>${fluctuationRows}`);
    });
  }

  if (pointMap) {
    const latInput = document.querySelector('[data-market-crash-lat]');
    const lonInput = document.querySelector('[data-market-crash-lon]');

    const lat = toFloat(pointMap.dataset.lat, 51.05);
    const lon = toFloat(pointMap.dataset.lon, 3.72);

    const map = L.map(pointMap).setView([lat, lon], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    centerOnCurrentPosition(map, 16);

    const marker = L.marker([lat, lon], { draggable: true }).addTo(map);

    const sync = (nextLat, nextLon) => {
      if (latInput) latInput.value = nextLat.toFixed(6);
      if (lonInput) lonInput.value = nextLon.toFixed(6);
    };

    marker.on('dragend', (event) => {
      const next = event.target.getLatLng();
      sync(next.lat, next.lng);
    });

    map.on('click', (event) => {
      marker.setLatLng(event.latlng);
      sync(event.latlng.lat, event.latlng.lng);
    });
  }

  if (overviewRoot) {
    const mapElement = document.getElementById('market-crash-overview-map');
    const teamsElement = document.getElementById('market-crash-overview-teams');
    if (!mapElement || !teamsElement) {
      return;
    }

    let copy = {};
    try {
      copy = JSON.parse(overviewRoot.dataset.copy || '{}');
    } catch {
      copy = {};
    }
    const actionLabel = overviewRoot.dataset.actionLabel || 'Action';
    let teamLoginMeta = {};
    try {
      teamLoginMeta = JSON.parse(overviewRoot.dataset.teamLoginMeta || '{}');
    } catch {
      teamLoginMeta = {};
    }
    const loginAsLabel = overviewRoot.dataset.loginAsLabel || 'Login as team';

    const map = L.map(mapElement).setView([51.05, 3.72], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    centerOnCurrentPosition(map, 14);

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

    const pointLayers = new Map();
    const teamLayers = new Map();
    const deviceLayers = new Map();
    const liveState = {
      points: [],
      teams: [],
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

    const formatInventory = (inventory) => {
      const entries = Object.entries(inventory || {});
      if (entries.length === 0) {
        return '-';
      }

      return entries
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, quantity]) => `${name}: ${quantity}`)
        .join(', ');
    };

    const resolveLogoUrl = (logoPath) => {
      if (!logoPath) {
        return '';
      }
      if (/^(https?:)?\/\//.test(logoPath) || logoPath.startsWith('data:') || logoPath.startsWith('/')) {
        return logoPath;
      }
      const base = (overviewRoot.dataset.assetBase || '/');
      return `${base}${logoPath}`;
    };
    const createTeamIcon = (logoPath) => {
      const logoUrl = resolveLogoUrl(logoPath);
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
      const points = payload.points || [];
      const teams = payload.teams || [];
      const devices = payload.devices || [];

      const pointIds = new Set(points.map((point) => point.id));
      pointLayers.forEach((layerGroup, id) => {
        if (!pointIds.has(id)) {
          map.removeLayer(layerGroup);
          pointLayers.delete(id);
        }
      });

      points.forEach((point) => {
        const color = point.markerColor || '#2563eb';
        if (pointLayers.has(point.id)) {
          return;
        }

        const circle = L.circle([point.latitude, point.longitude], {
          radius: point.radius || 25,
          color,
          fillColor: color,
          fillOpacity: 0.2,
        });

        const buyRows = Object.entries(point.buyPrices || {})
          .map(([name, price]) => `${name}: ${price}`)
          .join('<br>') || '-';
        const sellRows = Object.entries(point.sellPrices || {})
          .map(([name, price]) => `${name}: ${price}`)
          .join('<br>') || '-';
        const fluctuationRows = Object.entries(point.fluctuationSettings || {})
          .map(([name, config]) => `${name}: ${config.tickSeconds}s ±${config.fluctuationPercent}%`)
          .join('<br>') || '-';

        const marker = L.circleMarker([point.latitude, point.longitude], {
          radius: 7,
          color,
          fillColor: color,
          fillOpacity: 1,
        }).bindPopup(`<strong>${point.title}</strong><br>Buy:<br>${buyRows}<br><br>Sell:<br>${sellRows}<br><br>Fluctuation:<br>${fluctuationRows}`);

        const group = L.layerGroup([circle, marker]).addTo(map);
        pointLayers.set(point.id, group);
      });

      const teamIds = new Set(teams.map((team) => team.id));
      teamLayers.forEach((marker, id) => {
        if (!teamIds.has(id)) {
          map.removeLayer(marker);
          teamLayers.delete(id);
        }
      });

      teams.forEach((team) => {
        if (team.latitude === null || team.longitude === null) {
          return;
        }

        const teamIcon = createTeamIcon(team.logoPath);

        if (!teamLayers.has(team.id)) {
          teamLayers.set(team.id, L.marker([team.latitude, team.longitude], teamIcon ? { icon: teamIcon } : undefined).addTo(map));
        }

        const marker = teamLayers.get(team.id);
        marker.setLatLng([team.latitude, team.longitude]);
        if (teamIcon) {
          marker.setIcon(teamIcon);
        }
        marker.bindPopup(`<strong>${team.name}</strong><br>${copy.cash || ''}: ${team.money}<br>${copy.inventory || ''}: ${formatInventory(team.inventory)}`);
      });

      const teamNameById = new Map(teams.map((team) => [String(team.id), String(team.name || '')]));
      const formatDevicePopup = (device, deviceId) => {
        const teamName = teamNameById.get(String(device.teamId || '')) || 'Team';
        const status = device.suspicious ? `Suspicious (${device.lastViolationCode || 'rejected'})` : 'Active';
        return `<strong>${teamName}</strong><br>Device: ${deviceId}<br>Status: ${status}`;
      };
      const deviceIds = new Set(devices.map((device) => String(device.deviceId || '')));
      deviceLayers.forEach((marker, id) => {
        if (!deviceIds.has(id)) {
          map.removeLayer(marker);
          deviceLayers.delete(id);
        }
      });

      devices.forEach((device) => {
        const deviceId = String(device.deviceId || '');
        const latitude = Number(device.latitude);
        const longitude = Number(device.longitude);
        if (!deviceId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return;
        }

        const popup = formatDevicePopup(device, deviceId);
        const markerColor = device.suspicious ? '#dc2626' : '#111827';
        const fillColor = device.suspicious ? '#fecaca' : '#ffffff';
        if (!deviceLayers.has(deviceId)) {
          const marker = L.circleMarker([latitude, longitude], {
            radius: 5,
            color: markerColor,
            fillColor,
            fillOpacity: 1,
            weight: 2,
          }).addTo(map);
          marker.bindPopup(popup);
          deviceLayers.set(deviceId, marker);
          return;
        }

        const marker = deviceLayers.get(deviceId);
        marker.setLatLng([latitude, longitude]);
        marker.setStyle({ color: markerColor, fillColor });
        marker.bindPopup(popup);
      });

      const sortedTeams = [...teams].sort((a, b) => b.money - a.money);
      if (sortedTeams.length === 0) {
        teamsElement.innerHTML = `<p class="muted">${copy.no_teams || ''}</p>`;
        return;
      }

      teamsElement.innerHTML = `<section class="overview-grid">${sortedTeams
        .map((team) => `<article class="team-card"><div class="team-card-header"><div class="team-identity">${team.logoPath ? `<img class="team-logo" src="${resolveLogoUrl(team.logoPath)}" alt="${escapeHtml(team.name || '')}">` : ''}<div><h2>${escapeHtml(team.name || '')}</h2><p class="team-code">${escapeHtml(team.code || '')}</p></div></div><div class="team-lives"><span class="team-lives-value">${Number(team.money || 0)}</span><span class="team-lives-label">${escapeHtml(copy.cash || 'cash')}</span></div></div><div class="team-section"><h3>${escapeHtml(copy.inventory || 'Inventory')}</h3><p class="muted">${escapeHtml(formatInventory(team.inventory))}</p></div><div class="team-card-actions">${buildLoginAction(team.id)}</div></article>`)
        .join('')}</section>`;
    };

    const applyLiveState = () => {
      render({
        points: liveState.points,
        teams: liveState.teams,
        devices: liveState.devices,
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

      ws.send('market_crash.overview.bootstrap', {});
    };

    const wsGameId = overviewRoot.dataset.wsGameId || '';
    const wsAdminToken = overviewRoot.dataset.wsAdminToken || '';
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

        if (event.command === 'market_crash.trade.executed') {
          const payload = event.payload || {};
          const teamId = String(payload.teamId || '');
          const team = liveState.teams.find((entry) => String(entry.id) === teamId);
          if (!team) {
            return;
          }

          const quantity = Number(payload.quantity || 0);
          const total = Number(payload.total || 0);
          const resource = String(payload.resource || '').trim();
          const side = String(payload.side || '').toLowerCase();

          if (side === 'buy') {
            team.money = Number(team.money || 0) - total;
          } else if (side === 'sell') {
            team.money = Number(team.money || 0) + total;
          }

          if (resource) {
            team.inventory = team.inventory && typeof team.inventory === 'object' ? team.inventory : {};
            const current = Number(team.inventory[resource] || 0);
            if (side === 'buy') {
              team.inventory[resource] = current + quantity;
            } else if (side === 'sell') {
              team.inventory[resource] = Math.max(0, current - quantity);
            }
          }

          applyLiveState();
          return;
        }

        if (event.command === 'market_crash.prices.updated') {
          const pointDeltas = event.payload?.points;
          if (!pointDeltas || typeof pointDeltas !== 'object') {
            return;
          }

          Object.entries(pointDeltas).forEach(([pointId, resources]) => {
            const point = liveState.points.find((entry) => String(entry.id) === String(pointId));
            if (!point || !resources || typeof resources !== 'object') {
              return;
            }

            point.buyPrices = point.buyPrices && typeof point.buyPrices === 'object' ? point.buyPrices : {};
            point.sellPrices = point.sellPrices && typeof point.sellPrices === 'object' ? point.sellPrices : {};
            point.fluctuationSettings = point.fluctuationSettings && typeof point.fluctuationSettings === 'object' ? point.fluctuationSettings : {};

            Object.entries(resources).forEach(([resourceName, resourceConfig]) => {
              if (!resourceConfig || typeof resourceConfig !== 'object') {
                return;
              }

              if (Number.isFinite(Number(resourceConfig.buyPrice))) {
                point.buyPrices[resourceName] = Number(resourceConfig.buyPrice);
              }

              if (Number.isFinite(Number(resourceConfig.sellPrice))) {
                point.sellPrices[resourceName] = Number(resourceConfig.sellPrice);
              }

              point.fluctuationSettings[resourceName] = {
                tickSeconds: Number(resourceConfig.tickSeconds || point.fluctuationSettings?.[resourceName]?.tickSeconds || 0),
                fluctuationPercent: Number(resourceConfig.fluctuationPercent || point.fluctuationSettings?.[resourceName]?.fluctuationPercent || 0),
              };
            });
          });

          applyLiveState();
          return;
        }

        if (event.command === 'super_admin.team.force_updated') {
          const forcedTeam = event.payload?.team;
          const teamId = String(forcedTeam?.id || '');
          if (!teamId) {
            return;
          }

          const team = liveState.teams.find((entry) => String(entry.id) === teamId);
          if (!team) {
            return;
          }

          team.name = forcedTeam.name ?? team.name;
          team.code = forcedTeam.code ?? team.code;
          team.logoPath = forcedTeam.logoPath ?? team.logoPath;
          if (Number.isFinite(Number(forcedTeam.money))) {
            team.money = Number(forcedTeam.money);
          }
          if (forcedTeam.inventory && typeof forcedTeam.inventory === 'object') {
            team.inventory = forcedTeam.inventory;
          }
          if (Number.isFinite(Number(forcedTeam.geoLatitude ?? forcedTeam.latitude))) {
            team.latitude = Number(forcedTeam.geoLatitude ?? forcedTeam.latitude);
          }
          if (Number.isFinite(Number(forcedTeam.geoLongitude ?? forcedTeam.longitude))) {
            team.longitude = Number(forcedTeam.geoLongitude ?? forcedTeam.longitude);
          }

          applyLiveState();
        }
      });

      ws.onAck((ack) => {
        if (ack.command === 'market_crash.overview.bootstrap') {
          liveState.points = Array.isArray(ack.payload?.points) ? ack.payload.points : [];
          liveState.teams = Array.isArray(ack.payload?.teams) ? ack.payload.teams : [];
          liveState.devices = Array.isArray(ack.payload?.devices) ? ack.payload.devices : [];
          hydrateAntiCheatLog(ack.payload?.antiCheatLog || []);
          applyLiveState();
        }
      });
    }
  }
})();
