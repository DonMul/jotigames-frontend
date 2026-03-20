// Blind Hike Admin Overview - Real-time team tracking
document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('blindhike-overview-root');
    if (!root) {
        return;
    }

    const pollUrl = root.dataset.pollUrl || '';
    const assetBase = root.dataset.assetBase || '';
    let teamLoginMeta = {};
    try {
        teamLoginMeta = JSON.parse(root.dataset.teamLoginMeta || '{}');
    } catch {
        teamLoginMeta = {};
    }
    const loginAsLabel = root.dataset.loginAsLabel || 'Login as team';

    const map = L.map('blindhike-overview-map').setView([52.3676, 4.9041], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Store markers by team
    const teamMarkers = new Map();
    const markersByTeam = new Map();
    const teamStatesById = new Map();
    const teamOrder = [];
    const teamColorById = new Map();
    let targetMarker = null;
    let wsClient = null;

    // Team colors
    const teamColors = [
        '#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33',
        '#33FFF5', '#FF8C33', '#8C33FF', '#33FF8C', '#FF3333'
    ];

    const escapeHtml = (value) => String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

    const resolveLogoUrl = (logoPath) => {
        if (!logoPath) {
            return '';
        }

        if (/^(https?:)?\/\//.test(logoPath) || logoPath.startsWith('data:') || logoPath.startsWith('/')) {
            return logoPath;
        }

        return `${assetBase}${logoPath}`;
    };

    const createTeamLogoIcon = (logoPath) => {
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

    const ensureTeamColor = (teamId, fallbackIndex = 0) => {
        if (!teamColorById.has(teamId)) {
            teamColorById.set(teamId, teamColors[fallbackIndex % teamColors.length]);
        }
        return teamColorById.get(teamId);
    };

    const buildTeamMarkerIcon = (color, markerIndex) => L.icon({
        iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
                <path fill="${color}" stroke="#000" stroke-width="1.5" d="M12.5 0C5.596 0 0 5.596 0 12.5c0 8.437 12.5 28.5 12.5 28.5S25 20.937 25 12.5C25 5.596 19.404 0 12.5 0z"/>
                <circle fill="#fff" cx="12.5" cy="12.5" r="5"/>
                <text x="12.5" y="16" text-anchor="middle" font-size="10" fill="#000">${markerIndex + 1}</text>
            </svg>
        `),
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    });

    const requestWsState = () => {
        if (wsClient && wsClient.isOpen()) {
            wsClient.send('blindhike.state.get', {});
            return true;
        }
        return false;
    };

    const buildLoginAction = (teamId) => {
        const meta = teamLoginMeta[String(teamId)] || teamLoginMeta[teamId] || null;
        if (!meta || !meta.url || !meta.token) {
            return '';
        }

        return `<form method="post" action="${meta.url}" target="_blank" rel="noopener noreferrer" style="margin-top:6px;"><input type="hidden" name="_token" value="${meta.token}"><button class="btn btn-ghost btn-small" type="submit">${loginAsLabel}</button></form>`;
    };

    const buildAssetUrl = (path) => {
        if (!path) {
            return '';
        }
        const base = assetBase.endsWith('/') ? assetBase.slice(0, -1) : assetBase;
        const suffix = path.startsWith('/') ? path : `/${path}`;
        return `${base}${suffix}`;
    };

    function poll() {
        fetch(pollUrl)
            .then(res => res.json())
            .then(data => {
                applyOverviewState(data);
            })
            .catch(err => console.error('Poll error:', err));
    }

    function renderTarget(target) {
        // Update target marker
        if (target && target.lat !== null && target.lon !== null) {
            if (!targetMarker) {
                targetMarker = L.marker([target.lat, target.lon], {
                    icon: L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    }),
                    zIndexOffset: 1000
                }).addTo(map).bindPopup('Target Location');
                
                map.setView([target.lat, target.lon], 13);
            } else {
                targetMarker.setLatLng([target.lat, target.lon]);
            }
        }
    }

    function renderTeamState(team, index) {
        const color = ensureTeamColor(team.id, index);
        teamStatesById.set(team.id, team);

        if (!teamOrder.includes(team.id)) {
            teamOrder.push(team.id);
        }
            
        const teamLogoIcon = createTeamLogoIcon(team.logoPath);

        // Update current position marker
        if (team.latitude !== null && team.longitude !== null) {
            if (!teamMarkers.has(team.id)) {
                const markerOptions = teamLogoIcon ? { icon: teamLogoIcon } : undefined;
                const marker = L.marker([team.latitude, team.longitude], markerOptions).addTo(map);
                
                marker.bindPopup(`<strong>${escapeHtml(team.name)}</strong><br>Current Position<br>Markers: ${team.markerCount}`);
                teamMarkers.set(team.id, marker);
            } else {
                teamMarkers.get(team.id).setLatLng([team.latitude, team.longitude]);
                if (teamLogoIcon) {
                    teamMarkers.get(team.id).setIcon(teamLogoIcon);
                }
                teamMarkers.get(team.id).setPopupContent(`<strong>${escapeHtml(team.name)}</strong><br>Current Position<br>Markers: ${team.markerCount}`);
            }
        } else if (teamMarkers.has(team.id)) {
            map.removeLayer(teamMarkers.get(team.id));
            teamMarkers.delete(team.id);
        }

        if (!markersByTeam.has(team.id)) {
            markersByTeam.set(team.id, []);
        }

        const existingMarkers = markersByTeam.get(team.id);
        
        // Remove old markers
        existingMarkers.forEach(m => map.removeLayer(m));
        existingMarkers.length = 0;

        // Add new markers
        (team.markers || []).forEach((markerData, markerIndex) => {
            const marker = L.marker([markerData.lat, markerData.lon], {
                icon: buildTeamMarkerIcon(color, markerIndex),
                zIndexOffset: 1000
            }).addTo(map);
            
            marker.bindPopup(`<strong>${escapeHtml(team.name)}</strong><br>Marker #${markerIndex + 1}<br>${new Date(markerData.placedAt).toLocaleString()}`);
            existingMarkers.push(marker);
        });
    }

    function applyOverviewState(data) {
        renderTarget(data.target || null);

        const teams = Array.isArray(data.teams) ? data.teams : [];
        teamStatesById.clear();
        teamOrder.length = 0;

        teams.forEach((team, index) => {
            renderTeamState(team, index);
        });

        updateTeamList();
    }

    function addMarkerFromEvent(eventPayload) {
        const teamId = eventPayload?.teamId;
        if (!teamId) {
            return;
        }

        const team = teamStatesById.get(teamId);
        if (!team) {
            requestWsState();
            return;
        }

        if (!Array.isArray(team.markers)) {
            team.markers = [];
        }

        const markerData = {
            id: eventPayload.markerId,
            lat: Number(eventPayload.latitude),
            lon: Number(eventPayload.longitude),
            placedAt: eventPayload.placedAt || new Date().toISOString(),
        };

        team.markers.push(markerData);
        team.markerCount = team.markers.length;

        const color = ensureTeamColor(team.id, teamOrder.indexOf(team.id));
        const markerIndex = team.markers.length - 1;
        const marker = L.marker([markerData.lat, markerData.lon], {
            icon: buildTeamMarkerIcon(color, markerIndex),
            zIndexOffset: 1000,
        }).addTo(map);

        marker.bindPopup(`<strong>${escapeHtml(team.name)}</strong><br>Marker #${markerIndex + 1}<br>${new Date(markerData.placedAt).toLocaleString()}`);

        if (!markersByTeam.has(team.id)) {
            markersByTeam.set(team.id, []);
        }
        markersByTeam.get(team.id).push(marker);

        if (teamMarkers.has(team.id)) {
            teamMarkers.get(team.id).setPopupContent(`<strong>${escapeHtml(team.name)}</strong><br>Current Position<br>Markers: ${team.markerCount}`);
        }

        updateTeamList();
    }

    function updateTeamLocationFromEvent(eventPayload) {
        const teamId = String(eventPayload?.teamId || '');
        const latitude = Number(eventPayload?.location?.latitude);
        const longitude = Number(eventPayload?.location?.longitude);

        if (!teamId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return;
        }

        const team = teamStatesById.get(teamId);
        if (!team) {
            requestWsState();
            return;
        }

        team.latitude = latitude;
        team.longitude = longitude;
        team.updatedAt = new Date().toISOString();

        const teamLogoIcon = createTeamLogoIcon(team.logoPath);

        if (!teamMarkers.has(team.id)) {
            const markerOptions = teamLogoIcon ? { icon: teamLogoIcon } : undefined;
            const marker = L.marker([latitude, longitude], markerOptions).addTo(map);
            marker.bindPopup(`<strong>${escapeHtml(team.name)}</strong><br>Current Position<br>Markers: ${team.markerCount}`);
            teamMarkers.set(team.id, marker);
        } else {
            const marker = teamMarkers.get(team.id);
            marker.setLatLng([latitude, longitude]);
            if (teamLogoIcon) {
                marker.setIcon(teamLogoIcon);
            }
            marker.setPopupContent(`<strong>${escapeHtml(team.name)}</strong><br>Current Position<br>Markers: ${team.markerCount}`);
        }

        updateTeamList();
    }

    function updateTeamList() {
        const teamList = document.getElementById('team-list');
        const teams = teamOrder.map((id) => teamStatesById.get(id)).filter(Boolean);
        
        if (teams.length === 0) {
            teamList.innerHTML = '<p class="no-data">No teams yet</p>';
            return;
        }

        const html = teams.map((team, index) => {
            const color = ensureTeamColor(team.id, index);
            return `
                <article class="team-card">
                    <div class="team-card-header">
                        <div class="team-identity">
                            ${team.logoPath ? `<img class="team-logo" src="${buildAssetUrl(team.logoPath)}" alt="${escapeHtml(team.name)}">` : ''}
                            <div>
                                <h2>${escapeHtml(team.name)}</h2>
                                <p class="team-code"></p>
                            </div>
                        </div>
                        <div class="team-lives">
                            <span class="team-lives-value">${team.markerCount}</span>
                            <span class="team-lives-label">markers</span>
                        </div>
                    </div>
                    <div class="team-section" style="border-left:4px solid ${color};padding-left:0.8rem;">
                        <h3>Last update</h3>
                        <p class="muted">${team.updatedAt ? `Updated: ${new Date(team.updatedAt).toLocaleTimeString()}` : '-'}</p>
                    </div>
                    <div class="team-card-actions">${buildLoginAction(team.id)}</div>
                </article>
            `;
        }).join('');
        
        teamList.innerHTML = `<section class="overview-grid">${html}</section>`;
    }

    const wsGameId = root.dataset.wsGameId || '';
    const wsAdminToken = root.dataset.wsAdminToken || '';
    if (window.JotiWs && wsGameId && wsAdminToken) {
        wsClient = window.JotiWs.connect({
            role: 'admin',
            gameId: wsGameId,
            adminToken: wsAdminToken,
            reconnectMs: 3000,
        });

        wsClient.onOpen(() => {
            requestWsState();
        });

        wsClient.onEvent((event) => {
            if (event.command === 'blindhike.marker.added') {
                addMarkerFromEvent(event.payload || {});
                return;
            }

            if (event.command === 'team.location.updated') {
                updateTeamLocationFromEvent(event.payload || {});
                return;
            }
        });

        wsClient.onAck((ack) => {
            if (ack.command === 'blindhike.state.get') {
                applyOverviewState(ack.payload || {});
                return;
            }
        });
    }

    if (!wsClient) {
        poll();
    }
});
