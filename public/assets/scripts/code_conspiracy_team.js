(() => {
  const root = document.getElementById('code-conspiracy-team');
  if (!root) {
    return;
  }

  let copy = {};
  try {
    copy = JSON.parse(root.dataset.copy || '{}');
  } catch (_) {
    copy = {};
  }

  const t = (key, fallback = '') => String(copy[key] || fallback);
  const tableEl = document.getElementById('cc-target-table');
  const statusEl = document.getElementById('cc-status');
  const leaderboardContainer = root.querySelector('[data-team-leaderboard]');
  const myCodeEl = document.getElementById('cc-my-code');

  let currentTargets = [];
  let disabledAll = false;
  let winnerLocked = false;
  let cooldownTimerId = null;
  let cooldownSecondsRemaining = 0;
  let lastSubmittedTargetTeamId = '';
  let leaderboardRows = [];
  const rowFeedbackByTeamId = new Map();
  const leaderboardApi = (window.JotiTeamLeaderboard && leaderboardContainer)
    ? window.JotiTeamLeaderboard.create(leaderboardContainer, {
      currentTeamId: root.dataset.teamId || '',
    })
    : null;

  const setStatus = (text) => {
    if (statusEl) {
      statusEl.textContent = text;
    }
  };

  const stopCooldownTicker = () => {
    if (cooldownTimerId) {
      window.clearInterval(cooldownTimerId);
      cooldownTimerId = null;
    }
    cooldownSecondsRemaining = 0;
  };

  const startCooldownTicker = (seconds) => {
    stopCooldownTicker();

    const initial = Number(seconds || 0);
    if (!Number.isFinite(initial) || initial <= 0) {
      if (!winnerLocked) {
        setInputsDisabled(false);
      }
      return;
    }

    cooldownSecondsRemaining = Math.max(0, Math.floor(initial));
    setInputsDisabled(true);
    setStatus(`${t('cooldown', 'Cooldown')}: ${cooldownSecondsRemaining}s`);

    cooldownTimerId = window.setInterval(() => {
      cooldownSecondsRemaining -= 1;
      if (cooldownSecondsRemaining > 0) {
        setStatus(`${t('cooldown', 'Cooldown')}: ${cooldownSecondsRemaining}s`);
        return;
      }

      stopCooldownTicker();
      if (!winnerLocked) {
        setStatus('');
        setInputsDisabled(false);
      }
    }, 1000);
  };

  const renderScoreboard = (payload) => {
    if (!leaderboardApi) {
      return;
    }

    const teams = Array.isArray(payload?.teams) ? payload.teams : [];
    const rows = Array.isArray(payload?.leaderboard) && payload.leaderboard.length > 0
      ? payload.leaderboard
      : teams.map((team) => ({
        id: team.id,
        name: team.name,
        logoPath: team.logoPath || null,
        value: Number(team.score || 0),
      }));

    leaderboardRows = rows.map((entry) => ({
      id: entry.id,
      name: entry.name,
      logoPath: entry.logoPath || null,
      value: Number(entry.value || 0),
    }));

    leaderboardApi.render(rows, {
      metricDirection: payload?.leaderboardMetricDirection || 'desc',
      metricLabel: 'Points',
    });
  };

  const updateRowFeedback = (teamId, tone, text, persist = true) => {
    if (!tableEl) {
      return;
    }

    const row = tableEl.querySelector(`[data-target-team-id="${CSS.escape(String(teamId || ''))}"]`);
    if (!(row instanceof HTMLElement)) {
      return;
    }

    const input = row.querySelector('[data-cc-code-input]');
    const feedback = row.querySelector('[data-cc-row-feedback]');

    if (input instanceof HTMLElement) {
      input.classList.remove('is-correct', 'is-wrong');
      if (tone === 'correct') {
        input.classList.add('is-correct');
      } else if (tone === 'wrong') {
        input.classList.add('is-wrong');
      }
    }

    if (feedback instanceof HTMLElement) {
      feedback.textContent = text || '';
      feedback.classList.remove('is-correct', 'is-wrong');
      if (tone === 'correct') {
        feedback.classList.add('is-correct');
      } else if (tone === 'wrong') {
        feedback.classList.add('is-wrong');
      }
    }

    const key = String(teamId || '');
    if (!key) {
      return;
    }

    if (!persist || !tone || tone === 'muted') {
      rowFeedbackByTeamId.delete(key);
      return;
    }

    rowFeedbackByTeamId.set(key, {
      tone,
      text,
    });
  };

  const clearRowFeedback = (teamId) => {
    updateRowFeedback(teamId, 'muted', '', false);
  };

  const applyPersistedFeedback = () => {
    for (const [teamId, state] of rowFeedbackByTeamId.entries()) {
      if (!state) {
        rowFeedbackByTeamId.delete(teamId);
        continue;
      }

      updateRowFeedback(teamId, state.tone, state.text, false);
    }
  };

  const setInputsDisabled = (disabled) => {
    disabledAll = disabled;
    if (!tableEl) {
      return;
    }

    tableEl.querySelectorAll('[data-cc-code-input], [data-cc-submit]').forEach((el) => {
      el.disabled = disabled || el.dataset.locked === '1';
    });
  };

  const renderTargets = () => {
    if (!tableEl) {
      return;
    }

    if (currentTargets.length === 0) {
      tableEl.innerHTML = `<p>${t('no_targets', 'No valid targets left')}</p>`;
      return;
    }

    const rows = currentTargets.map((team) => {
      const teamId = String(team.id || '');
      const locked = Boolean(team.verifiedByMe);
      const solvedCode = String(team.solvedCode || '').trim();

      return `<div class="cc-target-row" data-target-team-id="${teamId}">
        <div class="cc-target-row__team">${String(team.name || '')}</div>
        <input class="cc-target-row__input ${locked ? 'is-correct' : ''}" data-cc-code-input data-target-team-id="${teamId}" type="text" maxlength="24" value="${solvedCode}" ${locked ? 'disabled data-locked="1"' : ''}>
        <button class="btn btn-primary btn-small" data-cc-submit data-target-team-id="${teamId}" type="button" ${locked ? 'disabled data-locked="1"' : ''}>${t('submit', 'Submit')}</button>
        <span class="cc-target-row__feedback ${locked ? 'is-correct' : ''}" data-cc-row-feedback>${locked ? t('correct', 'Correct') : ''}</span>
      </div>`;
    }).join('');

    tableEl.innerHTML = `<div class="cc-target-table-head"><span>${t('target_team', 'Target team')}</span><span>${t('target_code', 'Secret code guess')}</span><span></span><span></span></div>${rows}`;
    setInputsDisabled(disabledAll);
    applyPersistedFeedback();
  };

  const requestBootstrap = (wsClient) => {
    if (!wsClient || !wsClient.isOpen()) {
      return;
    }

    if (typeof wsClient.isAuthenticated === 'function' && !wsClient.isAuthenticated()) {
      return;
    }

    wsClient.send('code_conspiracy.team.bootstrap', {});
  };

  const applyTeamUpdate = (teamUpdate) => {
    if (!teamUpdate || !teamUpdate.id) {
      return;
    }

    const teamId = String(teamUpdate.id);
    let didUpdate = false;
    currentTargets = currentTargets.map((entry) => {
      if (String(entry.id || '') !== teamId) {
        return entry;
      }

      didUpdate = true;
      return {
        ...entry,
        name: String(teamUpdate.name || entry.name || ''),
        score: Number(teamUpdate.score ?? entry.score ?? 0),
      };
    });

    if (didUpdate) {
      renderTargets();
    }
  };

  const updateLeaderboardScore = (teamUpdate) => {
    if (!leaderboardApi || !teamUpdate || !teamUpdate.id) {
      return;
    }

    const teamId = String(teamUpdate.id);
    const teamName = String(teamUpdate.name || '');
    const teamScore = Number(teamUpdate.score || 0);
    const row = {
      id: teamId,
      name: teamName,
      logoPath: teamUpdate.logoPath || null,
      value: teamScore,
    };

    const byId = new Map(leaderboardRows.map((entry) => [String(entry.id || ''), entry]));
    byId.set(teamId, row);
    leaderboardRows = [...byId.values()]
      .sort((left, right) => Number(right.value || 0) - Number(left.value || 0));

    leaderboardApi.render(leaderboardRows, {
      metricDirection: 'desc',
      metricLabel: 'Points',
    });
  };

  const applySelfUpdate = (payload) => {
    if (!payload) {
      return;
    }

    const myTeamId = String(root.dataset.teamId || '');
    if (String(payload.teamId || '') !== myTeamId) {
      return;
    }

    if (Number.isFinite(Number(payload.cooldownRemaining || 0))) {
      startCooldownTicker(Number(payload.cooldownRemaining || 0));
    }

    if (payload.winnerName) {
      winnerLocked = true;
      setStatus(`${t('winner', 'Winner')}: ${String(payload.winnerName)}`);
      setInputsDisabled(true);
    }

    const targetTeamId = String(payload.targetTeamId || '');
    if (!targetTeamId) {
      return;
    }

    const message = payload.correct ? t('correct', 'Correct') : t('wrong', 'Wrong');
    updateRowFeedback(targetTeamId, payload.correct ? 'correct' : 'wrong', message);

    const input = tableEl?.querySelector(`[data-cc-code-input][data-target-team-id="${CSS.escape(targetTeamId)}"]`);
    const button = tableEl?.querySelector(`[data-cc-submit][data-target-team-id="${CSS.escape(targetTeamId)}"]`);

    if (payload.correct) {
      const solvedValue = String(payload.solvedCode || input?.value || '').trim().toUpperCase();
      if (input instanceof HTMLInputElement) {
        input.value = solvedValue;
        input.placeholder = solvedValue;
        input.disabled = true;
        input.dataset.locked = '1';
      }
      if (button instanceof HTMLButtonElement) {
        button.disabled = true;
        button.dataset.locked = '1';
      }
    } else if (input instanceof HTMLInputElement) {
      input.value = '';
    }
  };

  const applyBootstrapState = (payload) => {
    if (!payload) {
      return;
    }

    if (myCodeEl && payload.myCode) {
      myCodeEl.textContent = String(payload.myCode);
    }

    currentTargets = (payload.teams || []).filter((team) => !team.isSelf);
    renderTargets();
    renderScoreboard(payload);

    winnerLocked = Boolean(payload.winnerTeamId);
    const cooldownRemaining = Number(payload.cooldownRemaining || 0);
    if (winnerLocked) {
      stopCooldownTicker();
      setInputsDisabled(true);
    } else {
      startCooldownTicker(cooldownRemaining);
      if (cooldownRemaining <= 0) {
        setInputsDisabled(false);
      }
    }

    if (payload.winnerName) {
      setStatus(`${t('winner', 'Winner')}: ${String(payload.winnerName)}`);
      setInputsDisabled(true);
    }
  };

  if (!window.JotiWs || !root.dataset.wsTeamId || !root.dataset.wsTeamCode) {
    return;
  }

  const ws = window.JotiWs.connect({
    role: 'team',
    teamId: root.dataset.wsTeamId,
    teamCode: root.dataset.wsTeamCode,
    reconnectMs: 3000,
  });

  ws.onOpen(() => {});
  ws.onAuthenticated((ack) => {
    const bootstrap = ack?.payload?.codeConspiracyBootstrap;
    if (bootstrap) {
      applyBootstrapState(bootstrap);
      return;
    }

    requestBootstrap(ws);
  });
  ws.onError((error) => {
    if (error?.code === 'cooldown_active') {
      const remaining = Number(error?.details?.cooldownRemaining || 0);
      startCooldownTicker(remaining);
      lastSubmittedTargetTeamId = '';
      return;
    }

    if (error?.code === 'already_verified') {
      setStatus(t('correct', 'Correct'));
      lastSubmittedTargetTeamId = '';
      return;
    }

    if (error?.code === 'invalid_target' || error?.code === 'invalid_code_format' || error?.code === 'target_code_missing') {
      setStatus(t('wrong', 'Wrong'));
      if (lastSubmittedTargetTeamId) {
        updateRowFeedback(lastSubmittedTargetTeamId, 'wrong', t('wrong', 'Wrong'));
      }
      lastSubmittedTargetTeamId = '';
    }
  });

  ws.onAck((ack) => {
    if (ack.command === 'code_conspiracy.team.bootstrap') {
      applyBootstrapState(ack.payload || {});
      return;
    }

    if (ack.command === 'code_conspiracy.code.submit') {
      const isCorrect = Boolean(ack.payload?.correct);
      const targetTeamId = String(ack.payload?.targetTeamId || lastSubmittedTargetTeamId || '');
      const message = isCorrect ? t('correct', 'Correct') : t('wrong', 'Wrong');

      setStatus(message);
      if (targetTeamId) {
        updateRowFeedback(targetTeamId, isCorrect ? 'correct' : 'wrong', message);
      }

      if (isCorrect && targetTeamId && tableEl) {
        const row = tableEl.querySelector(`[data-target-team-id="${CSS.escape(targetTeamId)}"]`);
        if (row instanceof HTMLElement) {
          const input = row.querySelector('[data-cc-code-input]');
          const button = row.querySelector('[data-cc-submit]');
          if (input) {
            const solvedValue = String(input.value || '').trim().toUpperCase();
            input.value = solvedValue;
            input.placeholder = solvedValue;
            input.disabled = true;
            input.dataset.locked = '1';
          }
          if (button) {
            button.disabled = true;
            button.dataset.locked = '1';
          }
        }
      } else if (!isCorrect && targetTeamId && tableEl) {
        const input = tableEl.querySelector(`[data-cc-code-input][data-target-team-id="${CSS.escape(targetTeamId)}"]`);
        if (input instanceof HTMLInputElement) {
          input.value = '';
        }
      }

      lastSubmittedTargetTeamId = '';

    }
  });

  ws.onEvent((event) => {
    if (event.command === 'code_conspiracy.team.updated') {
      const teamUpdate = event.payload?.team || null;
      applyTeamUpdate(teamUpdate);
      updateLeaderboardScore(teamUpdate);

      const winnerTeamId = String(event.payload?.winnerTeamId || '').trim();
      if (winnerTeamId) {
        const winnerName = leaderboardRows.find((entry) => String(entry.id || '') === winnerTeamId)?.name
          || currentTargets.find((entry) => String(entry.id || '') === winnerTeamId)?.name
          || '';
        winnerLocked = true;
        if (winnerName) {
          setStatus(`${t('winner', 'Winner')}: ${winnerName}`);
        }
        setInputsDisabled(true);
      }

      return;
    }

    if (event.command === 'code_conspiracy.self.updated') {
      applySelfUpdate(event.payload || {});
      return;
    }

    if (event.command === 'game.reset') {
      rowFeedbackByTeamId.clear();
      winnerLocked = false;
      stopCooldownTicker();
      setStatus('');
      tableEl?.querySelectorAll('[data-cc-code-input]').forEach((input) => {
        if (!(input instanceof HTMLInputElement)) {
          return;
        }

        input.value = '';
        input.disabled = false;
        input.dataset.locked = '0';
        input.classList.remove('is-correct', 'is-wrong');
      });
      tableEl?.querySelectorAll('[data-cc-submit]').forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) {
          return;
        }

        button.disabled = false;
        button.dataset.locked = '0';
      });
      tableEl?.querySelectorAll('[data-cc-row-feedback]').forEach((feedback) => {
        if (!(feedback instanceof HTMLElement)) {
          return;
        }

        feedback.textContent = '';
        feedback.classList.remove('is-correct', 'is-wrong');
      });
      leaderboardRows = leaderboardRows.map((entry) => ({
        ...entry,
        value: 0,
      }));
      if (leaderboardApi) {
        leaderboardApi.render(leaderboardRows, {
          metricDirection: 'desc',
          metricLabel: 'Points',
        });
      }
      setInputsDisabled(false);
    }
  });

  if (tableEl) {
    tableEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-cc-submit]');
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const targetTeamId = String(button.dataset.targetTeamId || '').trim();
      if (!targetTeamId) {
        return;
      }

      const input = tableEl.querySelector(`[data-cc-code-input][data-target-team-id="${CSS.escape(targetTeamId)}"]`);
      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      const candidateCode = String(input.value || '').trim().toUpperCase();
      if (!candidateCode) {
        return;
      }

      clearRowFeedback(targetTeamId);
      setStatus('');
      lastSubmittedTargetTeamId = targetTeamId;
      ws.send('code_conspiracy.code.submit', {
        targetTeamId,
        candidateCode,
      });
    });

    tableEl.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }

      const input = event.target.closest('[data-cc-code-input]');
      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      event.preventDefault();
      const button = tableEl.querySelector(`[data-cc-submit][data-target-team-id="${CSS.escape(String(input.dataset.targetTeamId || ''))}"]`);
      if (button instanceof HTMLButtonElement) {
        button.click();
      }
    });
  }

  ws.onClose(() => {});
})();
