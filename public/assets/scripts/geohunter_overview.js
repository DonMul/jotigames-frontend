document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('geohunter-overview');
    const mapNode = document.getElementById('geohunter-overview-map');
    const teamsNode = document.getElementById('geohunter-overview-teams');
    if (!root || !mapNode || !teamsNode || !window.L) {
        return;
    }

    const pollUrl = root.dataset.pollUrl;
    const assetBase = root.dataset.assetBase || '';
    let copy = {};
    try {
        copy = JSON.parse(root.dataset.copy || '{}');
    } catch {
        copy = {};
    }
    let teamLoginMeta = {};
    try {
        teamLoginMeta = JSON.parse(root.dataset.teamLoginMeta || '{}');
    } catch {
        teamLoginMeta = {};
    }
    const loginAsLabel = root.dataset.loginAsLabel || 'Login as team';
    const map = L.map(mapNode).setView([0, 0], 2);

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

    const markers = new Map();
    const teamsById = new Map();

    const normalizeTeam = (team) => {
        const id = String(team?.id || '');
        const latitudeRaw = team?.latitude;
        const longitudeRaw = team?.longitude;
        const latitude = latitudeRaw === null || latitudeRaw === undefined || latitudeRaw === ''
            ? null
            : Number(latitudeRaw);
        const longitude = longitudeRaw === null || longitudeRaw === undefined || longitudeRaw === ''
            ? null
            : Number(longitudeRaw);

        return {
            ...team,
            id,
            latitude: Number.isFinite(latitude) ? latitude : null,
            longitude: Number.isFinite(longitude) ? longitude : null,
            score: Number(team?.score || 0),
        };
    };

    const buildAssetUrl = (path) => {
        if (!path) {
            return '';
        }
        const base = assetBase.endsWith('/') ? assetBase.slice(0, -1) : assetBase;
        const suffix = path.startsWith('/') ? path : `/${path}`;
        return `${base}${suffix}`;
    };

    const buildLoginAsForm = (teamId) => {
        const meta = teamLoginMeta[String(teamId)] || teamLoginMeta[teamId] || null;
        if (!meta || !meta.url || !meta.token) {
            return '';
        }

        return `
            <form method="post" action="${meta.url}" target="_blank" rel="noopener noreferrer">
                <input type="hidden" name="_token" value="${meta.token}">
                <button class="btn btn-ghost btn-small" type="submit">${loginAsLabel}</button>
            </form>
        `;
    };

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

    const buildIcon = (logoPath) => {
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

    const updateMarkers = (teams) => {
        const normalizedTeams = (teams || []).map(normalizeTeam);
        const seen = new Set();
        normalizedTeams.forEach((team) => {
            const id = team.id;
            seen.add(id);
            teamsById.set(id, team);

            if (!Number.isFinite(team.latitude) || !Number.isFinite(team.longitude)) {
                const existing = markers.get(id);
                if (existing) {
                    map.removeLayer(existing);
                    markers.delete(id);
                }
                return;
            }

            let marker = markers.get(id);
            const icon = buildIcon(team.logoPath);
            if (!marker) {
                marker = L.marker([team.latitude, team.longitude], icon ? { icon } : undefined).addTo(map);
                markers.set(id, marker);
            } else {
                marker.setLatLng([team.latitude, team.longitude]);
                if (icon) {
                    marker.setIcon(icon);
                }
            }

            const title = team.name || (copy.team_label || '');
            const score = Number.isFinite(team.score) ? ` · ${team.score}` : '';
            marker.bindPopup(`${title}${score}`);
        });

        markers.forEach((marker, id) => {
            if (!seen.has(id)) {
                map.removeLayer(marker);
                markers.delete(id);
            }
        });

        renderTeamScores();
    };

    const renderTeamScores = () => {
        const teams = Array.from(teamsById.values())
            .sort((left, right) => Number(right.score || 0) - Number(left.score || 0));

        if (teams.length === 0) {
            teamsNode.innerHTML = `<p class="muted">${copy.no_teams || ''}</p>`;
            return;
        }

        teamsNode.innerHTML = teams
            .map((team, index) => `
                <article class="team-card">
                    <div class="team-card-header">
                        <div class="team-identity">
                            ${team.logoPath ? `<img class="team-logo" src="${buildAssetUrl(team.logoPath)}" alt="${escapeHtml(team.name || '')}">` : ''}
                            <div>
                                <h2>${index + 1}. ${escapeHtml(team.name || (copy.team_label || ''))}</h2>
                                <p class="team-code">${escapeHtml(team.code || '')}</p>
                            </div>
                        </div>
                        <div class="team-lives">
                            <span class="team-lives-value">${Number(team.score || 0)}</span>
                            <span class="team-lives-label">${escapeHtml(copy.points_suffix || '')}</span>
                        </div>
                    </div>
                    <div class="team-section"></div>
                    <div class="team-card-actions">${buildLoginAsForm(team.id)}</div>
                </article>
            `)
            .join('');
    };

    const updateMarkerFromLocationEvent = (payload) => {
        const teamId = String(payload?.teamId || '');
        const latitude = Number(payload?.location?.latitude);
        const longitude = Number(payload?.location?.longitude);

        if (!teamId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return;
        }

        const team = teamsById.get(teamId);
        if (!team) {
            poll();
            return;
        }

        team.latitude = latitude;
        team.longitude = longitude;

        let marker = markers.get(teamId);
        const icon = buildIcon(team.logoPath);
        if (!marker) {
            marker = L.marker([latitude, longitude], icon ? { icon } : undefined).addTo(map);
            markers.set(teamId, marker);
        } else {
            marker.setLatLng([latitude, longitude]);
            if (icon) {
                marker.setIcon(icon);
            }
        }

        const title = team.name || (copy.team_label || '');
        const score = typeof team.score === 'number' ? ` · ${team.score}` : '';
        marker.bindPopup(`${title}${score}`);
        renderTeamScores();
    };

    const updateScoreFromAnswerEvent = (payload) => {
        const teamId = String(payload?.teamId || '');
        if (!teamId) {
            return;
        }

        const team = teamsById.get(teamId);
        if (!team) {
            poll();
            return;
        }

        const payloadScore = Number(payload.score);
        const payloadPointsAwarded = Number(payload.pointsAwarded);
        if (Number.isFinite(payloadScore)) {
            team.score = payloadScore;
        } else if (Number.isFinite(payloadPointsAwarded)) {
            team.score = Number(team.score || 0) + Number(payload.pointsAwarded);
        }

        const marker = markers.get(teamId);
        if (marker) {
            const title = team.name || (copy.team_label || '');
            const score = typeof team.score === 'number' ? ` · ${team.score}` : '';
            marker.bindPopup(`${title}${score}`);
        }

        renderTeamScores();
    };

    const poll = async () => {
        if (!pollUrl) {
            return;
        }
        try {
            const response = await fetch(pollUrl, {
                headers: { 'Accept': 'application/json' },
            });
            if (!response.ok) {
                return;
            }
            const payload = await response.json();
            if (payload.teams) {
                updateMarkers(payload.teams);
            }
        } catch (error) {
            // Ignore polling errors.
        }
    };

    const wsGameId = root.dataset.wsGameId || '';
    const wsAdminToken = root.dataset.wsAdminToken || '';
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
            if (event.command === 'team.location.updated') {
                updateMarkerFromLocationEvent(event.payload || {});
                return;
            }

            if (event.command === 'geohunter.question.answered') {
                updateScoreFromAnswerEvent(event.payload || {});
                return;
            }
        });
    }

    poll();
});
