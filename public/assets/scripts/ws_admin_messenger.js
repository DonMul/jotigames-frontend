(() => {
  const root = document.body;
  if (!root) {
    return;
  }

  if (document.querySelector('[data-ws-admin-messenger="off"]')) {
    return;
  }

  const credentialNodes = Array.from(document.querySelectorAll('[data-ws-game-id]'));
  if (credentialNodes.length === 0) {
    return;
  }

  let gameId = '';
  let adminToken = '';
  for (const node of credentialNodes) {
    if (!gameId && node.dataset.wsGameId) {
      gameId = node.dataset.wsGameId;
    }

    if (!adminToken && node.dataset.wsAdminToken) {
      adminToken = node.dataset.wsAdminToken;
    }

    if (gameId && adminToken) {
      break;
    }
  }

  if (!gameId || !adminToken) {
    return;
  }

  const container = document.createElement('aside');
  container.className = 'ws-admin-messenger';
  root.classList.add('has-ws-admin-messenger');
  const collapseStorageKey = 'joti.wsAdminMessenger.collapsed';
  const collapseLabel = root.dataset.wsLabelCollapse || 'Collapse';
  const expandLabel = root.dataset.wsLabelExpand || 'Expand';
  const isCollapsedByDefault = window.localStorage?.getItem(collapseStorageKey) === '1';

  if (isCollapsedByDefault) {
    container.classList.add('is-collapsed');
  }

  container.innerHTML = `
    <div class="ws-admin-messenger__header">
      <strong>Team message</strong>
      <div class="ws-admin-messenger__header-right">
        <span class="ws-admin-messenger__status ws-admin-messenger__status--muted" data-ws-status>offline</span>
        <button
          class="btn btn-ghost btn-small ws-admin-messenger__toggle"
          data-ws-toggle
          type="button"
          aria-controls="ws-admin-messenger-body"
          aria-expanded="${isCollapsedByDefault ? 'false' : 'true'}"
        >${isCollapsedByDefault ? expandLabel : collapseLabel}</button>
      </div>
    </div>
    <div class="ws-admin-messenger__body" id="ws-admin-messenger-body" data-ws-body>
      <label class="ws-admin-messenger__field">
        <span class="ws-admin-messenger__label">Team</span>
        <select class="ws-admin-messenger__input" data-ws-team></select>
      </label>
      <label class="ws-admin-messenger__field">
        <span class="ws-admin-messenger__label">Message</span>
        <textarea class="ws-admin-messenger__input ws-admin-messenger__message" data-ws-message rows="3"></textarea>
      </label>
      <div class="ws-admin-messenger__actions">
        <button class="btn btn-primary btn-small ws-admin-messenger__send" data-ws-send type="button">Send</button>
        <button class="btn btn-ghost btn-small ws-admin-messenger__refresh" data-ws-refresh type="button">Refresh teams</button>
      </div>
      <p class="ws-admin-messenger__feedback ws-admin-messenger__feedback--muted" data-ws-feedback></p>
    </div>
  `;

  root.appendChild(container);

  const statusNode = container.querySelector('[data-ws-status]');
  const teamSelect = container.querySelector('[data-ws-team]');
  const messageInput = container.querySelector('[data-ws-message]');
  const sendButton = container.querySelector('[data-ws-send]');
  const refreshButton = container.querySelector('[data-ws-refresh]');
  const feedbackNode = container.querySelector('[data-ws-feedback]');
  let toggleButton = container.querySelector('[data-ws-toggle]');
  if (!(toggleButton instanceof HTMLButtonElement)) {
    const headerRight = container.querySelector('.ws-admin-messenger__header-right');
    if (headerRight instanceof HTMLElement) {
      const injectedToggle = document.createElement('button');
      injectedToggle.className = 'btn btn-ghost btn-small ws-admin-messenger__toggle';
      injectedToggle.type = 'button';
      injectedToggle.setAttribute('data-ws-toggle', '');
      injectedToggle.setAttribute('aria-controls', 'ws-admin-messenger-body');
      injectedToggle.setAttribute('aria-expanded', container.classList.contains('is-collapsed') ? 'false' : 'true');
      injectedToggle.textContent = container.classList.contains('is-collapsed') ? expandLabel : collapseLabel;
      headerRight.appendChild(injectedToggle);
      toggleButton = injectedToggle;
    }
  }

  const setCollapsed = (collapsed) => {
    container.classList.toggle('is-collapsed', collapsed);
    if (toggleButton instanceof HTMLButtonElement) {
      toggleButton.textContent = collapsed ? expandLabel : collapseLabel;
      toggleButton.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }

    try {
      window.localStorage?.setItem(collapseStorageKey, collapsed ? '1' : '0');
    } catch (_error) {
    }
  };

  const setToneClass = (node, baseClass, tone) => {
    node.classList.remove(`${baseClass}--muted`, `${baseClass}--success`, `${baseClass}--error`);
    node.classList.add(`${baseClass}--${tone}`);
  };

  const setStatus = (text, tone = 'muted') => {
    statusNode.textContent = text;
    setToneClass(statusNode, 'ws-admin-messenger__status', tone);
  };

  const setFeedback = (text, tone = 'muted') => {
    feedbackNode.textContent = text;
    setToneClass(feedbackNode, 'ws-admin-messenger__feedback', tone);
  };

  let teams = [];

  const renderTeams = () => {
    const current = teamSelect.value;
    teamSelect.innerHTML = teams
      .map((team) => `<option value="${team.id}">${team.name}</option>`)
      .join('');

    if (current && teams.some((team) => team.id === current)) {
      teamSelect.value = current;
    }
  };

  if (!window.JotiWs || !adminToken) {
    teamSelect.disabled = true;
    messageInput.disabled = true;
    sendButton.disabled = true;
    refreshButton.disabled = true;
    setStatus('offline', 'muted');
    setFeedback('Missing admin websocket credentials', 'error');
    return;
  }

  const ws = window.JotiWs.connect({
    role: 'admin',
    gameId,
    adminToken,
    reconnectMs: 3000,
  });

  const requestTeamList = () => {
    if (!ws.isOpen()) {
      return;
    }

    if (typeof ws.isAuthenticated === 'function' && !ws.isAuthenticated()) {
      return;
    }

    ws.send('team.list', {});
  };

  ws.onOpen(() => {
    setStatus('connecting', 'muted');
    setFeedback('Connected to WSS, waiting for admin auth', 'muted');
  });

  ws.onAuthenticated(() => {
    setStatus('online', 'success');
    setFeedback('Authenticated as admin', 'success');
    requestTeamList();
  });

  ws.onClose(() => {
    setStatus('offline', 'muted');
  });

  ws.onError((error) => {
    setFeedback(error?.code ? `Error: ${error.code}` : 'Websocket error', 'error');
    if (error?.code === 'unauthorized' || error?.code === 'admin_token_not_configured_for_game') {
      setStatus('auth failed', 'error');
    }
  });

  ws.onAck((payload) => {
    if (payload.command === 'team.list') {
      teams = Array.isArray(payload.payload?.teams) ? payload.payload.teams : [];
      renderTeams();
      setFeedback(`${teams.length} team(s) loaded`, 'muted');
      return;
    }

    if (payload.command === 'admin.message.team') {
      const delivered = Number(payload.payload?.delivered || 0);
      setFeedback(`Message sent (${delivered} delivered)`, 'success');
    }
  });

  ws.onEvent((event) => {
    if (event.command === 'team.updated' || event.command === 'team.location.updated') {
      requestTeamList();
    }
  });

  refreshButton.addEventListener('click', () => {
    requestTeamList();
  });

  if (toggleButton instanceof HTMLButtonElement) {
    toggleButton.addEventListener('click', () => {
      setCollapsed(!container.classList.contains('is-collapsed'));
    });
  }

  sendButton.addEventListener('click', () => {
    const teamId = (teamSelect.value || '').trim();
    const message = (messageInput.value || '').trim();

    if (!teamId || !message) {
      setFeedback('Select a team and enter a message', 'error');
      return;
    }

    if (!ws.isOpen()) {
      setFeedback('Websocket is offline', 'error');
      return;
    }

    if (typeof ws.isAuthenticated === 'function' && !ws.isAuthenticated()) {
      setFeedback('Websocket is not authenticated yet', 'error');
      return;
    }

    ws.send('admin.message.team', {
      teamId,
      message,
      level: 'info',
    });
    messageInput.value = '';
  });
})();
