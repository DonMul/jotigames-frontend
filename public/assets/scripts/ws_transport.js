(() => {
  const connectionPlugins = [];

  const resolveAppEnv = () => {
    const fromBody = String(document.body?.dataset?.appEnv || '').trim();
    if (fromBody) {
      return fromBody;
    }

    const fromMeta = String(document.querySelector('meta[name="app-env"]')?.getAttribute('content') || '').trim();
    const resolved = fromMeta || 'prod';

    if (document.body) {
      document.body.dataset.appEnv = resolved;
    }

    return resolved;
  };

  const toWsUrl = () => {
    const appEnv = resolveAppEnv();
    if (appEnv === 'dev') {
      return 'ws://localhost:8081/ws/';
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/`;
  };

  const safeParse = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const hasDevQueryFlag = () => {
    try {
      const params = new URLSearchParams(window.location.search || '');
      if (!params.has('dev')) {
        return false;
      }

      const value = String(params.get('dev') || '').trim().toLowerCase();
      if (value === '' || value === '1' || value === 'true' || value === 'yes' || value === 'on') {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  const createConnection = (options) => {
    const wsUrl = options.url || toWsUrl();
    const appEnv = resolveAppEnv();
    const isDevEnvironment = appEnv === 'dev';
    const forceDevLogging = hasDevQueryFlag();
    const shouldLogTraffic = isDevEnvironment || forceDevLogging;
    const reconnectMs = Number(options.reconnectMs || 3000);
    const requiresAuthentication = options.role === 'team' || options.role === 'admin';
    const registrationCommand = options.role === 'team'
      ? 'team.register'
      : (options.role === 'admin' ? 'admin.register' : null);
    const connectionContext = {
      role: options.role || 'unknown',
      gameId: options.gameId || null,
      teamId: options.teamId || null,
      url: wsUrl,
    };
    let socket = null;
    let shouldReconnect = true;
    let reconnectTimer = null;
    let isAuthenticated = !requiresAuthentication;
    const pendingCommands = [];
    const maxPendingCommands = 200;
    const maxUnauthenticatedRetries = 3;
    let activeRecovery = null;
    let registrationInFlight = false;
    const lastSentByCommand = new Map();

    const listeners = {
      open: [],
      authenticated: [],
      close: [],
      event: [],
      ack: [],
      error: [],
      message: [],
    };

    const logError = (message, details = {}) => {
      console.error('[JotiWs] ' + message, {
        ...connectionContext,
        ...details,
      });
    };

    const logWarn = (message, details = {}) => {
      console.warn('[JotiWs] ' + message, {
        ...connectionContext,
        ...details,
      });
    };

    const logTraffic = (direction, data) => {
      if (!shouldLogTraffic) {
        return;
      }

      console.log(`[JotiWs][${direction}]`, {
        ...connectionContext,
        data,
      });
    };

    const emit = (type, payload) => {
      for (const callback of listeners[type] || []) {
        try {
          callback(payload);
        } catch (error) {
          logError('Listener callback failed', {
            eventType: type,
            listenerError: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };

    const showAuthenticationFailureModal = () => {
      const message = String(document.body?.dataset?.wsAuthFailedMessage || '').trim();
      if (!message) {
        return;
      }

      if (window.JotiTeamMessageModal?.show) {
        window.JotiTeamMessageModal.show(message);
        return;
      }

      window.alert(message);
    };

    const sendRaw = (command, payload = {}) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        logWarn('Send skipped because socket is not open', {
          command,
          readyState: socket ? socket.readyState : null,
        });
        return false;
      }

      if (registrationCommand && command !== registrationCommand) {
        lastSentByCommand.set(command, { payload });
      }

      logTraffic('out', { command, payload });
      socket.send(JSON.stringify({ command, payload }));
      return true;
    };

    const clearActiveRecovery = () => {
      activeRecovery = null;
      registrationInFlight = false;
    };

    const triggerReauthentication = () => {
      if (!registrationCommand || registrationInFlight || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }

      registrationInFlight = true;
      register();
    };

    const attemptRecovery = () => {
      if (!activeRecovery) {
        return;
      }

      if (activeRecovery.attempts >= maxUnauthenticatedRetries) {
        const exhausted = {
          code: 'unauthenticated_exhausted',
          command: activeRecovery.command,
        };
        clearActiveRecovery();
        showAuthenticationFailureModal();
        emit('error', exhausted);
        return;
      }

      activeRecovery.attempts += 1;
      triggerReauthentication();
    };

    const handleUnauthenticatedError = (command) => {
      if (!registrationCommand) {
        return;
      }

      if (command === registrationCommand) {
        attemptRecovery();
        return;
      }

      const fallback = lastSentByCommand.get(command);
      const payload = fallback ? fallback.payload : {};

      if (!activeRecovery || activeRecovery.command !== command) {
        activeRecovery = {
          command,
          payload,
          attempts: 0,
        };
      }

      isAuthenticated = false;
      attemptRecovery();
    };

    const enqueueCommand = (command, payload = {}) => {
      if (pendingCommands.length >= maxPendingCommands) {
        pendingCommands.shift();
      }

      pendingCommands.push({ command, payload });
    };

    const flushPendingCommands = () => {
      if (!isAuthenticated || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }

      while (pendingCommands.length > 0) {
        const item = pendingCommands.shift();
        if (!item) {
          continue;
        }

        sendRaw(item.command, item.payload);
      }
    };

    const send = (command, payload = {}) => {
      if (requiresAuthentication && registrationCommand && command !== registrationCommand && !isAuthenticated) {
        enqueueCommand(command, payload);
        return true;
      }

      return sendRaw(command, payload);
    };

    const register = () => {
      if (options.role === 'team') {
        if (!options.teamId || !options.teamCode) {
          logError('Missing team websocket credentials');
          emit('error', { code: 'missing_team_credentials' });
          registrationInFlight = false;
          return;
        }

        send('team.register', {
          teamId: options.teamId,
          teamCode: options.teamCode,
        });
        return;
      }

      if (options.role === 'admin') {
        if (!options.gameId || !options.adminToken) {
          logError('Missing admin websocket credentials');
          emit('error', { code: 'missing_admin_credentials' });
          registrationInFlight = false;
          return;
        }

        send('admin.register', {
          gameId: options.gameId,
          adminToken: options.adminToken,
        });
      }
    };

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);
      } catch (error) {
        logError('WebSocket construction failed', {
          connectionError: error instanceof Error ? error.message : String(error),
        });
        emit('error', {
          code: 'socket_open_failed',
          message: error instanceof Error ? error.message : String(error),
        });

        if (shouldReconnect) {
          reconnectTimer = window.setTimeout(connect, reconnectMs);
        }
        return;
      }

      socket.addEventListener('open', () => {
        logTraffic('state', { event: 'open' });
        isAuthenticated = !requiresAuthentication;
        registrationInFlight = false;
        emit('open');
        register();
        flushPendingCommands();
      });

      socket.addEventListener('message', (event) => {
        logTraffic('in', event.data);
        const payload = safeParse(event.data);
        if (!payload || typeof payload !== 'object') {
          logError('Received malformed websocket payload', {
            raw: typeof event.data === 'string' ? event.data : '[binary payload]',
          });
          emit('error', { code: 'invalid_message_payload' });
          return;
        }

        emit('message', payload);

        if (payload.type === 'event') {
          emit('event', payload);
          return;
        }

        if (payload.type === 'ack') {
          if (requiresAuthentication && registrationCommand && payload.command === registrationCommand) {
            isAuthenticated = true;
            registrationInFlight = false;
            emit('authenticated', payload);
            if (activeRecovery) {
              const replay = activeRecovery;
              sendRaw(replay.command, replay.payload || {});
            }
            flushPendingCommands();
          } else if (activeRecovery && payload.command === activeRecovery.command) {
            clearActiveRecovery();
          }

          emit('ack', payload);
          return;
        }

        if (payload.type === 'error') {
          if (requiresAuthentication && registrationCommand && payload.command === registrationCommand) {
            isAuthenticated = false;
            registrationInFlight = false;
          }

          if (payload?.error?.code === 'unauthenticated') {
            handleUnauthenticatedError(payload.command);
          }

          logError('Server returned websocket error', {
            serverError: payload.error || payload,
          });
          emit('error', payload.error || payload);
        }
      });

      socket.addEventListener('close', (event) => {
        logTraffic('state', {
          event: 'close',
          code: event.code,
          reason: event.reason || '',
          wasClean: event.wasClean,
        });
        isAuthenticated = !requiresAuthentication ? true : false;
        registrationInFlight = false;
        emit('close', event);

        logWarn('WebSocket connection closed', {
          code: event.code,
          reason: event.reason || '',
          wasClean: event.wasClean,
          willReconnect: shouldReconnect,
          reconnectMs: shouldReconnect ? reconnectMs : null,
        });

        if (shouldReconnect) {
          reconnectTimer = window.setTimeout(connect, reconnectMs);
        }
      });

      socket.addEventListener('error', (event) => {
        logTraffic('state', {
          event: 'error',
          type: event?.type || 'error',
        });
        logError('WebSocket transport error', {
          eventType: event?.type || 'error',
        });
        emit('error', { code: 'socket_error' });
      });
    };

    connect();

    const api = {
      send,
      close() {
        shouldReconnect = false;
        if (reconnectTimer) {
          window.clearTimeout(reconnectTimer);
        }
        if (socket) {
          socket.close();
        }
      },
      isOpen() {
        return Boolean(socket && socket.readyState === WebSocket.OPEN);
      },
      isAuthenticated() {
        return isAuthenticated;
      },
      onOpen(callback) {
        listeners.open.push(callback);
      },
      onAuthenticated(callback) {
        listeners.authenticated.push(callback);
      },
      onClose(callback) {
        listeners.close.push(callback);
      },
      onEvent(callback) {
        listeners.event.push(callback);
      },
      onAck(callback) {
        listeners.ack.push(callback);
      },
      onError(callback) {
        listeners.error.push(callback);
      },
      onMessage(callback) {
        listeners.message.push(callback);
      },
    };

    for (const plugin of connectionPlugins) {
      try {
        plugin(api, options);
      } catch (error) {
        console.error('[JotiWs] Connection plugin failed', {
          role: options?.role || 'unknown',
          pluginError: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return api;
  };

  window.JotiWs = {
    connect: createConnection,
    toWsUrl,
    registerConnectionPlugin(plugin) {
      if (typeof plugin !== 'function') {
        return;
      }

      connectionPlugins.push(plugin);
    },
  };
})();
