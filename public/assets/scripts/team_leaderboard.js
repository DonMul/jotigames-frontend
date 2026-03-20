(() => {
  const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const normalizeAssetBase = (value) => {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }

    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
  };

  const normalizeLogoUrl = (value, assetBase = '') => {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }

    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('/')) {
      const base = normalizeAssetBase(assetBase);
      if (!base || /^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
        return raw;
      }

      return `${base}${raw}`;
    }

    const base = normalizeAssetBase(assetBase);
    if (!base) {
      return `/${raw}`;
    }

    return `${base}/${raw}`;
  };

  let logoModal = null;
  let logoModalImage = null;
  let logoModalTitle = null;
  let logoModalOpen = null;
  let logoModalClose = null;

  const ensureLogoModal = () => {
    if (logoModal instanceof HTMLElement && logoModalImage instanceof HTMLImageElement && logoModalTitle instanceof HTMLElement) {
      return {
        modal: logoModal,
        image: logoModalImage,
        title: logoModalTitle,
        open: logoModalOpen,
        close: logoModalClose,
      };
    }

    const modal = document.createElement('div');
    modal.className = 'modal team-logo-pop-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="modal-backdrop" data-logo-pop-close="1"></div>
      <div class="modal-card modal-card-wide team-logo-pop-modal-card" role="dialog" aria-modal="true" aria-label="Team logo preview">
        <div class="team-logo-pop-modal-header">
          <h3 data-logo-pop-title></h3>
          <button class="btn btn-ghost btn-small" type="button" data-logo-pop-close="1" aria-label="Close">×</button>
        </div>
        <div class="team-logo-pop-modal-body">
          <img class="team-logo-pop-image" data-logo-pop-image alt="">
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const image = modal.querySelector('[data-logo-pop-image]');
    const title = modal.querySelector('[data-logo-pop-title]');
    if (!(image instanceof HTMLImageElement) || !(title instanceof HTMLElement)) {
      modal.remove();
      return null;
    }

    const close = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    };

    const open = (src, name) => {
      const logoName = String(name || '').trim();
      image.src = String(src || '');
      image.alt = logoName;
      title.textContent = logoName;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    };

    modal.addEventListener('click', (event) => {
      const target = event.target;
      const closeTrigger = target instanceof Element ? target.closest('[data-logo-pop-close="1"]') : null;
      if (closeTrigger instanceof HTMLElement) {
        close();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) {
        close();
      }
    });

    logoModal = modal;
    logoModalImage = image;
    logoModalTitle = title;
    logoModalOpen = open;
    logoModalClose = close;

    return {
      modal,
      image,
      title,
      open,
      close,
    };
  };

  const openLogoModal = (src, name) => {
    const normalizedSrc = String(src || '').trim();
    if (!normalizedSrc) {
      return;
    }

    const modalApi = ensureLogoModal();
    if (!modalApi || typeof modalApi.open !== 'function') {
      return;
    }

    modalApi.open(normalizedSrc, name);
  };

  const computeRankedRows = (rows, metricDirection, assetBase = '') => {
    const normalizedRows = Array.isArray(rows) ? rows.map((row, index) => ({
      id: String(row?.id || ''),
      name: String(row?.name || ''),
      logoPath: normalizeLogoUrl(row?.logoPath, assetBase),
      value: toNumber(row?.value ?? row?.score ?? row?.points ?? row?.lives ?? row?.markerCount ?? row?.money, 0),
      originalIndex: index,
    })).filter((row) => row.id && row.name) : [];

    normalizedRows.sort((left, right) => {
      if (left.value !== right.value) {
        return metricDirection === 'asc' ? left.value - right.value : right.value - left.value;
      }

      const nameDiff = left.name.localeCompare(right.name);
      if (nameDiff !== 0) {
        return nameDiff;
      }

      return left.originalIndex - right.originalIndex;
    });

    return normalizedRows.map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
  };

  const animateReorder = (container) => {
    const elements = Array.from(container.querySelectorAll('[data-leaderboard-team-id]'));
    const previousPositions = new Map(elements.map((element) => [
      element.dataset.leaderboardTeamId,
      element.getBoundingClientRect(),
    ]));

    return (nextElements) => {
      nextElements.forEach((element) => {
        const teamId = element.dataset.leaderboardTeamId;
        const before = previousPositions.get(teamId);
        if (!before) {
          element.classList.add('team-leaderboard-item--entering');
          window.requestAnimationFrame(() => {
            element.classList.remove('team-leaderboard-item--entering');
          });
          return;
        }

        const after = element.getBoundingClientRect();
        const deltaY = before.top - after.top;
        if (Math.abs(deltaY) > 1) {
          element.style.transition = 'none';
          element.style.transform = `translateY(${deltaY}px)`;
          window.requestAnimationFrame(() => {
            element.style.transition = 'transform 260ms ease';
            element.style.transform = 'translateY(0)';
            window.setTimeout(() => {
              element.style.transition = '';
            }, 280);
          });
        }
      });
    };
  };

  const create = (container, options = {}) => {
    if (!(container instanceof HTMLElement)) {
      return null;
    }

    const currentTeamId = String(options.currentTeamId || '').trim();
    const assetBase = String(options.assetBase || '').trim();
    const titleNode = container.querySelector('[data-team-leaderboard-title]');
    const listNode = container.querySelector('[data-team-leaderboard-list]');
    const emptyNode = container.querySelector('[data-team-leaderboard-empty]');
    const metricNode = container.querySelector('[data-team-leaderboard-metric]');
    if (!listNode) {
      return null;
    }

    const render = (rows, settings = {}) => {
      const metricDirection = settings.metricDirection === 'asc' ? 'asc' : 'desc';
      const rankedRows = computeRankedRows(rows, metricDirection, assetBase);

      if (titleNode && typeof settings.title === 'string' && settings.title.trim() !== '') {
        titleNode.textContent = settings.title;
      }

      if (metricNode && typeof settings.metricLabel === 'string') {
        metricNode.textContent = settings.metricLabel;
      }

      if (rankedRows.length === 0) {
        listNode.innerHTML = '';
        if (emptyNode) {
          emptyNode.classList.remove('is-hidden');
        }
        return;
      }

      if (emptyNode) {
        emptyNode.classList.add('is-hidden');
      }

      const applyAnimation = animateReorder(listNode);
      listNode.innerHTML = rankedRows.map((row) => {
        const isCurrentTeam = currentTeamId !== '' && row.id === currentTeamId;
        const rankDisplay = `#${row.rank}`;
        const avatarMarkup = row.logoPath
          ? `<button class="team-leaderboard-avatar team-leaderboard-avatar-button" type="button" data-leaderboard-logo-src="${escapeHtml(row.logoPath)}" data-leaderboard-logo-name="${escapeHtml(row.name)}" aria-label="Open ${escapeHtml(row.name)} logo"><img src="${escapeHtml(row.logoPath)}" alt="${escapeHtml(row.name)}"></button>`
          : '<span class="team-leaderboard-avatar"></span>';

        return `<div class="team-leaderboard-item${isCurrentTeam ? ' is-current-team' : ''}" data-leaderboard-team-id="${escapeHtml(row.id)}">
          <span class="team-leaderboard-rank">${escapeHtml(rankDisplay)}</span>
          ${avatarMarkup}
          <span class="team-leaderboard-name">${escapeHtml(row.name)}</span>
          <span class="team-leaderboard-value">${escapeHtml(row.value)}</span>
        </div>`;
      }).join('');

      applyAnimation(Array.from(listNode.querySelectorAll('[data-leaderboard-team-id]')));
    };

    listNode.addEventListener('click', (event) => {
      const target = event.target;
      const trigger = target instanceof Element ? target.closest('[data-leaderboard-logo-src]') : null;
      if (!(trigger instanceof HTMLElement)) {
        return;
      }

      const src = String(trigger.getAttribute('data-leaderboard-logo-src') || '').trim();
      const name = String(trigger.getAttribute('data-leaderboard-logo-name') || '').trim();
      if (!src) {
        return;
      }

      openLogoModal(src, name);
    });

    return { render };
  };

  window.JotiTeamLeaderboard = {
    create,
  };
})();
