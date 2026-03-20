(() => {
  const modal = document.getElementById('team-message-modal');
  const body = document.getElementById('team-message-body');
  if (!modal || !body) {
    return;
  }

  const open = () => {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  };

  const close = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  };

  const show = (message) => {
    const text = String(message || '').trim();
    if (!text) {
      return;
    }

    body.textContent = text;
    open();
  };

  modal.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.teamMessageClose !== undefined) {
      close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      close();
    }
  });

  window.JotiTeamMessageModal = {
    show,
    close,
  };
})();
