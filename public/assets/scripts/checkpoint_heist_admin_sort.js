(() => {
  const table = document.getElementById('checkpoint-heist-checkpoint-table');
  const tbody = document.getElementById('checkpoint-heist-checkpoint-body');
  if (!table || !tbody) {
    return;
  }

  const reorderUrl = table.dataset.reorderUrl;
  const reorderToken = table.dataset.reorderToken;
  if (!reorderUrl || !reorderToken) {
    return;
  }

  let draggedRow = null;
  let dragArmedRow = null;
  let dropTargetRow = null;

  const clearDropTarget = () => {
    if (!dropTargetRow) {
      return;
    }

    dropTargetRow.classList.remove('checkpoint-heist-row-drop-target');
    dropTargetRow = null;
  };

  const disarmRows = () => {
    [...tbody.querySelectorAll('tr[data-checkpoint-id]')].forEach((row) => {
      row.setAttribute('draggable', 'false');
      row.classList.remove('checkpoint-heist-row-drag-armed');
    });
    dragArmedRow = null;
  };

  const updateSequenceCells = () => {
    [...tbody.querySelectorAll('tr[data-checkpoint-id]')].forEach((row, index) => {
      const sequenceCell = row.querySelector('[data-sequence-cell]');
      if (sequenceCell) {
        sequenceCell.textContent = String(index + 1);
      }
    });
  };

  const persistOrder = async () => {
    const orderedIds = [...tbody.querySelectorAll('tr[data-checkpoint-id]')].map((row) => row.dataset.checkpointId).filter(Boolean);
    if (!orderedIds.length) {
      return;
    }

    const body = new URLSearchParams();
    body.append('_token', reorderToken);
    orderedIds.forEach((id) => body.append('orderedIds[]', id));

    try {
      const response = await fetch(reorderUrl, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder checkpoints');
      }
    } catch (_) {
      window.location.reload();
    }
  };

  const getDropTargetRow = (clientY) => {
    const rows = [...tbody.querySelectorAll('tr[data-checkpoint-id]:not(.dragging)')];

    return rows.reduce((closest, row) => {
      const rect = row.getBoundingClientRect();
      const offset = clientY - rect.top - rect.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, row };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY, row: null }).row;
  };

  tbody.addEventListener('mousedown', (event) => {
    const handle = event.target.closest('[data-drag-handle]');
    if (!handle) {
      return;
    }

    const row = handle.closest('tr[data-checkpoint-id]');
    if (!row) {
      return;
    }

    dragArmedRow = row;
    row.setAttribute('draggable', 'true');
    row.classList.add('checkpoint-heist-row-drag-armed');
  });

  tbody.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const handle = event.target.closest('[data-drag-handle]');
    if (!handle) {
      return;
    }

    const row = handle.closest('tr[data-checkpoint-id]');
    if (!row) {
      return;
    }

    dragArmedRow = row;
    row.setAttribute('draggable', 'true');
    row.classList.add('checkpoint-heist-row-drag-armed');
  });

  tbody.addEventListener('dragstart', (event) => {
    const row = event.target.closest('tr[data-checkpoint-id]');
    if (!row || row !== dragArmedRow) {
      event.preventDefault();
      return;
    }

    draggedRow = row;
    row.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', row.dataset.checkpointId || '');
    }
  });

  tbody.addEventListener('dragend', async () => {
    if (!draggedRow) {
      disarmRows();
      return;
    }

    draggedRow.classList.remove('dragging');
    draggedRow = null;
    clearDropTarget();
    disarmRows();
    updateSequenceCells();
    await persistOrder();
  });

  tbody.addEventListener('dragover', (event) => {
    event.preventDefault();

    if (!draggedRow) {
      return;
    }

    const dropTarget = getDropTargetRow(event.clientY);
    if (!dropTarget) {
      clearDropTarget();
      tbody.appendChild(draggedRow);
      return;
    }

    if (dropTarget !== draggedRow && dropTarget !== dropTargetRow) {
      clearDropTarget();
      dropTarget.classList.add('checkpoint-heist-row-drop-target');
      dropTargetRow = dropTarget;
    }

    if (dropTarget !== draggedRow) {
      tbody.insertBefore(draggedRow, dropTarget);
    }
  });

  document.addEventListener('mouseup', () => {
    if (!draggedRow) {
      disarmRows();
    }
  });
})();
