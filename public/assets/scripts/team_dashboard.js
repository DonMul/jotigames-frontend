document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('team-dashboard');
    if (!root) {
        return;
    }

    const pollUrl = root.dataset.pollUrl;
    if (!pollUrl) {
        return;
    }
    const wsTeamId = root.dataset.wsTeamId || '';
    const wsTeamCode = root.dataset.wsTeamCode || '';
    const gameType = String(root.dataset.gameType || '').toLowerCase();
    const isExplodingKittensDashboard = gameType === 'exploding_kittens';

    const statsNode = document.getElementById('team-stats');
    const actionsNode = document.getElementById('team-actions');
    const statesNode = document.getElementById('team-active-states');
    const handNode = document.getElementById('team-hand');
    const leaderboardNode = document.getElementById('team-lives-leaderboard');
    const gameWindowNode = document.getElementById('team-game-window');
    const modal = document.getElementById('team-event-modal');
    const modalTitle = document.getElementById('team-event-title');
    const modalBody = document.getElementById('team-event-body');
    const modalKicker = document.getElementById('team-event-kicker');
    const assetBase = root.dataset.assetBase || '';
    let copy = {};
    let teamLogoMap = {};

    if (root.dataset.copy) {
        try {
            copy = JSON.parse(root.dataset.copy);
        } catch (error) {
            copy = {};
        }
    }

    if (root.dataset.teamLogoMap) {
        try {
            teamLogoMap = JSON.parse(root.dataset.teamLogoMap);
        } catch (error) {
            teamLogoMap = {};
        }
    }

    const queue = [];
    const recentPopupKeys = new Map();
    const POPUP_DEDUPE_WINDOW_MS = 4000;
    let modalOpen = false;
    let redirectedToGame = false;
    let latestRealtimeActions = [];
    let latestLeaderboardRows = [];
    let actionCountdownTimerId = null;
    let lastLivesUpdatedAtMs = 0;
    let hasRealtimeLivesValue = false;

    const parseUpdatedAtMs = (value) => {
        const ms = Date.parse(String(value || '').trim());
        return Number.isFinite(ms) ? ms : 0;
    };
    const leaderboard = window.JotiTeamLeaderboard?.create(
        leaderboardNode?.querySelector('[data-team-leaderboard]') || null,
        { currentTeamId: wsTeamId, assetBase }
    );
    const comboForm = handNode?.querySelector('[data-combo-form]') || null;
    const comboToggleButton = handNode?.querySelector('[data-combo-toggle]') || null;
    const comboTargetSelect = handNode?.querySelector('[data-combo-target]') || null;
    const comboRequestedTypeSelect = handNode?.querySelector('[data-combo-requested-type]') || null;
    const comboTargetRow = handNode?.querySelector('[data-combo-target-row]') || null;
    const comboTypeRow = handNode?.querySelector('[data-combo-type-row]') || null;
    const comboSubmitButton = handNode?.querySelector('[data-combo-submit]') || null;
    const comboSelectedInfo = handNode?.querySelector('[data-combo-selected-info]') || null;
    let comboModeEnabled = false;

    const getComboSelection = () => {
        const checkboxes = handNode?.querySelectorAll('input[data-combo-select="1"]') || [];
        const selected = Array.from(checkboxes).filter((checkbox) => checkbox.checked);
        const selectedTypes = selected.map((checkbox) => String(checkbox.dataset.cardType || ''));
        const uniqueTypes = new Set(selectedTypes);
        const count = selected.length;

        let mode = 'invalid';
        if (count === 2 && uniqueTypes.size === 1) {
            mode = 'two';
        } else if (count === 3 && uniqueTypes.size === 1) {
            mode = 'three';
        } else if (count === 5 && uniqueTypes.size === 5) {
            mode = 'five';
        }

        return {
            mode,
            isValid: mode !== 'invalid',
            selected,
        };
    };

    const syncComboSelectedCards = () => {
        if (!handNode) {
            return;
        }

        const cards = handNode.querySelectorAll('.hand-card');
        cards.forEach((card) => {
            if (!(card instanceof HTMLElement)) {
                return;
            }

            const checkbox = card.querySelector('input[data-combo-select="1"]');
            card.classList.toggle('is-combo-selected', checkbox instanceof HTMLInputElement && checkbox.checked);
        });
    };

    const updateComboSelectedInfo = () => {
        if (!comboSelectedInfo) {
            return;
        }

        const selection = getComboSelection();
        if (!comboModeEnabled || !selection.isValid) {
            comboSelectedInfo.textContent = copy.comboSelectedNone || '';
            return;
        }

        if (selection.mode === 'two') {
            comboSelectedInfo.textContent = copy.comboSelectedTwo || '';
            return;
        }

        if (selection.mode === 'three') {
            comboSelectedInfo.textContent = copy.comboSelectedThree || '';
            return;
        }

        if (selection.mode === 'five') {
            comboSelectedInfo.textContent = copy.comboSelectedFive || '';
            return;
        }

        comboSelectedInfo.textContent = copy.comboSelectedNone || '';
    };

    const updateComboToggleButton = () => {
        if (!(comboToggleButton instanceof HTMLButtonElement)) {
            return;
        }

        const playComboText = copy.playCombo || 'Play combo';
        if (comboModeEnabled) {
            const cancelText = copy.cancel || 'Cancel';
            comboToggleButton.textContent = `${cancelText} ${playComboText}`;
            comboToggleButton.classList.remove('btn-add');
            comboToggleButton.classList.add('btn-remove');
            return;
        }

        comboToggleButton.textContent = playComboText;
        comboToggleButton.classList.remove('btn-remove');
        comboToggleButton.classList.add('btn-add');
    };

    const renderGameWindow = (gameWindow) => {
        if (!gameWindowNode) {
            return;
        }

        const status = String(gameWindow?.status || '').toLowerCase();
        const isActive = status === 'active';
        gameWindowNode.hidden = isActive;

        if (isActive) {
            return;
        }

        const titleNode = gameWindowNode.querySelector('[data-window-title]');
        const bodyNode = gameWindowNode.querySelector('[data-window-body]');
        const timeNode = gameWindowNode.querySelector('[data-window-time]');
        if (!titleNode || !bodyNode || !timeNode) {
            return;
        }

        const startAtDisplay = String(gameWindow?.startAtDisplay || '').trim();
        const endAtDisplay = String(gameWindow?.endAtDisplay || '').trim();
        const startAt = gameWindow?.startAt ? new Date(gameWindow.startAt) : null;
        const endAt = gameWindow?.endAt ? new Date(gameWindow.endAt) : null;

        if (status === 'not_started') {
            titleNode.textContent = copy.gameWaitingTitle || '';
            bodyNode.textContent = copy.gameWaitingBody || '';
            timeNode.textContent = startAtDisplay !== ''
                ? `${copy.gameStartsAt || ''}: ${startAtDisplay}`
                : (startAt && !Number.isNaN(startAt.getTime())
                    ? `${copy.gameStartsAt || ''}: ${startAt.toLocaleString()}`
                    : '');
            return;
        }

        titleNode.textContent = copy.gameClosedTitle || '';
        bodyNode.textContent = copy.gameClosedBody || '';
        timeNode.textContent = endAtDisplay !== ''
            ? `${copy.gameEndedAt || ''}: ${endAtDisplay}`
            : (endAt && !Number.isNaN(endAt.getTime())
                ? `${copy.gameEndedAt || ''}: ${endAt.toLocaleString()}`
                : '');
    };

    const updateExplodingKittensPanelsVisibility = (payload) => {
        const gameType = String(payload?.stats?.gameType || '').toLowerCase();
        const isActive = payload?.gameWindow?.isActive === true
            || payload?.gameWindow?.status === 'active'
            || payload?.gameActive === true;
        const shouldShow = gameType === 'exploding_kittens' && isActive;

        if (actionsNode) {
            actionsNode.hidden = !shouldShow;
        }
        if (statesNode) {
            statesNode.hidden = !shouldShow;
        }
        if (handNode) {
            handNode.hidden = !shouldShow;
        }
        if (leaderboardNode) {
            leaderboardNode.hidden = !shouldShow;
        }

        syncActionsPendingClass();

        return shouldShow;
    };

    const renderLeaderboard = (rows) => {
        const normalizedRows = (rows || []).map((row) => {
            const teamId = String(row?.id || '');
            return {
                ...row,
                logoPath: row?.logoPath || teamLogoMap[teamId] || '',
            };
        });

        latestLeaderboardRows = normalizedRows;

        leaderboard?.render(normalizedRows, {
            metricDirection: 'desc',
        });
    };

    const applyTeamIdentityUpdate = (team) => {
        if (!team || typeof team !== 'object') {
            return;
        }

        const teamId = String(team.id || '').trim();
        if (!teamId) {
            return;
        }

        const nextName = String(team.name || '').trim();
        const nextLogoPath = String(team.logoPath || '').trim();

        const nextRows = latestLeaderboardRows.slice();
        const index = nextRows.findIndex((row) => String(row?.id || '') === teamId);
        if (index >= 0) {
            const current = nextRows[index] || {};
            nextRows[index] = {
                ...current,
                id: teamId,
                name: nextName !== '' ? nextName : String(current?.name || ''),
                logoPath: nextLogoPath !== '' ? nextLogoPath : String(current?.logoPath || ''),
                lives: Number(current?.lives || 0),
            };
        } else if (nextName !== '') {
            nextRows.push({
                id: teamId,
                name: nextName,
                logoPath: nextLogoPath,
                lives: 0,
            });
        }

        if (nextRows.length > 0) {
            renderLeaderboard(nextRows);
        }

        if (teamId !== wsTeamId || !statsNode) {
            return;
        }

        const teamNameNode = statsNode.querySelector('[data-stat="team-name"]');
        if (teamNameNode instanceof HTMLElement && nextName !== '') {
            teamNameNode.textContent = nextName;
        }

        const logoNode = statsNode.querySelector('[data-stat="logo"]');
        if (logoNode instanceof HTMLImageElement) {
            if (nextLogoPath !== '') {
                logoNode.src = buildAssetUrl(nextLogoPath);
                logoNode.alt = nextName;
                logoNode.hidden = false;
            } else {
                logoNode.src = '';
                logoNode.alt = '';
                logoNode.hidden = true;
            }
        }
    };

    const applyRealtimeState = (state) => {
        if (!state || typeof state !== 'object') {
            return;
        }

        const payload = {
            stats: state.stats || null,
            teams: Array.isArray(state.teams) ? state.teams : [],
            hand: Array.isArray(state.hand) ? state.hand : [],
            actions: Array.isArray(state.actions) ? state.actions : [],
            gameWindow: null,
            gameActive: true,
        };

        updateExplodingKittensPanelsVisibility(payload);

        if (payload.stats) {
            renderStats(payload.stats);
        }
        renderActions(payload.actions);
        renderHand(payload.hand, payload.teams);
    };

    const openModal = (event) => {
        if (!modal || !modalTitle || !modalBody || !modalKicker) {
            return;
        }
        modalTitle.textContent = event.title || '';
        modalBody.textContent = event.body || '';
        modalKicker.textContent = event.kicker || '';
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        modalOpen = true;
    };

    const closeModal = () => {
        if (!modal) {
            return;
        }
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        modalOpen = false;
        showNext();
    };

    const showNext = () => {
        if (modalOpen || queue.length === 0) {
            return;
        }
        const next = queue.shift();
        openModal(next);
    };

    const normalizePopup = (popup) => ({
        title: String(popup?.title || '').trim(),
        body: String(popup?.body || '').trim(),
        kicker: String(popup?.kicker || copy.popupKicker || '').trim(),
    });

    const enqueuePopup = (popup) => {
        const normalized = normalizePopup(popup);
        if (normalized.body === '') {
            return false;
        }

        const now = Date.now();
        recentPopupKeys.forEach((timestamp, key) => {
            if (now - timestamp > POPUP_DEDUPE_WINDOW_MS) {
                recentPopupKeys.delete(key);
            }
        });

        const key = `${normalized.title}\u0000${normalized.body}\u0000${normalized.kicker}`;
        const seenAt = recentPopupKeys.get(key);
        if (typeof seenAt === 'number' && now - seenAt <= POPUP_DEDUPE_WINDOW_MS) {
            return false;
        }

        recentPopupKeys.set(key, now);
        queue.push(normalized);
        showNext();

        return true;
    };

    const buildAssetUrl = (path) => {
        if (!path) {
            return '';
        }
        const base = assetBase.endsWith('/') ? assetBase.slice(0, -1) : assetBase;
        const suffix = path.startsWith('/') ? path : `/${path}`;
        return `${base}${suffix}`;
    };

    const actionSignature = (action) => JSON.stringify({
        text: action.text || '',
        resolveUrl: action.resolveUrl || '',
        csrfToken: action.csrfToken || '',
        canNope: action.canNope === true,
        expiresAt: action.expiresAt || '',
    });

    const normalizeRealtimeAction = (action) => {
        if (!action || typeof action !== 'object') {
            return null;
        }

        const id = String(action.id || '').trim();
        const text = String(action.text || '').trim();
        const resolveUrl = String(action.resolveUrl || '').trim();
        const csrfToken = String(action.csrfToken || '').trim();
        if (!id || !text || !resolveUrl || !csrfToken) {
            return null;
        }

        return {
            id,
            text,
            resolveUrl,
            csrfToken,
            canNope: action.canNope === true,
            expiresAt: String(action.expiresAt || '').trim(),
        };
    };

    const toExpiresAtMs = (value) => {
        const iso = String(value || '').trim();
        if (!iso) {
            return 0;
        }

        const ms = new Date(iso).getTime();
        return Number.isFinite(ms) ? ms : 0;
    };

    const renderActionCountdown = (countdownNode, expiresAtMs) => {
        if (!(countdownNode instanceof HTMLElement) || !Number.isFinite(expiresAtMs) || expiresAtMs <= 0) {
            return;
        }

        const remainingSeconds = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
        countdownNode.textContent = `⏳ ${remainingSeconds}s`;
    };

    const stopActionCountdownTicker = () => {
        if (actionCountdownTimerId) {
            window.clearInterval(actionCountdownTimerId);
            actionCountdownTimerId = null;
        }
    };

    const updateActionCountdowns = () => {
        if (!actionsNode) {
            stopActionCountdownTicker();
            return;
        }

        const countdownNodes = actionsNode.querySelectorAll('[data-action-countdown][data-expires-at-ms]');
        if (countdownNodes.length === 0) {
            stopActionCountdownTicker();
            return;
        }

        countdownNodes.forEach((node) => {
            const expiresAtMs = Number(node.getAttribute('data-expires-at-ms') || '0');
            renderActionCountdown(node, expiresAtMs);
        });
    };

    const ensureActionCountdownTicker = () => {
        updateActionCountdowns();
        if (actionCountdownTimerId) {
            return;
        }

        actionCountdownTimerId = window.setInterval(updateActionCountdowns, 1000);
    };

    const syncActionsPendingClass = () => {
        if (!actionsNode) {
            return;
        }

        const list = actionsNode.querySelector('ul');
        const hasPendingActions = !actionsNode.hidden
            && list instanceof HTMLUListElement
            && list.querySelector('li') !== null;
        actionsNode.classList.toggle('team-actions-has-pending', hasPendingActions);
    };

    const applyRealtimeActionDelta = (payload) => {
        if (!payload || typeof payload !== 'object') {
            return false;
        }

        const resolvedActionId = String(payload.resolvedActionId || '').trim();
        if (resolvedActionId !== '' && latestRealtimeActions.length > 0) {
            const nextActions = latestRealtimeActions.filter((action) => String(action?.id || '') !== resolvedActionId);
            renderActions(nextActions);
            return true;
        }

        const targetedAction = normalizeRealtimeAction(payload.action);
        if (targetedAction) {
            const byId = new Map(latestRealtimeActions.map((action) => [String(action?.id || ''), action]));
            byId.set(targetedAction.id, targetedAction);
            renderActions(Array.from(byId.values()));
            return true;
        }

        return false;
    };

    const renderStats = (stats) => {
        if (!statsNode || !stats) {
            return;
        }

        const loading = statsNode.querySelector('[data-loading="true"]');
        if (loading) {
            loading.remove();
        }

        const logo = statsNode.querySelector('[data-stat="logo"]');
        if (logo instanceof HTMLImageElement) {
            if (stats.logoPath) {
                logo.src = buildAssetUrl(stats.logoPath);
                logo.alt = stats.teamName || '';
                logo.hidden = false;
            } else {
                logo.src = '';
                logo.alt = '';
                logo.hidden = true;
            }
        }

        const teamName = statsNode.querySelector('[data-stat="team-name"]');
        if (teamName) {
            teamName.textContent = stats.teamName || '';
        }

        const gameName = statsNode.querySelector('[data-stat="game-name"]');
        if (gameName) {
            gameName.textContent = stats.gameName || '';
        }

        const gameCode = statsNode.querySelector('[data-stat="game-code"]');
        if (gameCode) {
            gameCode.textContent = stats.gameCode || '';
        }

        const lives = statsNode.querySelector('[data-stat="lives"]');
        if (lives) {
            const isRealtimeWsReady = isExplodingKittensDashboard
                && ws
                && typeof ws.isOpen === 'function'
                && ws.isOpen()
                && typeof ws.isAuthenticated === 'function'
                && ws.isAuthenticated();
            const keepRealtimeLives = isRealtimeWsReady && hasRealtimeLivesValue;
            if (!keepRealtimeLives) {
                lives.textContent = `${stats.lives ?? ''}`;
            }
        }

        const settingsLink = statsNode.querySelector('[data-stat="settings-link"]');
        if (settingsLink instanceof HTMLAnchorElement && stats.settingsUrl) {
            settingsLink.href = stats.settingsUrl;
        }

        const flags = statesNode?.querySelector('[data-team-flags]') || null;
        if (flags instanceof HTMLElement) {
            const pendingAttack = stats.pendingAttack === true;
            const pendingPeek = stats.pendingPeek === true;
            const pendingSkip = stats.pendingSkip === true;
            const hasAnyState = pendingAttack || pendingPeek || pendingSkip;

            const attackBadge = flags.querySelector('[data-flag="attack"]');
            if (attackBadge instanceof HTMLElement) {
                attackBadge.classList.toggle('is-hidden', !pendingAttack);
            }

            const peekBadge = flags.querySelector('[data-flag="peek"]');
            if (peekBadge instanceof HTMLElement) {
                peekBadge.classList.toggle('is-hidden', !pendingPeek);
            }

            const skipBadge = flags.querySelector('[data-flag="skip"]');
            if (skipBadge instanceof HTMLElement) {
                skipBadge.classList.toggle('is-hidden', !pendingSkip);
            }

            const noneBadge = flags.querySelector('[data-flag="none"]');
            if (noneBadge instanceof HTMLElement) {
                noneBadge.classList.toggle('is-hidden', hasAnyState);
            }
        }
    };

    const buildActionItem = (action) => {
        const item = document.createElement('li');
        item.className = 'team-action-item';
        item.dataset.actionId = action.id;
        item.dataset.signature = actionSignature(action);
        const text = document.createElement('p');
        text.className = 'team-action-text';
        text.textContent = action.text || '';
        item.appendChild(text);

        const expiresAtMs = toExpiresAtMs(action.expiresAt);
        if (expiresAtMs > 0) {
            const countdown = document.createElement('p');
            countdown.className = 'muted';
            countdown.setAttribute('data-action-countdown', '1');
            countdown.setAttribute('data-expires-at-ms', String(expiresAtMs));
            renderActionCountdown(countdown, expiresAtMs);
            item.appendChild(countdown);
        }

        const actionsRow = document.createElement('div');
        actionsRow.className = 'team-action-buttons';

        if (action.canNope === true) {
            const nopeForm = document.createElement('form');
            nopeForm.className = 'team-action-form team-action-form-nope';
            nopeForm.method = 'post';
            nopeForm.action = action.resolveUrl;

            const nopeToken = document.createElement('input');
            nopeToken.type = 'hidden';
            nopeToken.name = '_token';
            nopeToken.value = action.csrfToken || '';
            nopeForm.appendChild(nopeToken);

            const nopeInput = document.createElement('input');
            nopeInput.type = 'hidden';
            nopeInput.name = 'nope';
            nopeInput.value = '1';
            nopeForm.appendChild(nopeInput);

            const nopeBtn = document.createElement('button');
            nopeBtn.type = 'submit';
            nopeBtn.className = 'btn btn-remove btn-small team-action-btn';
            nopeBtn.textContent = copy.actionNope || '';
            nopeForm.appendChild(nopeBtn);

            actionsRow.appendChild(nopeForm);
        }

        const acceptForm = document.createElement('form');
        acceptForm.className = 'team-action-form team-action-form-accept';
        acceptForm.method = 'post';
        acceptForm.action = action.resolveUrl;

        const acceptToken = document.createElement('input');
        acceptToken.type = 'hidden';
        acceptToken.name = '_token';
        acceptToken.value = action.csrfToken || '';
        acceptForm.appendChild(acceptToken);

        const acceptBtn = document.createElement('button');
        acceptBtn.type = 'submit';
        acceptBtn.className = 'btn btn-small team-action-btn';
        acceptBtn.textContent = copy.actionAccept || '';
        acceptForm.appendChild(acceptBtn);
        actionsRow.appendChild(acceptForm);

        item.appendChild(actionsRow);

        return item;
    };

    const renderActions = (actions) => {
        if (!actionsNode) {
            return;
        }
        const loading = actionsNode.querySelector('[data-loading="true"]');
        if (loading) {
            loading.remove();
        }
        const section = actionsNode.querySelector('section.team-panel');
        if (!section) {
            return;
        }

        const title = section.querySelector('h2');
        if (!title) {
            return;
        }
        if (title.textContent !== copy.actionsTitle) {
            title.textContent = copy.actionsTitle || '';
        }

        const existingEmpty = section.querySelector('p[data-empty="actions"]');
        const list = section.querySelector('ul');
        if (!list) {
            return;
        }

        if (!actions || actions.length === 0) {
            latestRealtimeActions = [];
            list.innerHTML = '';
            stopActionCountdownTicker();
            if (!existingEmpty) {
                const empty = document.createElement('p');
                empty.dataset.empty = 'actions';
                empty.textContent = copy.noActions || '';
                section.appendChild(empty);
            }
            syncActionsPendingClass();
            return;
        }

        if (existingEmpty) {
            existingEmpty.remove();
        }

        latestRealtimeActions = actions.map((action) => ({
            id: String(action?.id || ''),
            text: String(action?.text || ''),
            resolveUrl: String(action?.resolveUrl || ''),
            csrfToken: String(action?.csrfToken || ''),
            canNope: action?.canNope === true,
            expiresAt: String(action?.expiresAt || ''),
        }));

        const existingItems = new Map();
        list.querySelectorAll('li[data-action-id]').forEach((item) => {
            existingItems.set(item.dataset.actionId, item);
        });

        const seen = new Set();
        actions.forEach((action, index) => {
            const key = String(action.id);
            const existing = existingItems.get(key);
            const signature = actionSignature(action);
            let item = existing;

            if (existing) {
                if (existing.dataset.signature !== signature) {
                    item = buildActionItem(action);
                    existing.replaceWith(item);
                }
            } else {
                item = buildActionItem(action);
            }

            const currentChild = list.children[index];
            if (currentChild !== item) {
                list.insertBefore(item, currentChild || null);
            }

            seen.add(key);
        });

        existingItems.forEach((item, key) => {
            if (!seen.has(key)) {
                item.remove();
            }
        });

        ensureActionCountdownTicker();
        syncActionsPendingClass();
    };

    const handSignature = (card, teamSignature) => JSON.stringify({
        title: card.title || '',
        typeLabel: card.typeLabel || '',
        typeValue: card.typeValue || '',
        imagePath: card.imagePath || '',
        useUrl: card.useUrl || '',
        csrfToken: card.csrfToken || '',
        requiresTarget: !!card.requiresTarget,
        isPlayable: !!card.isPlayable,
        teamSignature,
    });

    const buildHandItem = (card, teams, teamSignature) => {
        const item = document.createElement('li');
        item.className = 'hand-card';
        item.dataset.cardId = card.id;
        item.dataset.signature = handSignature(card, teamSignature);
        const vibeDuration = (1.6 + Math.random() * 1.4).toFixed(2);
        const vibeDelay = (Math.random() * 1.8).toFixed(2);
        const vibeRotate = (0.8 + Math.random() * 1.3).toFixed(2);
        const vibeScaleMin = (0.98 + Math.random() * 0.012).toFixed(3);
        const vibeScaleMax = (1.008 + Math.random() * 0.017).toFixed(3);
        item.style.setProperty('--combo-vibe-duration', `${vibeDuration}s`);
        item.style.setProperty('--combo-vibe-delay', `${vibeDelay}s`);
        item.style.setProperty('--combo-vibe-rotate', `${vibeRotate}deg`);
        item.style.setProperty('--combo-vibe-scale-min', `${vibeScaleMin}`);
        item.style.setProperty('--combo-vibe-scale-max', `${vibeScaleMax}`);

        if (card.imagePath) {
            const img = document.createElement('img');
            img.className = 'hand-card-image';
            img.src = buildAssetUrl(card.imagePath);
            img.alt = card.title || card.typeLabel || '';
            item.appendChild(img);
        }

        const body = document.createElement('div');
        body.className = 'hand-card-body';
        const cardTitle = document.createElement('strong');
        cardTitle.className = 'hand-card-title';
        cardTitle.textContent = card.title || card.typeLabel || '';
        const cardType = document.createElement('span');
        cardType.className = 'hand-card-type';
        cardType.textContent = card.typeLabel || '';
        body.appendChild(cardTitle);
        body.appendChild(cardType);
        item.appendChild(body);

        const comboSelectLabel = document.createElement('label');
        comboSelectLabel.className = 'hand-card-combo-select';
        const comboCheckbox = document.createElement('input');
        comboCheckbox.type = 'checkbox';
        comboCheckbox.name = 'card_ids[]';
        comboCheckbox.value = card.id;
        comboCheckbox.dataset.cardType = card.typeValue || '';
        comboCheckbox.dataset.comboSelect = '1';
        comboSelectLabel.appendChild(comboCheckbox);
        const comboSelectText = document.createElement('span');
        comboSelectText.textContent = copy.specialCombo || 'Special Combo';
        comboSelectLabel.appendChild(comboSelectText);
        comboSelectLabel.hidden = true;
        item.appendChild(comboSelectLabel);

        const form = document.createElement('form');
        form.method = 'post';
        form.action = card.useUrl;

        const token = document.createElement('input');
        token.type = 'hidden';
        token.name = '_token';
        token.value = card.csrfToken || '';
        form.appendChild(token);

        if (card.requiresTarget) {
            const select = document.createElement('select');
            select.name = 'target';
            select.required = true;
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = copy.chooseTarget || '';
            select.appendChild(placeholder);
            (teams || []).forEach((team) => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name;
                select.appendChild(option);
            });
            form.appendChild(select);
        }

        if (card.isPlayable) {
            const button = document.createElement('button');
            button.type = 'submit';
            button.textContent = copy.useCard || '';
            form.appendChild(button);
        } else {
            const passive = document.createElement('span');
            passive.textContent = copy.cardPassive || '';
            form.appendChild(passive);
        }

        item.appendChild(form);
        return item;
    };

    const updateComboUiState = () => {
        if (!comboForm || !comboTargetSelect || !comboRequestedTypeSelect || !comboTargetRow || !comboTypeRow || !comboSubmitButton) {
            return;
        }

        if (!comboModeEnabled) {
            comboForm.hidden = true;
            handNode?.classList.remove('combo-submit-visible');
            comboTargetRow.hidden = true;
            comboTypeRow.hidden = true;
            comboSubmitButton.hidden = true;
            comboTargetSelect.required = false;
            comboRequestedTypeSelect.required = false;
            comboTargetSelect.value = '';
            comboRequestedTypeSelect.value = '';
            updateComboToggleButton();
            updateComboSelectedInfo();
            return;
        }

        comboForm.hidden = false;
        comboSubmitButton.hidden = true;

        const { mode, isValid } = getComboSelection();
        const hasRelevantField = mode === 'two' || mode === 'three' || mode === 'five';
        const submitVisible = isValid && hasRelevantField;
        handNode?.classList.toggle('combo-submit-visible', submitVisible);
        comboSubmitButton.hidden = !submitVisible;
        updateComboSelectedInfo();

        if (mode === 'two') {
            comboTargetRow.hidden = false;
            comboTypeRow.hidden = true;
            comboTargetSelect.required = true;
            comboRequestedTypeSelect.required = false;
            comboRequestedTypeSelect.value = '';
            return;
        }

        if (mode === 'three') {
            comboTargetRow.hidden = false;
            comboTypeRow.hidden = false;
            comboTargetSelect.required = true;
            comboRequestedTypeSelect.required = true;
            return;
        }

        if (mode === 'five') {
            comboTargetRow.hidden = true;
            comboTypeRow.hidden = false;
            comboTargetSelect.required = false;
            comboRequestedTypeSelect.required = true;
            comboTargetSelect.value = '';
            return;
        }

        comboTargetRow.hidden = true;
        comboTypeRow.hidden = true;
        handNode?.classList.remove('combo-submit-visible');
        comboTargetSelect.required = false;
        comboRequestedTypeSelect.required = false;
        comboTargetSelect.value = '';
        comboRequestedTypeSelect.value = '';
        updateComboToggleButton();
    };

    const updateComboCheckboxVisibility = () => {
        if (!handNode) {
            return;
        }

        handNode.classList.toggle('combo-mode-active', comboModeEnabled);

        const labels = handNode.querySelectorAll('.hand-card-combo-select');
        labels.forEach((label) => {
            if (!(label instanceof HTMLElement)) {
                return;
            }

            label.hidden = true;
            const checkbox = label.querySelector('input[data-combo-select="1"]');
            if (checkbox instanceof HTMLInputElement && !comboModeEnabled) {
                checkbox.checked = false;
            }
        });

        syncComboSelectedCards();
        updateComboToggleButton();
        updateComboSelectedInfo();
    };

    const renderHand = (hand, teams) => {
        if (!handNode) {
            return;
        }
        const loading = handNode.querySelector('[data-loading="true"]');
        if (loading) {
            loading.remove();
        }
        const section = handNode.querySelector('section.team-panel');
        if (!section) {
            return;
        }

        const title = section.querySelector('h2');
        if (!title) {
            return;
        }
        if (title.textContent !== copy.handTitle) {
            title.textContent = copy.handTitle || '';
        }

        const existingEmpty = section.querySelector('p[data-empty="hand"]');
        const list = section.querySelector('ul.hand-grid');
        if (!list) {
            return;
        }

        if (!hand || hand.length === 0) {
            list.innerHTML = '';
            if (!existingEmpty) {
                const empty = document.createElement('p');
                empty.dataset.empty = 'hand';
                empty.textContent = copy.noCards || '';
                section.appendChild(empty);
            }
            return;
        }

        if (existingEmpty) {
            existingEmpty.remove();
        }

        const teamSignature = JSON.stringify((teams || []).map((team) => `${team.id}:${team.name}`));
        const existingItems = new Map();
        list.querySelectorAll('li[data-card-id]').forEach((item) => {
            existingItems.set(item.dataset.cardId, item);
        });

        const seen = new Set();
        hand.forEach((card, index) => {
            const key = String(card.id);
            const existing = existingItems.get(key);
            const signature = handSignature(card, teamSignature);
            let item = existing;

            if (existing) {
                if (existing.dataset.signature !== signature) {
                    item = buildHandItem(card, teams, teamSignature);
                    existing.replaceWith(item);
                }
            } else {
                item = buildHandItem(card, teams, teamSignature);
            }

            const currentChild = list.children[index];
            if (currentChild !== item) {
                list.insertBefore(item, currentChild || null);
            }

            seen.add(key);
        });

        existingItems.forEach((item, key) => {
            if (!seen.has(key)) {
                item.remove();
            }
        });

        updateComboCheckboxVisibility();
        updateComboUiState();
    };

    if (modal) {
        modal.addEventListener('click', (event) => {
            const rawTarget = event.target;
            const target = rawTarget instanceof Element ? rawTarget : rawTarget?.parentElement;
            const closeTrigger = target instanceof Element ? target.closest('[data-modal-close]') : null;
            if (closeTrigger instanceof HTMLElement && modal.contains(closeTrigger)) {
                closeModal();
            }
        });
    }

    if (handNode) {
        handNode.addEventListener('click', (event) => {
            if (!comboModeEnabled) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const card = target.closest('.hand-card');
            if (!(card instanceof HTMLElement)) {
                return;
            }

            const inComboForm = target.closest('[data-combo-form]');
            if (inComboForm) {
                return;
            }

            const checkbox = card.querySelector('input[data-combo-select="1"]');
            if (!(checkbox instanceof HTMLInputElement)) {
                return;
            }

            event.preventDefault();
            checkbox.checked = !checkbox.checked;
            syncComboSelectedCards();
            updateComboUiState();
        });

        handNode.addEventListener('change', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) {
                return;
            }

            if (target.dataset.comboSelect === '1') {
                syncComboSelectedCards();
                updateComboUiState();
            }
        });
    }

    if (comboToggleButton) {
        comboToggleButton.addEventListener('click', () => {
            comboModeEnabled = !comboModeEnabled;
            updateComboCheckboxVisibility();
            updateComboUiState();
        });
    }

    if (comboForm) {
        comboForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!comboModeEnabled) {
                return;
            }

            const selection = getComboSelection();
            const isTwo = selection.mode === 'two';
            const isThree = selection.mode === 'three';
            const isFive = selection.mode === 'five';

            if (!isTwo && !isThree && !isFive) {
                window.alert(copy.comboNeedValid || copy.playCombo || 'Play combo');
                return;
            }

            const targetValue = String(comboTargetSelect?.value || '').trim();
            const requestedTypeValue = String(comboRequestedTypeSelect?.value || '').trim();

            if ((isTwo || isThree) && !targetValue) {
                window.alert(copy.comboNeedTarget || 'Select a target team.');
                return;
            }

            if ((isThree || isFive) && !requestedTypeValue) {
                window.alert(copy.comboNeedType || 'Select a card type.');
                return;
            }

            try {
                const submitFormData = new FormData(comboForm);
                selection.selected.forEach((checkbox) => {
                    submitFormData.append('card_ids[]', String(checkbox.value || ''));
                });

                const response = await fetch(comboForm.action, {
                    method: 'POST',
                    body: submitFormData,
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                const payload = await response.json().catch(() => null);
                if (!payload) {
                    window.alert(copy.specialCombo || 'Special Combo');
                    return;
                }

                if (!response.ok) {
                    const translatedBody = String(payload?.modalBody || payload?.message || '').trim();
                    if (translatedBody !== '') {
                        enqueuePopup({
                            title: payload.modalTitle || (copy.specialCombo || 'Special Combo'),
                            body: translatedBody,
                            kicker: copy.popupKicker || '',
                        });
                    } else {
                        window.alert(copy.specialCombo || 'Special Combo');
                    }

                    if (payload.state && isExplodingKittensDashboard) {
                        applyRealtimeState(payload.state);
                    } else {
                        pollOnce();
                    }

                    return;
                }

                if (payload.modalBody) {
                    enqueuePopup({
                        title: payload.modalTitle || (copy.specialCombo || 'Special Combo'),
                        body: String(payload.modalBody),
                        kicker: copy.popupKicker || '',
                    });
                }

                if (payload.state && isExplodingKittensDashboard) {
                    applyRealtimeState(payload.state);
                } else {
                    pollOnce();
                }

                if (payload.status === 'ok') {
                    comboModeEnabled = false;
                    updateComboCheckboxVisibility();
                    updateComboUiState();
                }
            } catch (error) {
                window.alert(copy.specialCombo || 'Special Combo');
            }
        });
    }

    let pollInFlight = false;
    let pollQueued = false;

    const pollOnce = async () => {
        if (pollInFlight) {
            pollQueued = true;
            return;
        }
        pollInFlight = true;
        try {
            const response = await fetch(pollUrl, {
                headers: { 'Accept': 'application/json' },
            });

            if (!response.ok) {
                return;
            }

            const payload = await response.json();
            if (!redirectedToGame && payload.activeGameUrl && payload.gameWindow?.status === 'active') {
                redirectedToGame = true;
                window.location.assign(payload.activeGameUrl);
                return;
            }

            renderGameWindow(payload.gameWindow || null);
            const showExplodingKittensPanels = updateExplodingKittensPanelsVisibility(payload);

            if (payload.stats) {
                renderStats(payload.stats);
            }
            if (showExplodingKittensPanels && payload.actions) {
                renderActions(payload.actions);
            }
            if (showExplodingKittensPanels && payload.hand) {
                renderHand(payload.hand, payload.teams || []);
                updateComboUiState();
            }

            if (Array.isArray(payload.popups)) {
                payload.popups.forEach((popup) => {
                    enqueuePopup({
                        title: popup.title,
                        body: popup.body,
                        kicker: popup.kicker || copy.popupKicker || '',
                    });
                });
            }
        } catch (error) {
            // Ignore polling errors and try again later.
        } finally {
            pollInFlight = false;
            if (pollQueued) {
                pollQueued = false;
                pollOnce();
            }
        }
    };

    let initialPollRequested = false;
    const requestInitialPoll = () => {
        if (initialPollRequested) {
            return;
        }
        initialPollRequested = true;
        pollOnce();
    };

    syncActionsPendingClass();
    requestInitialPoll();
    let pollTimer = null;
    if (!isExplodingKittensDashboard) {
        pollTimer = window.setInterval(pollOnce, 5000);
    }
    let ws = null;

    if (window.JotiWs && wsTeamId && wsTeamCode) {
        ws = window.JotiWs.connect({
            role: 'team',
            teamId: wsTeamId,
            teamCode: wsTeamCode,
            reconnectMs: 3000,
        });

        const isOwnTeamStatePayload = (payload) => {
            const payloadTeamId = String(payload?.teamId || payload?.state?.stats?.teamId || '').trim();
            return payloadTeamId !== '' && payloadTeamId === wsTeamId;
        };

        const requestLeaderboardSnapshot = () => {
            ws?.send('exploding_kittens.team.bootstrap', {});
        };

        ws.onOpen(() => {
            if (pollTimer) {
                window.clearInterval(pollTimer);
                pollTimer = null;
            }
            if (!isExplodingKittensDashboard) {
                pollTimer = window.setInterval(pollOnce, 15000);
            }
            requestInitialPoll();
            requestLeaderboardSnapshot();
        });

        ws.onClose(() => {
            hasRealtimeLivesValue = false;
            if (pollTimer) {
                window.clearInterval(pollTimer);
                pollTimer = null;
            }
            if (!isExplodingKittensDashboard) {
                pollTimer = window.setInterval(pollOnce, 5000);
            }
        });

        window.addEventListener('beforeunload', () => {
            stopActionCountdownTicker();
        });

        ws.onAuthenticated(() => {
            requestInitialPoll();
            requestLeaderboardSnapshot();
        });

        ws.onEvent((event) => {
            const command = String(event?.command || '');

            if (command === 'exploding_kittens.card.scanned') {
                if (isExplodingKittensDashboard && event?.payload?.state && isOwnTeamStatePayload(event?.payload)) {
                    applyRealtimeState(event.payload.state);
                    return;
                }

                pollOnce();
                return;
            }

            if (command === 'exploding_kittens.team.state.updated') {
                if (event?.payload?.state && isOwnTeamStatePayload(event?.payload)) {
                    applyRealtimeState(event.payload.state);
                    return;
                }

                if (applyRealtimeActionDelta(event?.payload)) {
                    return;
                }

                pollOnce();
                return;
            }

            if (command === 'exploding_kittens.lives.updated') {
                const updatedAtMs = parseUpdatedAtMs(event?.payload?.updatedAt);
                if (updatedAtMs > 0 && updatedAtMs <= lastLivesUpdatedAtMs) {
                    return;
                }

                if (updatedAtMs > 0) {
                    lastLivesUpdatedAtMs = Math.max(lastLivesUpdatedAtMs, updatedAtMs);
                }

                const rows = Array.isArray(event?.payload?.leaderboard) ? event.payload.leaderboard : [];
                renderLeaderboard(rows);

                const currentRow = rows.find((row) => String(row?.id || '') === wsTeamId);
                if (currentRow && statsNode) {
                    const lives = statsNode.querySelector('[data-stat="lives"]');
                    if (lives) {
                        lives.textContent = `${currentRow.lives ?? ''}`;
                        hasRealtimeLivesValue = true;
                    }
                }

                return;
            }

            if (command === 'team.updated') {
                applyTeamIdentityUpdate(event?.payload?.team);
                return;
            }

            if (command === 'admin.message.team') {
                const body = String(event?.payload?.message || '').trim();
                if (body !== '') {
                    enqueuePopup({
                        title: copy.popupMessageTitle || 'Message from admin',
                        body,
                        kicker: copy.popupKicker || '',
                    });
                }

                pollOnce();
                return;
            }

            if (command === 'exploding_kittens.combo.notice') {
                const body = String(event?.payload?.message || '').trim();
                if (body !== '') {
                    enqueuePopup({
                        title: String(event?.payload?.title || copy.specialCombo || 'Special Combo'),
                        body,
                        kicker: copy.popupKicker || '',
                    });
                }

                if (event?.payload?.state && isExplodingKittensDashboard && isOwnTeamStatePayload(event?.payload)) {
                    applyRealtimeState(event.payload.state);
                } else {
                    pollOnce();
                }

                return;
            }

            if (command === 'exploding_kittens.favor.notice') {
                const body = String(event?.payload?.message || '').trim();
                if (body !== '') {
                    enqueuePopup({
                        title: String(event?.payload?.title || 'Favor'),
                        body,
                        kicker: copy.popupKicker || '',
                    });
                }

                if (event?.payload?.state && isExplodingKittensDashboard && isOwnTeamStatePayload(event?.payload)) {
                    applyRealtimeState(event.payload.state);
                } else {
                    pollOnce();
                }

                return;
            }

            if (command === 'exploding_kittens.team.targeted') {
                const body = String(event?.payload?.message || '').trim();
                if (body !== '') {
                    enqueuePopup({
                        title: String(event?.payload?.title || copy.popupActionTitle || 'Action incoming'),
                        body,
                        kicker: copy.popupKicker || '',
                    });
                }

                pollOnce();

                return;
            }

            if (
                command === 'exploding_kittens.card.played'
                || command === 'game.reset'
            ) {
                if (isExplodingKittensDashboard && event?.payload?.state && isOwnTeamStatePayload(event?.payload)) {
                    applyRealtimeState(event.payload.state);
                    return;
                }

                pollOnce();
            }
        });

        ws.onAck((ack) => {
            if (ack?.command === 'exploding_kittens.team.bootstrap') {
                const rows = Array.isArray(ack?.payload?.leaderboard) ? ack.payload.leaderboard : [];
                renderLeaderboard(rows);

                return;
            }

            if (ack?.command === 'team.register') {
                if (!isExplodingKittensDashboard) {
                    pollOnce();
                }
            }
        });
    }
});
