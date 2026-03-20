(() => {
  const adminMap = document.getElementById('crazy88-admin-map');
  const taskMap = document.getElementById('crazy88-task-map');
  const overviewRoot = document.getElementById('crazy88-overview');

  const addBaseMap = (node, lat = 51.05, lon = 3.72, zoom = 13) => {
    if (typeof L === 'undefined') {
      return null;
    }

    const map = L.map(node).setView([lat, lon], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    return map;
  };

  const focusMapOnUserLocation = (map, zoom = 15) => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setView([position.coords.latitude, position.coords.longitude], zoom);
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 8000,
      }
    );
  };

  if (adminMap) {
    let tasks = [];
    try {
      tasks = JSON.parse(adminMap.dataset.tasks || '[]');
    } catch {
      tasks = [];
    }

    const map = addBaseMap(adminMap);
    if (map) {
      focusMapOnUserLocation(map, 15);
    }

    if (map) {
      tasks.forEach((task) => {
        if (typeof task.latitude !== 'number' || typeof task.longitude !== 'number') {
          return;
        }

        L.circle([task.latitude, task.longitude], {
          radius: task.radius || 25,
          color: '#7c3aed',
          fillColor: '#7c3aed',
          fillOpacity: 0.15,
        }).addTo(map);

        L.marker([task.latitude, task.longitude])
          .addTo(map)
          .bindPopup(`<strong>${task.title}</strong><br>+${task.points} pts`);
      });
    }
  }

  if (taskMap) {
    const latInput = document.getElementById('crazy88-lat');
    const lonInput = document.getElementById('crazy88-lon');

    const inputLat = Number.parseFloat(taskMap.dataset.lat || '');
    const inputLon = Number.parseFloat(taskMap.dataset.lon || '');
    const hasLocation = Number.isFinite(inputLat) && Number.isFinite(inputLon);

    const lat = hasLocation ? inputLat : 51.05;
    const lon = hasLocation ? inputLon : 3.72;

    const map = addBaseMap(taskMap, lat, lon, hasLocation ? 15 : 13);
    if (!map) {
      return;
    }

    if (!hasLocation) {
      focusMapOnUserLocation(map, 15);
    }
    let marker = null;

    const syncInputs = (nextLat, nextLon) => {
      if (latInput) {
        latInput.value = String(nextLat.toFixed(6));
      }
      if (lonInput) {
        lonInput.value = String(nextLon.toFixed(6));
      }
    };

    if (hasLocation) {
      marker = L.marker([lat, lon], { draggable: true }).addTo(map);
      marker.on('dragend', (event) => {
        const point = event.target.getLatLng();
        syncInputs(point.lat, point.lng);
      });
    }

    map.on('click', (event) => {
      if (!marker) {
        marker = L.marker(event.latlng, { draggable: true }).addTo(map);
        marker.on('dragend', (dragEvent) => {
          const point = dragEvent.target.getLatLng();
          syncInputs(point.lat, point.lng);
        });
      } else {
        marker.setLatLng(event.latlng);
      }

      syncInputs(event.latlng.lat, event.latlng.lng);
    });
  }

  if (overviewRoot) {
    const mapNode = document.getElementById('crazy88-overview-map');
    const teamsNode = document.getElementById('crazy88-overview-teams');
    if (!teamsNode) {
      return;
    }

    let copy = {};
    try {
      copy = JSON.parse(overviewRoot.dataset.copy || '{}');
    } catch {
      copy = {};
    }
    let teamLoginMeta = {};
    try {
      teamLoginMeta = JSON.parse(overviewRoot.dataset.teamLoginMeta || '{}');
    } catch {
      teamLoginMeta = {};
    }
    const loginAsLabel = overviewRoot.dataset.loginAsLabel || 'Login as team';

    const isGeoLocked = overviewRoot.dataset.isGeoLocked === '1';
    const map = mapNode && isGeoLocked ? addBaseMap(mapNode) : null;
    if (map) {
      focusMapOnUserLocation(map, 14);
    }
    const teamMarkers = new Map();
    const taskLayers = new Map();
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
      if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('/')) {
        return path;
      }
      return `${window.location.origin}/${path.replace(/^\/+/, '')}`;
    };
    const createTeamIcon = (logoPath) => {
      const logoUrl = buildAssetUrl(logoPath);
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

    const buildLoginAction = (teamId) => {
      const meta = teamLoginMeta[String(teamId)] || teamLoginMeta[teamId] || null;
      if (!meta || !meta.url || !meta.token) {
        return '-';
      }

      return `<form method="post" action="${meta.url}" target="_blank" rel="noopener noreferrer"><input type="hidden" name="_token" value="${meta.token}"><button class="btn btn-ghost btn-small" type="submit">${loginAsLabel}</button></form>`;
    };

    const render = (payload) => {
      const tasks = payload.tasks || [];
      const teams = payload.teams || [];

      if (map) {
        const taskIds = new Set(tasks.map((task) => task.id));
        taskLayers.forEach((layer, id) => {
          if (!taskIds.has(id)) {
            map.removeLayer(layer);
            taskLayers.delete(id);
          }
        });

        tasks.forEach((task) => {
          if (typeof task.latitude !== 'number' || typeof task.longitude !== 'number') {
            return;
          }

          if (taskLayers.has(task.id)) {
            return;
          }

          const circle = L.circle([task.latitude, task.longitude], {
            radius: task.radius || 25,
            color: '#7c3aed',
            fillColor: '#7c3aed',
            fillOpacity: 0.1,
          });

          const marker = L.marker([task.latitude, task.longitude]).bindPopup(`<strong>${task.title}</strong><br>+${task.points} pts`);
          const group = L.layerGroup([circle, marker]).addTo(map);
          taskLayers.set(task.id, group);
        });

        const teamIds = new Set(teams.map((team) => team.id));
        teamMarkers.forEach((marker, id) => {
          if (!teamIds.has(id)) {
            map.removeLayer(marker);
            teamMarkers.delete(id);
          }
        });

        teams.forEach((team) => {
          if (team.latitude === null || team.longitude === null) {
            return;
          }

          const teamIcon = createTeamIcon(team.logoPath);

          if (!teamMarkers.has(team.id)) {
            teamMarkers.set(team.id, L.marker([team.latitude, team.longitude], teamIcon ? { icon: teamIcon } : undefined).addTo(map));
          }

          const marker = teamMarkers.get(team.id);
          marker.setLatLng([team.latitude, team.longitude]);
          if (teamIcon) {
            marker.setIcon(teamIcon);
          }
          marker.bindPopup(`<strong>${team.name}</strong><br>${copy.points || ''}: ${team.score}<br>${copy.pending || ''}: ${team.pendingReviews}`);
        });
      }

      const sorted = [...teams].sort((a, b) => b.score - a.score);
      if (sorted.length === 0) {
        teamsNode.innerHTML = `<p class="muted">${copy.no_teams || ''}</p>`;
        return;
      }

      teamsNode.innerHTML = `<section class="overview-grid">${sorted
        .map((team) => `<article class="team-card"><div class="team-card-header"><div class="team-identity">${team.logoPath ? `<img class="team-logo" src="${buildAssetUrl(team.logoPath)}" alt="${escapeHtml(team.name || '')}">` : ''}<div><h2>${escapeHtml(team.name || '')}</h2><p class="team-code">${escapeHtml(team.code || '')}</p></div></div><div class="team-lives"><span class="team-lives-value">${Number(team.score || 0)}</span><span class="team-lives-label">${escapeHtml(copy.points || 'Points')}</span></div></div><div class="team-section"><h3>${escapeHtml(copy.pending || 'Pending')}</h3><p class="muted">${Number(team.pendingReviews || 0)}</p></div><div class="team-card-actions">${buildLoginAction(team.id)}</div></article>`)
        .join('')}</section>`;
    };

    const poll = async () => {
      const response = await fetch(overviewRoot.dataset.pollUrl, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
      });
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      render(payload);
    };

    const wsGameId = overviewRoot.dataset.wsGameId || '';
    const wsAdminToken = overviewRoot.dataset.wsAdminToken || '';
    if (window.JotiWs && wsGameId && wsAdminToken) {
      const ws = window.JotiWs.connect({
        role: 'admin',
        gameId: wsGameId,
        adminToken: wsAdminToken,
        reconnectMs: 3000,
      });

      ws.onOpen(() => {
        poll();
      });

      ws.onEvent((event) => {
        if (
          event.command === 'crazy88.task.submitted'
          || event.command === 'crazy88.review.judged'
          || event.command === 'team.location.updated'
          || event.command === 'super_admin.team.force_updated'
          || event.command === 'game.reset'
        ) {
          poll();
        }
      });
    }

    poll();
  }
})();
