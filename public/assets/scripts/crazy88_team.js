(() => {
  const root = document.getElementById('crazy88-team');
  if (!root) {
    return;
  }

  const locationUrl = root.dataset.locationUrl;
  const submitUrlTemplate = root.dataset.submitUrlTemplate || '';
  const dashboardUrl = root.dataset.dashboardUrl || '/team';
  const csrfLocation = root.dataset.csrfLocation || '';
  const csrfSubmit = root.dataset.csrfSubmit || '';
  const logoUrl = root.dataset.logoUrl || '';

  let copy = {};
  try {
    copy = JSON.parse(root.dataset.copy || '{}');
  } catch {
    copy = {};
  }

  const scoreNode = root.querySelector('[data-crazy88-score]');
  const statusNode = root.querySelector('[data-crazy88-status]');
  const leaderboard = window.JotiTeamLeaderboard?.create(
    root.querySelector('[data-team-leaderboard]'),
    { currentTeamId: root.dataset.wsTeamId || '' }
  );
  const tasksNode = document.getElementById('crazy88-team-tasks');
  const mapNode = document.getElementById('crazy88-team-map');
  const reviewModal = document.getElementById('crazy88-review-modal');
  const reviewModalMessage = document.getElementById('crazy88-review-modal-message');
  const isGeoLocked = root.dataset.isGeoLocked === '1';

  if (!tasksNode) {
    return;
  }

  let map = null;
  if (isGeoLocked && mapNode && typeof L !== 'undefined') {
    map = L.map(mapNode).setView([51.05, 3.72], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
  }
  const teamIcon = logoUrl
    ? L.icon({
      iconUrl: logoUrl,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      className: 'geo-team-icon',
    })
    : null;

  let teamMarker = null;
  const taskLayers = new Map();
  let wsClient = null;
  let latestLocation = null;
  let locationPushTimer = null;
  let redirectedToDashboard = false;

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const showStatus = (text) => {
    if (statusNode) {
      statusNode.textContent = text || '';
    }
  };

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

  const showReviewModal = (message) => {
    if (!reviewModal || !reviewModalMessage) {
      return;
    }

    reviewModalMessage.textContent = message;
    reviewModal.classList.add('is-open');
    reviewModal.setAttribute('aria-hidden', 'false');
  };

  if (reviewModal) {
    reviewModal.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.modalClose !== undefined) {
        reviewModal.classList.remove('is-open');
        reviewModal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  const renderHistory = (history) => {
    if (!Array.isArray(history) || history.length === 0) {
      return '';
    }

    return history.map((entry) => {
      const proofLink = entry.proofPath
        ? `<p><a href="${escapeHtml(entry.proofPath)}" target="_blank" rel="noopener">${escapeHtml(entry.proofOriginalName || copy.proof_file_default || '')}</a></p>`
        : '';

      const statusLabel = entry.status === 'pending'
        ? (copy.pending || '')
        : entry.status === 'accepted'
          ? (copy.accepted || '')
          : entry.status === 'rejected'
            ? (copy.rejected || '')
            : (entry.status || '');

      const teamBubble = `<article class="crazy88-chat-bubble team"><p class="crazy88-chat-meta">${escapeHtml(entry.submittedAt || '')}</p><p class="crazy88-chat-status">${escapeHtml(statusLabel)}</p>${entry.teamMessage ? `<p>${escapeHtml(entry.teamMessage)}</p>` : ''}${entry.proofText ? `<p>${escapeHtml(entry.proofText)}</p>` : ''}${proofLink}</article>`;

      const judgeBubble = entry.reviewedAt || entry.judgeMessage
        ? `<article class="crazy88-chat-bubble judge"><p class="crazy88-chat-meta">${escapeHtml(entry.reviewedAt || '')}</p>${entry.judgeMessage ? `<p>${escapeHtml(entry.judgeMessage)}</p>` : ''}</article>`
        : '';

      return `${teamBubble}${judgeBubble}`;
    }).join('');
  };

  const renderTasks = (tasks) => {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      tasksNode.innerHTML = `<p class="muted">${copy.no_tasks || ''}</p>`;
      return;
    }

    tasksNode.innerHTML = tasks.map((task) => {
      const distanceText = typeof task.distance === 'number'
        ? `<p class="muted">${escapeHtml(copy.distance || '')}: ${Math.round(task.distance)}m</p>`
        : '';

      const isSubmitAllowed = !!task.canSubmit;
      const disabled = isSubmitAllowed ? '' : 'disabled';
      const latestStatus = task.latestStatus || '';
      const isApproved = latestStatus === 'accepted';
      const isPending = latestStatus === 'pending';
      const isHistoryCollapsedByDefault = latestStatus === 'accepted' || latestStatus === 'rejected';

      const pendingState = isPending
        ? `<p class="muted">${escapeHtml(copy.pending_exists || '')}</p>`
        : '';

      const approvedState = isApproved
        ? `<div class="geo-card"><p><strong>${escapeHtml(copy.accepted || '')}</strong></p>${task.latestJudgeMessage ? `<p>${escapeHtml(task.latestJudgeMessage)}</p>` : `<p class="muted">${escapeHtml(copy.no_review_message || '')}</p>`}</div>`
        : '';

      const formHtml = isSubmitAllowed
        ? `<form class="crazy88-submit-form" data-task-submit="${escapeHtml(task.id)}" data-can-submit="1">
          <label>${escapeHtml(copy.message_label || '')}<textarea name="team_message" rows="2" ${disabled}></textarea></label>
          <label>${escapeHtml(copy.text_proof_label || '')}<textarea name="proof_text" rows="2" ${disabled}></textarea></label>
          <label>${escapeHtml(copy.file_label || '')}<input type="file" name="proof_file" ${disabled}></label>
          <button class="btn btn-primary btn-small" type="submit" ${disabled}>${escapeHtml(copy.submit || '')}</button>
        </form>`
        : '';

      const historyHtml = renderHistory(task.history);
      const historySection = historyHtml
        ? `<details class="crazy88-history" ${isHistoryCollapsedByDefault ? '' : 'open'}>
          <summary><strong>${escapeHtml(copy.history_title || '')}</strong></summary>
          <div class="crazy88-chat">${historyHtml}</div>
        </details>`
        : `<p class="muted">${escapeHtml(copy.history_title || '')}: -</p>`;

      return `<article class="geo-card crazy88-task-card" data-task-id="${escapeHtml(task.id)}">
        <h3>${escapeHtml(task.title)}</h3>
        <p>${escapeHtml(task.description || '')}</p>
        <p><strong>+${escapeHtml(task.points)} ${escapeHtml(copy.points || '')}</strong></p>
        ${distanceText}
        ${pendingState}
        ${approvedState}
        ${formHtml}
        ${historySection}
      </article>`;
    }).join('');

    tasksNode.querySelectorAll('[data-task-submit]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (form.getAttribute('data-can-submit') !== '1') {
          showStatus(copy.pending_exists || '');
          return;
        }

        const taskId = form.getAttribute('data-task-submit');
        if (!taskId || !submitUrlTemplate) {
          return;
        }

        const formData = new FormData(form);

        try {
          const response = await fetch(submitUrlTemplate.replace('TASK_ID', taskId), {
            method: 'POST',
            headers: {
              'X-CSRF-Token': csrfSubmit,
            },
            body: formData,
            credentials: 'same-origin',
          });

          const payload = await response.json().catch(() => ({ status: 'error' }));
          if (!response.ok) {
            const status = payload.status || 'error';
            if (statusNode) {
              statusNode.textContent = copy[status] || copy.upload_failed || '';
            }
            return;
          }

          form.reset();
          requestSnapshot();
        } catch {
          if (statusNode) {
            statusNode.textContent = copy.upload_failed || '';
          }
        }
      });
    });
  };

  const updateMap = (tasks) => {
    if (!map) {
      return;
    }

    const taskIds = new Set((tasks || []).map((task) => task.id));
    taskLayers.forEach((layerGroup, id) => {
      if (!taskIds.has(id)) {
        map.removeLayer(layerGroup);
        taskLayers.delete(id);
      }
    });

    (tasks || []).forEach((task) => {
      if (typeof task.latitude !== 'number' || typeof task.longitude !== 'number') {
        return;
      }

      if (taskLayers.has(task.id)) {
        return;
      }

      const circle = L.circle([task.latitude, task.longitude], {
        radius: task.radius || 25,
        color: '#7c3aed',
        fillColor: '#7c3aed',
        fillOpacity: 0.12,
      });
      const marker = L.marker([task.latitude, task.longitude]).bindPopup(`<strong>${escapeHtml(task.title)}</strong><br>+${escapeHtml(task.points)} ${escapeHtml(copy.points || '')}`);
      const group = L.layerGroup([circle, marker]).addTo(map);
      taskLayers.set(task.id, group);
    });
  };

  const renderSnapshot = (payload) => {
    if (!ensureActiveGameWindow(payload)) {
      return;
    }
    if (typeof payload.score === 'number' && scoreNode) {
      scoreNode.textContent = String(payload.score);
    }

    leaderboard?.render(payload.leaderboard || [], {
      metricDirection: payload.leaderboardMetricDirection || 'desc',
    });

    renderTasks(payload.tasks || []);
    updateMap(payload.tasks || []);
  };

  const requestSnapshot = () => {
    if (!wsClient || !wsClient.isOpen()) {
      return;
    }

    if (typeof wsClient.isAuthenticated === 'function' && !wsClient.isAuthenticated()) {
      return;
    }

    wsClient.send('crazy88.team.bootstrap', {});
  };

  const sendLocation = async (latitude, longitude) => {
    if (!isGeoLocked) {
      return;
    }

    if (wsClient && wsClient.isOpen()) {
      wsClient.send('team.location.update', {
        latitude,
        longitude,
        requestNearby: false,
      });
      return;
    }

    if (!locationUrl) {
      return;
    }

    await fetch(locationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfLocation,
        Accept: 'application/json',
      },
      body: JSON.stringify({ latitude, longitude }),
      credentials: 'same-origin',
    }).catch(() => {});
  };

  if (isGeoLocked) {
    if (!navigator.geolocation) {
      showStatus(copy.location_unsupported || '');
      return;
    }

    navigator.geolocation.watchPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        if (map) {
          if (!teamMarker) {
            teamMarker = L.marker([latitude, longitude], teamIcon ? { icon: teamIcon } : undefined).addTo(map);
            map.setView([latitude, longitude], 16);
          } else {
            teamMarker.setLatLng([latitude, longitude]);
            if (teamIcon) {
              teamMarker.setIcon(teamIcon);
            }
          }
        }

        latestLocation = { latitude, longitude };
        showStatus('');
        sendLocation(latitude, longitude);
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
  } else {
    showStatus('');
  }

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

      if (isGeoLocked && latestLocation) {
        sendLocation(latestLocation.latitude, latestLocation.longitude);
      }

      if (isGeoLocked) {
        if (locationPushTimer) {
          window.clearInterval(locationPushTimer);
        }
        locationPushTimer = window.setInterval(() => {
          if (!latestLocation) {
            return;
          }
          sendLocation(latestLocation.latitude, latestLocation.longitude);
        }, 10000);
      }

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

      if (event.command === 'crazy88.review.judged') {
        const payload = event.payload || {};
        const taskLabel = payload.taskNumber
          ? String(copy.task_label_number || '').replace('{number}', String(payload.taskNumber))
          : (payload.taskTitle ? String(payload.taskTitle) : (copy.task_label || ''));

        const introTemplate = copy.review_modal_intro || '';
        const intro = String(introTemplate).replace('{task}', taskLabel);
        const verdictMessage = payload.verdict === 'approved'
          ? (copy.review_modal_approved || '')
          : (copy.review_modal_denied || '');

        showReviewModal(`${intro} ${verdictMessage}`);
      }

      requestSnapshot();
    });
    wsClient.onAck((ack) => {
      if (ack.command === 'crazy88.team.bootstrap') {
        renderSnapshot(ack.payload || {});
        return;
      }

      requestSnapshot();
    });

    wsClient.onError((error) => {
      if (error?.code === 'game_frozen') {
        ensureActiveGameWindow({ gameWindow: error.details?.gameWindow, gameActive: false });
      }
    });
  }

})();
