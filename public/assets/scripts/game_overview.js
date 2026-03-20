document.addEventListener('DOMContentLoaded', () => {
    const overviewHeader = document.querySelector('[data-overview-poll]');
    if (!overviewHeader) {
        return;
    }

    const gridNode = document.getElementById('overview-grid');
    const wsGameId = overviewHeader.getAttribute('data-ws-game-id') || '';
    const wsAdminToken = overviewHeader.getAttribute('data-ws-admin-token') || '';
    const wsGameType = (overviewHeader.getAttribute('data-ws-game-type') || '').toLowerCase();
    const isExplodingKittens = wsGameType === 'exploding_kittens';
    const pendingAttackLabel = overviewHeader.getAttribute('data-label-pending-attack') || 'Pending attack';
    const pendingPeekLabel = overviewHeader.getAttribute('data-label-pending-peek') || 'See the future';
    const pendingSkipLabel = overviewHeader.getAttribute('data-label-pending-skip') || 'Skip next scan';
    let wsClient = null;
    let lastLivesUpdatedAtMs = 0;

    const parseUpdatedAtMs = (value) => {
        const ms = Date.parse(String(value || '').trim());
        return Number.isFinite(ms) ? ms : 0;
    };

    const findTeamCard = (teamId) => {
        if (!gridNode || !teamId) {
            return null;
        }

        return gridNode.querySelector(`.team-card[data-team-id="${CSS.escape(String(teamId))}"]`);
    };

    const normalizeLogoPath = (value) => {
        const raw = String(value || '').trim();
        if (!raw) {
            return '';
        }

        if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('/')) {
            return raw;
        }

        return `/${raw}`;
    };

    const applyTeamIdentity = (teamCard, team) => {
        if (!(teamCard instanceof HTMLElement) || !team || typeof team !== 'object') {
            return;
        }

        const identityMeta = teamCard.querySelector('.team-identity-meta');
        const nameNode = identityMeta?.querySelector('h2');
        const teamName = String(team?.name || '').trim();
        if (nameNode instanceof HTMLElement && teamName !== '') {
            nameNode.textContent = teamName;
        }

        const identity = teamCard.querySelector('.team-identity');
        if (!(identity instanceof HTMLElement)) {
            return;
        }

        const logoSrc = normalizeLogoPath(team?.logoPath);
        const existingLogo = identity.querySelector('.team-logo');
        if (!logoSrc) {
            if (existingLogo instanceof HTMLElement) {
                existingLogo.remove();
            }
            return;
        }

        if (existingLogo instanceof HTMLImageElement) {
            existingLogo.src = logoSrc;
            if (teamName !== '') {
                existingLogo.alt = teamName;
            }
            return;
        }

        const logoNode = document.createElement('img');
        logoNode.className = 'team-logo';
        logoNode.src = logoSrc;
        logoNode.alt = teamName;
        identity.insertBefore(logoNode, identity.firstChild);
    };

    const updateNoCardsVisibility = (teamCard) => {
        if (!(teamCard instanceof HTMLElement)) {
            return;
        }

        const noCardsNode = teamCard.querySelector('[data-no-cards]');
        if (!(noCardsNode instanceof HTMLElement)) {
            return;
        }

        const countNodes = teamCard.querySelectorAll('[data-hand-count]');
        let total = 0;
        countNodes.forEach((node) => {
            const value = Number(node.textContent || '0');
            if (Number.isFinite(value)) {
                total += value;
            }
        });

        noCardsNode.hidden = total > 0;
    };

    const updateFlags = (teamCard, pendingAttack, pendingPeek, pendingSkip) => {
        if (!(teamCard instanceof HTMLElement)) {
            return;
        }

        const flags = teamCard.querySelector('[data-team-flags]');
        if (!(flags instanceof HTMLElement)) {
            return;
        }

        const attack = flags.querySelector('[data-flag="attack"]');
        const peek = flags.querySelector('[data-flag="peek"]');
        const skip = flags.querySelector('[data-flag="skip"]');

        if (attack instanceof HTMLElement) {
            attack.classList.toggle('is-inactive', !pendingAttack);
            attack.setAttribute('title', pendingAttackLabel);
            attack.setAttribute('aria-label', pendingAttackLabel);
        }
        if (peek instanceof HTMLElement) {
            peek.classList.toggle('is-inactive', !pendingPeek);
            peek.setAttribute('title', pendingPeekLabel);
            peek.setAttribute('aria-label', pendingPeekLabel);
        }
        if (skip instanceof HTMLElement) {
            skip.classList.toggle('is-inactive', !pendingSkip);
            skip.setAttribute('title', pendingSkipLabel);
            skip.setAttribute('aria-label', pendingSkipLabel);
        }
    };

    const updatePendingActions = (teamCard, actions) => {
        if (!(teamCard instanceof HTMLElement)) {
            return;
        }

        const list = teamCard.querySelector('[data-pending-actions]');
        if (!(list instanceof HTMLElement)) {
            return;
        }

        list.innerHTML = '';
        (Array.isArray(actions) ? actions : []).forEach((action) => {
            const item = document.createElement('li');
            item.className = 'team-pending-row';

            const actionNode = document.createElement('span');
            actionNode.className = 'team-pending-action';
            actionNode.textContent = String(action?.text || '');

            const sourceNode = document.createElement('span');
            sourceNode.className = 'team-pending-source';
            sourceNode.textContent = '';

            item.appendChild(actionNode);
            item.appendChild(sourceNode);
            list.appendChild(item);
        });
    };

    const applyHandDelta = (teamId, cardType, delta) => {
        const teamCard = findTeamCard(teamId);
        if (!(teamCard instanceof HTMLElement)) {
            return;
        }

        const countNode = teamCard.querySelector(`[data-hand-count][data-card-type="${CSS.escape(String(cardType))}"]`);
        if (!(countNode instanceof HTMLElement)) {
            return;
        }

        const current = Number(countNode.textContent || '0');
        const next = Math.max(0, (Number.isFinite(current) ? current : 0) + Number(delta || 0));
        countNode.textContent = `${next}`;
        updateNoCardsVisibility(teamCard);
    };

    const applyTeamState = (teamId, state) => {
        const resolvedTeamId = String(teamId || state?.stats?.teamId || '').trim();
        if (!resolvedTeamId) {
            return;
        }

        const teamCard = findTeamCard(resolvedTeamId);
        if (!(teamCard instanceof HTMLElement)) {
            return;
        }

        const livesNode = teamCard.querySelector('[data-team-lives]');
        if (livesNode instanceof HTMLElement && state?.stats?.lives !== undefined) {
            livesNode.textContent = `${state.stats.lives}`;
        }

        const hand = Array.isArray(state?.hand) ? state.hand : [];
        const countsByType = new Map();
        hand.forEach((card) => {
            const type = String(card?.typeValue || '').trim();
            if (!type) {
                return;
            }
            countsByType.set(type, (countsByType.get(type) || 0) + 1);
        });

        teamCard.querySelectorAll('[data-hand-count][data-card-type]').forEach((node) => {
            const cardType = String(node.getAttribute('data-card-type') || '').trim();
            const value = countsByType.get(cardType) || 0;
            node.textContent = `${value}`;
        });
        updateNoCardsVisibility(teamCard);

        updateFlags(
            teamCard,
            !!state?.stats?.pendingAttack,
            !!state?.stats?.pendingPeek,
            !!state?.stats?.pendingSkip,
        );

        updatePendingActions(teamCard, state?.actions);
    };

    const applyLivesLeaderboard = (leaderboard) => {
        (Array.isArray(leaderboard) ? leaderboard : []).forEach((row) => {
            const teamCard = findTeamCard(row?.id);
            if (!(teamCard instanceof HTMLElement)) {
                return;
            }

            const livesNode = teamCard.querySelector('[data-team-lives]');
            if (livesNode instanceof HTMLElement) {
                livesNode.textContent = `${row?.lives ?? 0}`;
            }
        });
    };

    if (window.JotiWs && wsGameId && wsAdminToken) {
        wsClient = window.JotiWs.connect({
            role: 'admin',
            gameId: wsGameId,
            adminToken: wsAdminToken,
            reconnectMs: 3000,
        });

        wsClient.onOpen(() => {});

        wsClient.onEvent((event) => {
            const command = String(event?.command || '');

            if (command === 'exploding_kittens.lives.updated') {
                const updatedAtMs = parseUpdatedAtMs(event?.payload?.updatedAt);
                if (updatedAtMs > 0 && updatedAtMs <= lastLivesUpdatedAtMs) {
                    return;
                }

                if (updatedAtMs > 0) {
                    lastLivesUpdatedAtMs = Math.max(lastLivesUpdatedAtMs, updatedAtMs);
                }

                applyLivesLeaderboard(event?.payload?.leaderboard);
                return;
            }

            if (command === 'team.updated') {
                const team = event?.payload?.team;
                const teamCard = findTeamCard(team?.id);
                if (!(teamCard instanceof HTMLElement)) {
                    return;
                }

                applyTeamIdentity(teamCard, team);
                return;
            }

            if (command === 'exploding_kittens.team.state.updated' || command === 'exploding_kittens.team.targeted') {
                applyTeamState(event?.payload?.teamId, event?.payload?.state);
                return;
            }

            if (command === 'exploding_kittens.card.scanned' || command === 'exploding_kittens.card.played') {
                if (event?.payload?.state) {
                    applyTeamState(event?.payload?.teamId, event.payload.state);
                    return;
                }

                if (event?.payload?.teamId && event?.payload?.cardType && Number.isInteger(Number(event?.payload?.delta))) {
                    applyHandDelta(event.payload.teamId, event.payload.cardType, Number(event.payload.delta));
                }
                return;
            }

            if (command === 'game.reset') {
                window.location.reload();
            }
        });

        wsClient.onAck((ack) => {
            const command = String(ack?.command || '');
            if (command === 'exploding_kittens.team.lives.adjust') {
                return;
            }

            if (command === 'exploding_kittens.team.hand.adjust') {
                if (!ack?.payload?.adjusted) {
                    return;
                }
                applyHandDelta(ack?.payload?.teamId, ack?.payload?.cardType, Number(ack?.payload?.delta || 0));
            }
        });
    }

    if (gridNode) {
        gridNode.addEventListener('click', (event) => {
            if (!isExplodingKittens || !wsClient) {
                return;
            }

            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const button = target.closest('[data-lives-adjust][data-team-id]');
            if (button instanceof HTMLButtonElement) {
                const teamId = String(button.dataset.teamId || '').trim();
                const delta = Number(button.dataset.livesAdjust || 0);
                if (!teamId || !Number.isInteger(delta) || (delta !== 1 && delta !== -1)) {
                    return;
                }

                wsClient.send('exploding_kittens.team.lives.adjust', {
                    teamId,
                    delta,
                });

                return;
            }

            const handButton = target.closest('[data-hand-adjust][data-team-id][data-card-type]');
            if (!(handButton instanceof HTMLButtonElement)) {
                return;
            }

            const teamId = String(handButton.dataset.teamId || '').trim();
            const cardType = String(handButton.dataset.cardType || '').trim();
            const delta = Number(handButton.dataset.handAdjust || 0);
            if (!teamId || !cardType || !Number.isInteger(delta) || (delta !== 1 && delta !== -1)) {
                return;
            }

            wsClient.send('exploding_kittens.team.hand.adjust', {
                teamId,
                cardType,
                delta,
            });
        });
    }

});
