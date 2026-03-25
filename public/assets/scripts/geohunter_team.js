document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('geohunter-team');
    const mapNode = document.getElementById('geohunter-team-map');
    if (!root || !mapNode || !window.L) {
        return;
    }

    const dashboardUrl = root.dataset.dashboardUrl || '/team';
    const logoUrl = root.dataset.logoUrl || '';
    let copy = {};

    if (root.dataset.copy) {
        try {
            copy = JSON.parse(root.dataset.copy);
        } catch (error) {
            copy = {};
        }
    }

    const scoreNode = root.querySelector('[data-geo-score]');
    const modeNode = root.querySelector('[data-geo-mode]');
    const statusNode = root.querySelector('[data-geo-status]');
    const leaderboard = window.JotiTeamLeaderboard?.create(
        root.querySelector('[data-team-leaderboard]'),
        { currentTeamId: root.dataset.wsTeamId || '' }
    );

    const modal = document.getElementById('geohunter-poi-modal');
    const modalTitle = document.getElementById('geohunter-poi-title');
    const modalBody = document.getElementById('geohunter-poi-body');
    const modalForm = document.getElementById('geohunter-poi-form');
    const modalResult = document.getElementById('geohunter-poi-result');

    const map = L.map(mapNode).setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const poiMarkers = new Map();
    const poiStateById = new Map();
    let teamMarker = null;
    let locationPushTimer = null;
    let currentPosition = null;
    let wsClient = null;
    let pendingPoiId = null;
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

    const teamIcon = logoUrl
        ? L.icon({
            iconUrl: logoUrl,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            className: 'geo-team-icon',
        })
        : null;

    const showStatus = (text) => {
        if (statusNode) {
            statusNode.textContent = text || '';
        }
    };

    const openModal = () => {
        if (!modal) {
            return;
        }
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
    };

    const closeModal = () => {
        if (!modal) {
            return;
        }
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
    };

    if (modal) {
        modal.addEventListener('click', (event) => {
            const target = event.target;
            if (target instanceof HTMLElement && target.dataset.modalClose !== undefined) {
                closeModal();
            }
        });
    }

    const renderModal = (poi) => {
        if (!modalTitle || !modalBody || !modalForm || !modalResult) {
            return;
        }
        modalTitle.textContent = poi.title || '';
        modalBody.textContent = '';
        modalForm.innerHTML = '';
        modalResult.textContent = '';

        if (poi.type === 'text') {
            modalBody.textContent = poi.content || poi.question || '';
            if (!poi.answered) {
                submitTextPoi(poi);
            }
            openModal();
            return;
        }

        if (poi.question) {
            const question = document.createElement('p');
            question.textContent = poi.question;
            modalBody.appendChild(question);
        }

        const retryRemainingSeconds = Number(poi.retryRemainingSeconds || 0);
        const canSubmit = poi.canSubmit !== false;

        if (poi.answered && !canSubmit) {
            if (poi.correct) {
                modalResult.textContent = copy.already_correct || '';
            } else if (retryRemainingSeconds > 0) {
                modalResult.textContent = (copy.retry_wait_seconds || '').replace('{seconds}', String(retryRemainingSeconds));
            } else {
                modalResult.textContent = copy.already_answered || '';
            }
            openModal();
            return;
        }

        const form = document.createElement('form');
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            submitAnswer(poi, form);
        });

        if (poi.type === 'open_answer') {
            const textarea = document.createElement('textarea');
            textarea.name = 'answer';
            textarea.rows = 3;
            textarea.placeholder = copy.answer_placeholder || '';
            form.appendChild(textarea);
        }

        if (poi.type === 'multiple_choice') {
            (poi.choices || []).forEach((choice) => {
                const label = document.createElement('label');
                label.className = 'geo-choice-check';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = 'choice';
                checkbox.value = choice.id;
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(` ${choice.label || ''}`));
                form.appendChild(label);
            });
        }

        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.className = 'btn btn-primary btn-small';
        submit.textContent = copy.submit || '';
        form.appendChild(submit);

        modalForm.appendChild(form);
        openModal();
    };

    const submitAnswer = async (poi, form) => {
        if (!wsClient || !wsClient.isOpen() || !modalResult) {
            modalResult.textContent = copy.submit_error || '';
            return;
        }

        const answerText = form.querySelector('textarea')?.value || '';
        const choiceIds = Array.from(form.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);

        pendingPoiId = String(poi.id);
        modalResult.textContent = copy.checking_answer || '';
        wsClient.send('geohunter.question.answer', {
            poiId: poi.id,
            answerText,
            choiceIds,
        });
    };

    const submitTextPoi = async (poi) => {
        if (!wsClient || !wsClient.isOpen() || !modalResult) {
            modalResult.textContent = copy.submit_error || '';
            return;
        }

        pendingPoiId = String(poi.id);
        modalResult.textContent = copy.checking_answer || '';
        wsClient.send('geohunter.question.answer', {
            poiId: poi.id,
        });
    };

    const updatePois = (pois) => {
        const seen = new Set();
        pois.forEach((poi) => {
            seen.add(poi.id);
            const latitude = Number(poi.latitude);
            const longitude = Number(poi.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                return;
            }

            poiStateById.set(poi.id, {
                ...poi,
                latitude,
                longitude,
            });

            let marker = poiMarkers.get(poi.id);
            if (!marker) {
                marker = L.marker([latitude, longitude]).addTo(map);
                marker.on('click', () => {
                    const latestPoi = poiStateById.get(poi.id);
                    if (latestPoi) {
                        renderModal(latestPoi);
                    }
                });
                poiMarkers.set(poi.id, marker);
            } else {
                marker.setLatLng([latitude, longitude]);
            }
        });

        poiMarkers.forEach((marker, id) => {
            if (!seen.has(id)) {
                map.removeLayer(marker);
                poiMarkers.delete(id);
                poiStateById.delete(id);
            }
        });
    };

    const renderLeaderboard = (payload) => {
        if (!leaderboard) {
            return;
        }

        leaderboard.render(payload?.leaderboard || [], {
            metricDirection: payload?.leaderboardMetricDirection || 'desc',
        });
    };

    const renderSnapshot = (payload) => {
        if (!ensureActiveGameWindow(payload)) {
            return;
        }

        if (payload.mode && modeNode) {
            modeNode.textContent = payload.mode === 'competitive' ? (copy.mode_competitive || '') : (copy.mode_explore || '');
        }
        if (typeof payload.score === 'number' && scoreNode) {
            scoreNode.textContent = `${payload.score}`;
        }
        renderLeaderboard(payload);
        if (payload.pois) {
            updatePois(payload.pois);
        }
    };

    const requestSnapshot = () => {
        if (!wsClient || !wsClient.isOpen()) {
            return;
        }

        if (typeof wsClient.isAuthenticated === 'function' && !wsClient.isAuthenticated()) {
            return;
        }

        wsClient.send('geohunter.team.bootstrap', {});
    };

    const pushLocation = () => {
        if (!currentPosition || !wsClient || !wsClient.isOpen()) {
            return;
        }

        wsClient.send('team.location.update', {
            latitude: currentPosition.latitude,
            longitude: currentPosition.longitude,
            requestNearby: true,
        });
    };

    if (!navigator.geolocation) {
        showStatus(copy.location_unsupported || '');
        return;
    }

    navigator.geolocation.watchPosition(
        (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            currentPosition = { latitude, longitude };
            showStatus('');

            if (!teamMarker) {
                teamMarker = L.marker([latitude, longitude], teamIcon ? { icon: teamIcon } : undefined).addTo(map);
                map.setView([latitude, longitude], 16);
            } else {
                teamMarker.setLatLng([latitude, longitude]);
            }
        },
        () => {
            showStatus(copy.location_required || '');
        },
        {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000,
        }
    );

    let snapshotTimer = null;

    const wsTeamId = root.dataset.wsTeamId || '';
    const wsTeamCode = root.dataset.wsTeamCode || '';
    if (window.JotiWs && wsTeamId && wsTeamCode) {
        wsClient = window.JotiWs.connect({
            role: 'team',
            teamId: wsTeamId,
            teamCode: wsTeamCode,
            reconnectMs: 3000,
        });

        wsClient.onOpen(() => {
            if (snapshotTimer) {
                window.clearInterval(snapshotTimer);
            }
            snapshotTimer = window.setInterval(requestSnapshot, 10000);
            pushLocation();

            if (locationPushTimer) {
                window.clearInterval(locationPushTimer);
            }
            locationPushTimer = window.setInterval(pushLocation, 10000);

            requestSnapshot();
        });

        wsClient.onAuthenticated(() => {
            requestSnapshot();
        });

        wsClient.onClose(() => {
            if (snapshotTimer) {
                window.clearInterval(snapshotTimer);
                snapshotTimer = null;
            }

            if (locationPushTimer) {
                window.clearInterval(locationPushTimer);
                locationPushTimer = null;
            }
        });

        wsClient.onEvent((event) => {
            if (event.command === 'admin.message.team') {
                window.JotiTeamMessageModal?.show?.(event.payload?.message);
                return;
            }

            requestSnapshot();
        });

        wsClient.onAck((ack) => {
            if (ack.command === 'geohunter.question.answer') {
                const payload = ack.payload || {};

                if (modalResult && pendingPoiId && String(payload.poiId || '') === pendingPoiId) {
                    if (payload.alreadyAnswered) {
                        modalResult.textContent = payload.correct
                            ? (copy.already_correct || '')
                            : (copy.already_answered || '');
                    } else if (payload.correct) {
                        modalResult.textContent = payload.pointsAwarded
                            ? (copy.correct_point || '')
                            : (copy.correct || '');
                    } else {
                        modalResult.textContent = copy.incorrect || '';
                    }
                }

                if (typeof payload.score === 'number' && scoreNode) {
                    scoreNode.textContent = `${payload.score}`;
                }

                pendingPoiId = null;
                pushLocation();
                return;
            }

            if (ack.command === 'team.location.update') {
                if (Array.isArray(ack.payload?.nearby)) {
                    updatePois(ack.payload.nearby);
                }
                return;
            }

            if (ack.command === 'geohunter.team.bootstrap') {
                renderSnapshot(ack.payload || {});
                return;
            }

            requestSnapshot();
        });

        wsClient.onError((error) => {
            const code = String(error?.code || '');
            if (!modalResult) {
                return;
            }

            if (code === 'retry_timeout_active') {
                const remainingSeconds = Number(error?.details?.remainingSeconds || 0);
                modalResult.textContent = remainingSeconds > 0
                    ? (copy.retry_wait_seconds || '').replace('{seconds}', String(remainingSeconds))
                    : (copy.retry_wait || '');
                pendingPoiId = null;
                return;
            }

            if (code === 'out_of_range') {
                modalResult.textContent = copy.out_of_range || '';
                pendingPoiId = null;
                return;
            }

            if (code === 'invalid_poi') {
                modalResult.textContent = copy.invalid_poi || '';
                pendingPoiId = null;
                return;
            }

            if (code === 'missing_location') {
                modalResult.textContent = copy.location_required || '';
                pendingPoiId = null;
                return;
            }

            if (code === 'game_frozen') {
                ensureActiveGameWindow({ gameWindow: error?.details?.gameWindow, gameActive: false });
                return;
            }

            if (pendingPoiId) {
                modalResult.textContent = copy.submit_error || '';
                pendingPoiId = null;
            }
        });
    }
});
