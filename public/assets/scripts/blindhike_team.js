// Blind Hike Team Map - Black map with only target and placed markers visible
document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('blindhike-team-root');
    if (!root) {
        return;
    }

    const dashboardUrl = root.dataset.dashboardUrl || '/team';
    const wsTeamId = root.dataset.wsTeamId || '';
    const wsTeamCode = root.dataset.wsTeamCode || '';
    const copy = (() => {
        try {
            return JSON.parse(root.dataset.copy || '{}');
        } catch (_) {
            return {};
        }
    })();
    const leaderboard = window.JotiTeamLeaderboard?.create(
        root.querySelector('[data-team-leaderboard]'),
        { currentTeamId: root.dataset.wsTeamId || '' }
    );

    let currentPosition = null;
    let watchId = null;
    let cooldownInterval = null;
    let locationPushInterval = null;
    let wsClient = null;
    let redirectedToDashboard = false;

    const ensureActiveGameWindow = (payload) => {
        const status = String(payload?.gameWindow?.status || '').toLowerCase();
        const active = status === '' ? payload?.gameActive !== false : status === 'active';
        if (active || redirectedToDashboard) {
            return true;
        }

        redirectedToDashboard = true;
        window.location.assign(dashboardUrl);
        return false;
    };

    // Initialize map with completely black tiles
    const map = L.map('blindhike-team-map', {
        center: [0, 0],
        zoom: 15,
        zoomControl: true,
        minZoom: 10,
        maxZoom: 19
    });

    // Create a black tile layer (no actual map visible)
    const BlackTileLayer = L.TileLayer.extend({
        createTile: function(coords) {
            const tile = document.createElement('canvas');
            const ctx = tile.getContext('2d');
            const size = this.getTileSize();
            tile.width = size.x;
            tile.height = size.y;
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, size.x, size.y);
            return tile;
        }
    });

    new BlackTileLayer().addTo(map);

    // Store markers
    let targetMarker = null;
    const placedMarkers = [];

    function setTargetMarker(target) {
        if (!target || target.lat === null || target.lon === null) {
            return;
        }

        const targetLatLng = [target.lat, target.lon];

        if (!targetMarker) {
            targetMarker = L.marker(targetLatLng, {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                }),
                zIndexOffset: 1000
            }).addTo(map).bindPopup('🎯 Target Location');

            // Center map on target
            map.setView(targetLatLng, 15);
        } else {
            targetMarker.setLatLng(targetLatLng);
        }
    }

    // Start tracking location
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                currentPosition = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
            },
            (error) => {
                console.error('Geolocation error:', error);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000
            }
        );
    }

    const placeMarkerButton = document.getElementById('place-marker-btn');

    const requestWsState = () => {
        if (wsClient && wsClient.isOpen()) {
            wsClient.send('blindhike.state.get', {});
            return true;
        }
        return false;
    };

    const pushTeamLocation = () => {
        if (!wsClient || !wsClient.isOpen() || !currentPosition) {
            return;
        }

        wsClient.send('team.location.update', {
            latitude: currentPosition.latitude,
            longitude: currentPosition.longitude,
        });
    };

    const notify = (message) => {
        if (!message) {
            return;
        }

        if (window.JotiTeamMessageModal?.show) {
            window.JotiTeamMessageModal.show(message);
            return;
        }

        alert(message);
    };

    // Place marker button
    placeMarkerButton.addEventListener('click', () => {
        if (!currentPosition) {
              notify(copy.waiting_for_location || 'Waiting for location...');
            return;
        }

        if (!wsClient || !wsClient.isOpen()) {
              notify(copy.realtime_offline || 'Realtime connection is offline. Please wait for reconnect.');
            return;
        }

        const sent = wsClient.send('blindhike.marker.add', {
            latitude: currentPosition.latitude,
            longitude: currentPosition.longitude,
        });

        if (!sent) {
              notify(copy.marker_send_failed || 'Could not send marker via realtime connection.');
        }
    });

    function applyWsState(state) {
        if (!ensureActiveGameWindow(state)) {
            return;
        }

        leaderboard?.render(state.leaderboard || [], {
            metricDirection: state.leaderboardMetricDirection || 'asc',
        });

        if (state.target) {
            setTargetMarker(state.target);
        }

        updateMap({
            markers: Array.isArray(state.markers) ? state.markers : [],
        });

        updateUI({
            markers: Array.isArray(state.markers) ? state.markers : [],
            config: state.config || {
                markerCount: 0,
                canPlaceMarker: true,
                maxMarkers: null,
                cooldownRemaining: 0,
            },
        });
    }

    function updateMap(data) {
        // Update placed markers
        // Remove all existing markers
        placedMarkers.forEach(m => map.removeLayer(m));
        placedMarkers.length = 0;

        // Add markers from data
        data.markers.forEach((markerData, index) => {
            const marker = L.marker([markerData.lat, markerData.lon], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                }),
                zIndexOffset: 1000
            }).addTo(map);
            
            marker.bindPopup(`Marker #${index + 1}<br>${new Date(markerData.placedAt).toLocaleString()}`);
            placedMarkers.push(marker);
        });
    }

    function updateUI(data) {
        const config = data.config;
        
        // Update marker count
        document.getElementById('marker-count').textContent = config.markerCount;
        
        // Update place marker button state
        const placeBtn = document.getElementById('place-marker-btn');
        const cooldownInfo = document.getElementById('cooldown-info');
        const limitInfo = document.getElementById('marker-limit-info');
        
        if (!config.canPlaceMarker) {
            placeBtn.disabled = true;
            
            if (config.maxMarkers && config.markerCount >= config.maxMarkers) {
                // Marker limit reached
                limitInfo.classList.remove('is-hidden');
                cooldownInfo.classList.add('is-hidden');
            } else if (config.cooldownRemaining > 0) {
                // Cooldown active
                limitInfo.classList.add('is-hidden');
                cooldownInfo.classList.remove('is-hidden');
                startCooldownTimer(config.cooldownRemaining);
            }
        } else {
            placeBtn.disabled = false;
            cooldownInfo.classList.add('is-hidden');
            limitInfo.classList.add('is-hidden');
            
            if (cooldownInterval) {
                clearInterval(cooldownInterval);
                cooldownInterval = null;
            }
        }

        // Update marker list
        const markerList = document.getElementById('marker-list');
        if (data.markers.length === 0) {
            markerList.innerHTML = '<p class="no-data">No markers placed yet</p>';
        } else {
            const html = data.markers.map((marker, index) => `
                <div class="marker-item">
                    <span class="marker-number">#${index + 1}</span>
                    <span class="marker-time">${new Date(marker.placedAt).toLocaleTimeString()}</span>
                </div>
            `).join('');
            markerList.innerHTML = html;
        }
    }

    function startCooldownTimer(seconds) {
        if (cooldownInterval) {
            clearInterval(cooldownInterval);
        }

        let remaining = seconds;
        const secondsSpan = document.getElementById('cooldown-seconds');
        const progressBar = document.getElementById('cooldown-progress');
        const totalSeconds = seconds;

        const updateCooldown = () => {
            secondsSpan.textContent = remaining;
            progressBar.style.width = ((totalSeconds - remaining) / totalSeconds * 100) + '%';
            
            remaining--;
            
            if (remaining < 0) {
                clearInterval(cooldownInterval);
                cooldownInterval = null;
                requestWsState();
            }
        };

        updateCooldown();
        cooldownInterval = setInterval(updateCooldown, 1000);
    }

    let stateTimer = null;

    if (window.JotiWs && wsTeamId && wsTeamCode) {
        wsClient = window.JotiWs.connect({
            role: 'team',
            teamId: wsTeamId,
            teamCode: wsTeamCode,
            reconnectMs: 3000,
        });

        wsClient.onOpen(() => {
            if (stateTimer) {
                window.clearInterval(stateTimer);
            }
            stateTimer = window.setInterval(requestWsState, 10000);
            requestWsState();
            pushTeamLocation();

            if (locationPushInterval) {
                window.clearInterval(locationPushInterval);
            }
            locationPushInterval = window.setInterval(pushTeamLocation, 10000);
        });

        wsClient.onClose(() => {
            if (stateTimer) {
                window.clearInterval(stateTimer);
                stateTimer = null;
            }

            if (locationPushInterval) {
                window.clearInterval(locationPushInterval);
                locationPushInterval = null;
            }
        });

        wsClient.onEvent((event) => {
            if (event.command === 'blindhike.marker.added') {
                requestWsState();
                return;
            }

            if (event.command === 'admin.message.team') {
                window.JotiTeamMessageModal?.show?.(event.payload?.message);
                return;
            }

            requestWsState();
        });

        wsClient.onAck((ack) => {
            if (ack.command === 'blindhike.state.get') {
                applyWsState(ack.payload || {});
                return;
            }

            if (ack.command === 'blindhike.marker.add') {
                requestWsState();
            }
        });

        wsClient.onError((error) => {
            const code = String(error?.code || '');
            if (code === 'marker_limit_reached') {
                notify(copy.marker_limit_reached || '');
                return;
            }

            if (code === 'cooldown_active') {
                const availableAt = error?.details?.availableAt;
                if (availableAt) {
                    const remaining = Math.max(0, Math.ceil((new Date(availableAt).getTime() - Date.now()) / 1000));
                    notify((copy.cooldown_wait_seconds || '').replace('%seconds%', String(remaining)));
                } else {
                    notify(copy.cooldown_wait || '');
                }
                return;
            }

            if (code === 'game_frozen') {
                ensureActiveGameWindow({ gameWindow: error?.details?.gameWindow, gameActive: false });
            }
        });
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
        }
        if (cooldownInterval) {
            clearInterval(cooldownInterval);
        }
        if (locationPushInterval) {
            clearInterval(locationPushInterval);
        }
    });
});
