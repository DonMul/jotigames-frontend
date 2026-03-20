(() => {
  const root = document.getElementById('code-conspiracy-overview');
  if (!root) {
    return;
  }

  let copy = {};
  let teamLoginMeta = {};
  try {
    copy = JSON.parse(root.dataset.copy || '{}');
  } catch (_) {
    copy = {};
  }

  try {
    teamLoginMeta = JSON.parse(root.dataset.teamLoginMeta || '{}');
  } catch (_) {
    teamLoginMeta = {};
  }

  const t = (key, fallback = '') => String(copy[key] || fallback);
  const teamsEl = document.getElementById('code-conspiracy-admin-teams');
  const logEl = document.getElementById('code-conspiracy-admin-log');
  const teamsById = new Map();
  let submissions = [];

  const loginAsMarkup = (teamId) => {
    const meta = teamLoginMeta[String(teamId)] || teamLoginMeta[teamId] || null;
    if (!meta || !meta.url || !meta.token) {
      return '';
    }

    return `<form method="post" action="${meta.url}" target="_blank" rel="noopener noreferrer"><input type="hidden" name="_token" value="${meta.token}"><button class="btn btn-ghost btn-small" type="submit">${root.dataset.loginAsLabel || 'Login as team'}</button></form>`;
  };

  const renderTeams = () => {
    if (!teamsEl) {
      return;
    }

    const rows = [...teamsById.values()]
      .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))
      .map((team) => {
        const secretCode = String(team.secretCode || team.secret_code || '').trim();
        return `<tr>
        <td>${String(team.name || '')}</td>
        <td class="text-center">${Number(team.score || 0)}</td>
        <td><code>${secretCode || '—'}</code></td>
        <td class="table-actions-inline">${loginAsMarkup(team.id)}</td>
      </tr>`;
      })
      .join('');

    if (!rows) {
      teamsEl.innerHTML = '<p>—</p>';
      return;
    }

    teamsEl.innerHTML = `<table class="admin-table"><thead><tr><th>${t('team', 'Team')}</th><th>${t('points', 'Points')}</th><th>${t('code', 'Code')}</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  };

  const renderLog = () => {
    if (!logEl) {
      return;
    }

    const rows = submissions.map((entry) => {
      const status = entry.correct ? t('correct', 'Correct') : t('wrong', 'Wrong');
      return `<div class="score-row"><span>${String(entry.when || '')} · ${String(entry.submitter || '')} → ${String(entry.target || '')}</span><strong>${status}</strong></div>`;
    }).join('');

    logEl.innerHTML = rows || `<p>${t('no_submissions', 'No submissions yet')}</p>`;
  };

  const requestBootstrap = (wsClient) => {
    if (!wsClient || !wsClient.isOpen()) {
      return;
    }

    if (typeof wsClient.isAuthenticated === 'function' && !wsClient.isAuthenticated()) {
      return;
    }

    wsClient.send('code_conspiracy.overview.bootstrap', {});
  };

  if (!window.JotiWs || !root.dataset.wsGameId || !root.dataset.wsAdminToken) {
    return;
  }

  const ws = window.JotiWs.connect({
    role: 'admin',
    gameId: root.dataset.wsGameId,
    adminToken: root.dataset.wsAdminToken,
    reconnectMs: 3000,
  });

  const applyBootstrap = (payload) => {
    teamsById.clear();
    (payload?.teams || []).forEach((team) => {
      if (!team || !team.id) {
        return;
      }

      teamsById.set(String(team.id), team);
    });

    submissions = Array.isArray(payload?.submissions) ? payload.submissions : [];
    renderTeams();
    renderLog();
  };

  ws.onOpen(() => {});
  ws.onAuthenticated(() => requestBootstrap(ws));
  ws.onAck((ack) => {
    if (ack.command !== 'code_conspiracy.overview.bootstrap') {
      return;
    }

    applyBootstrap(ack.payload || {});
  });

  ws.onEvent((event) => {
    if (event.command === 'code_conspiracy.team.updated') {
      const team = event.payload?.team || null;
      if (team?.id) {
        const key = String(team.id);
        const existing = teamsById.get(key) || {};
        teamsById.set(key, {
          ...existing,
          ...team,
        });
        renderTeams();
      }
      return;
    }

    if (event.command === 'code_conspiracy.submission.recorded') {
      submissions = [event.payload || {}, ...submissions].slice(0, 250);
      renderLog();
      return;
    }

    if (event.command === 'game.reset') {
      submissions = [];
      teamsById.forEach((team, key) => {
        teamsById.set(key, {
          ...team,
          score: 0,
        });
      });
      renderTeams();
      renderLog();
    }
  });

  ws.onClose(() => {
  });
})();
