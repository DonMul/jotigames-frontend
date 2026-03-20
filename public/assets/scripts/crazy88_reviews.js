(() => {
  const root = document.getElementById('crazy88-review-root');
  if (!root) {
    return;
  }

  const listNode = root.querySelector('[data-crazy88-review-list]');
  const subtitleNode = document.querySelector('[data-crazy88-review-subtitle]');
  const pollUrl = root.dataset.pollUrl || '';
  let hasAssignedSubmission = root.dataset.hasAssignedSubmission === '1';
  let wsConnected = false;

  if (!listNode || !pollUrl) {
    return;
  }

  const intervalWhenConnectedMs = 30000;
  const intervalWhenDisconnectedMs = 15000;
  const intervalWithoutAssignmentMs = 5000;
  let currentIntervalMs = null;
  let pollTimer = null;

  const desiredIntervalMs = () => {
    if (!hasAssignedSubmission) {
      return intervalWithoutAssignmentMs;
    }

    return wsConnected ? intervalWhenConnectedMs : intervalWhenDisconnectedMs;
  };

  const ensurePollInterval = () => {
    const next = desiredIntervalMs();
    if (currentIntervalMs === next && pollTimer) {
      return;
    }

    if (pollTimer) {
      window.clearInterval(pollTimer);
    }

    currentIntervalMs = next;
    pollTimer = window.setInterval(poll, next);
  };

  const hasActiveInput = () => {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement)) {
      return false;
    }

    if (!root.contains(activeElement)) {
      return false;
    }

    return activeElement.matches('textarea, input, select');
  };

  const poll = async () => {
    if (hasActiveInput()) {
      return;
    }

    try {
      const response = await fetch(pollUrl, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      if (payload.status !== 'ok') {
        return;
      }

      if (typeof payload.hasAssignedSubmission === 'boolean') {
        hasAssignedSubmission = payload.hasAssignedSubmission;
        root.dataset.hasAssignedSubmission = hasAssignedSubmission ? '1' : '0';
        ensurePollInterval();
      }

      if (typeof payload.html === 'string') {
        listNode.innerHTML = payload.html;
      }

      if (subtitleNode && typeof payload.subtitle === 'string') {
        subtitleNode.textContent = payload.subtitle;
      }
    } catch {
      // Ignore transient polling errors.
    }
  };

  ensurePollInterval();

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
      wsConnected = true;
      ensurePollInterval();
      poll();
    });

    ws.onClose(() => {
      wsConnected = false;
      ensurePollInterval();
    });

    ws.onEvent(() => poll());
    ws.onAck(() => poll());
  }

  poll();
})();
