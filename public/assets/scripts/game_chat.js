(() => {
  const MAX_LENGTH = 512;
  const MAX_RENDERED = 256;

  const state = {
    initialized: false,
    expanded: false,
    unread: 0,
    sessionId: '',
    gameId: '',
    ws: null,
    messagesById: new Map(),
    els: {},
    copy: {
      title: 'Chat',
      placeholder: 'Type a message for this team',
      send: 'Send',
      open: 'Team',
      close: 'Close',
      adminLabel: 'Admin',
    },
    role: 'team',
    selfTeamId: '',
  };

  const getBodyCopy = () => {
    const body = document.body;
    if (!body) {
      return state.copy;
    }

    return {
      title: String(body.dataset.chatTitle || state.copy.title),
      placeholder: String(body.dataset.chatPlaceholder || state.copy.placeholder),
      send: String(body.dataset.chatSend || state.copy.send),
      open: String(body.dataset.chatOpen || state.copy.open),
      close: String(body.dataset.chatClose || state.copy.close),
      adminLabel: String(body.dataset.chatAdminLabel || state.copy.adminLabel),
    };
  };

  const toAssetUrl = (path) => {
    const raw = String(path || '').trim();
    if (!raw) {
      return '';
    }

    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }

    if (raw.startsWith('/')) {
      return raw;
    }

    return `/${raw}`;
  };

  const formatTime = (isoValue) => {
    const value = String(isoValue || '').trim();
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const updateUnreadBadge = () => {
    const badge = state.els.badge;
    if (!(badge instanceof HTMLElement)) {
      return;
    }

    if (state.unread <= 0) {
      badge.hidden = true;
      badge.classList.add('is-hidden');
      badge.textContent = '';
      return;
    }

    badge.hidden = false;
    badge.classList.remove('is-hidden');
    badge.textContent = state.unread > 99 ? '99+' : String(state.unread);
  };

  const setExpanded = (expanded) => {
    state.expanded = expanded;

    const panel = state.els.panel;
    const toggle = state.els.toggle;
    if (panel instanceof HTMLElement) {
      panel.classList.toggle('is-open', expanded);
      panel.setAttribute('aria-hidden', expanded ? 'false' : 'true');
    }

    if (toggle instanceof HTMLButtonElement) {
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      toggle.setAttribute('aria-label', expanded ? state.copy.close : state.copy.open);
    }

    if (expanded) {
      state.unread = 0;
      updateUnreadBadge();
      window.setTimeout(() => {
        state.els.input?.focus();
      }, 60);
    }
  };

  const buildMessageNode = (message) => {
    const item = document.createElement('li');
    const isOwn = isOwnMessage(message);
    const isAdmin = String(message?.authorRole || '') === 'admin';
    item.className = `game-chat-message ${isOwn ? 'is-self' : 'is-other'}${isAdmin ? ' is-admin' : ''}`;

    const avatar = document.createElement('div');
    avatar.className = 'game-chat-avatar';

    const logoPath = toAssetUrl(message.authorLogoPath);
    if (logoPath) {
      const img = document.createElement('img');
      img.src = logoPath;
      img.alt = String(message.authorLabel || '');
      avatar.appendChild(img);
    } else {
      avatar.textContent = String((message.authorLabel || '?').charAt(0) || '?').toUpperCase();
    }

    const bubbleWrap = document.createElement('div');
    bubbleWrap.className = 'game-chat-bubble-wrap';

    const nameRow = document.createElement('div');
    nameRow.className = 'game-chat-name-row';

    const name = document.createElement('p');
    name.className = 'game-chat-name';
    name.textContent = String(message.authorLabel || '');

    nameRow.appendChild(name);
    if (isAdmin) {
      const adminBadge = document.createElement('span');
      adminBadge.className = 'game-chat-admin-badge';
      adminBadge.textContent = state.copy.adminLabel;
      nameRow.appendChild(adminBadge);
    }

    const bubble = document.createElement('div');
    bubble.className = 'game-chat-bubble';
    bubble.textContent = String(message.message || '');

    const meta = document.createElement('p');
    meta.className = 'game-chat-meta';
    meta.textContent = formatTime(message.sentAt);

    bubbleWrap.appendChild(nameRow);
    bubbleWrap.appendChild(bubble);
    bubbleWrap.appendChild(meta);

    if (isOwn) {
      item.appendChild(bubbleWrap);
      item.appendChild(avatar);
    } else {
      item.appendChild(avatar);
      item.appendChild(bubbleWrap);
    }

    return item;
  };

  const isOwnMessage = (message) => {
    if (String(message?.authorRole || '') === 'team' && state.role === 'team') {
      return String(message?.authorTeamId || '') === state.selfTeamId;
    }

    return String(message?.authorSessionId || '') === state.sessionId;
  };

  const rerenderMessages = () => {
    const list = state.els.list;
    if (!(list instanceof HTMLElement)) {
      return;
    }

    list.innerHTML = '';
    const messages = Array.from(state.messagesById.values());
    messages.slice(-MAX_RENDERED).forEach((message) => {
      list.appendChild(buildMessageNode(message));
    });

    list.scrollTop = list.scrollHeight;
  };

  const putMessage = (message, { countUnread = false } = {}) => {
    const id = String(message?.id || '').trim();
    if (!id) {
      return;
    }

    state.messagesById.set(id, message);
    if (state.messagesById.size > MAX_RENDERED) {
      const firstKey = state.messagesById.keys().next().value;
      if (firstKey) {
        state.messagesById.delete(firstKey);
      }
    }

    if (countUnread && !state.expanded && !isOwnMessage(message)) {
      state.unread += 1;
      updateUnreadBadge();
    }

    rerenderMessages();
  };

  const sendMessage = () => {
    const input = state.els.input;
    if (!(input instanceof HTMLTextAreaElement)) {
      return;
    }

    const value = String(input.value || '').trim();
    if (!value) {
      return;
    }

    if (value.length > MAX_LENGTH) {
      return;
    }

    state.ws?.send('game.chat.send', { message: value });
    input.value = '';
  };

  const ensureUi = () => {
    if (state.initialized || !document.body) {
      return;
    }

    state.copy = getBodyCopy();

    const root = document.createElement('div');
    root.className = 'game-chat-root';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'game-chat-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', state.copy.open);
    toggle.textContent = '💬';

    const badge = document.createElement('span');
    badge.className = 'game-chat-unread';
    badge.hidden = true;
    badge.classList.add('is-hidden');
    toggle.appendChild(badge);

    const panel = document.createElement('aside');
    panel.className = 'game-chat-panel';
    panel.setAttribute('aria-hidden', 'true');

    const head = document.createElement('div');
    head.className = 'game-chat-head';

    const title = document.createElement('h2');
    title.textContent = state.copy.title;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn btn-ghost btn-small';
    closeBtn.textContent = state.copy.close;

    head.appendChild(title);
    head.appendChild(closeBtn);

    const list = document.createElement('ul');
    list.className = 'game-chat-list';

    const composer = document.createElement('form');
    composer.className = 'game-chat-composer';

    const input = document.createElement('textarea');
    input.maxLength = MAX_LENGTH;
    input.placeholder = state.copy.placeholder;
    input.rows = 2;

    const send = document.createElement('button');
    send.type = 'submit';
    send.className = 'btn btn-primary btn-small';
    send.textContent = state.copy.send;

    composer.appendChild(input);
    composer.appendChild(send);

    panel.appendChild(head);
    panel.appendChild(list);
    panel.appendChild(composer);

    root.appendChild(toggle);
    root.appendChild(panel);

    document.body.appendChild(root);

    toggle.addEventListener('click', () => setExpanded(!state.expanded));
    closeBtn.addEventListener('click', () => setExpanded(false));
    composer.addEventListener('submit', (event) => {
      event.preventDefault();
      sendMessage();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.shiftKey) {
        return;
      }

      event.preventDefault();
      sendMessage();
    });

    state.els = { root, toggle, badge, panel, list, input };
    state.initialized = true;
  };

  const bindConnection = (ws, options) => {
    if (!ws || (options?.role !== 'team' && options?.role !== 'admin')) {
      return;
    }

    ws.onAuthenticated((ack) => {
      if (!ack || !ack.command) {
        return;
      }

      if (ack.command === 'team.register') {
        const team = ack.payload?.team || null;
        state.gameId = String(team?.gameId || '');
        state.role = 'team';
        state.selfTeamId = String(team?.id || '');
      }

      if (ack.command === 'admin.register') {
        state.gameId = String(ack.payload?.game?.id || options?.gameId || '');
        state.role = 'admin';
        state.selfTeamId = '';
      }

      state.sessionId = String(ack.payload?.sessionId || '');
      state.ws = ws;

      if (!state.gameId) {
        return;
      }

      ensureUi();
      ws.send('game.chat.history', {});
    });

    ws.onAck((ack) => {
      if (ack?.command !== 'game.chat.history') {
        return;
      }

      const ackGameId = String(ack?.payload?.gameId || '');
      if (!ackGameId || ackGameId !== state.gameId) {
        return;
      }

      const rows = Array.isArray(ack?.payload?.messages) ? ack.payload.messages : [];
      rows.forEach((message) => putMessage(message, { countUnread: false }));
      rerenderMessages();
    });

    ws.onEvent((event) => {
      if (String(event?.command || '') !== 'game.chat.message') {
        return;
      }

      const payload = event?.payload || {};
      const eventGameId = String(payload?.gameId || '');
      if (!eventGameId || eventGameId !== state.gameId) {
        return;
      }

      putMessage(payload, { countUnread: true });
    });
  };

  const registerPlugin = () => {
    if (!window.JotiWs || typeof window.JotiWs.registerConnectionPlugin !== 'function') {
      return;
    }

    window.JotiWs.registerConnectionPlugin((connection, options) => {
      bindConnection(connection, options);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerPlugin);
  } else {
    registerPlugin();
  }
})();
