document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('confirm-modal');
    const message = document.getElementById('confirm-message');
    const accept = document.getElementById('confirm-accept');
    const defaultText = document.body ? document.body.dataset.confirmDefault : '';
    const deleteLabel = document.body ? document.body.dataset.confirmLabelDelete || 'Delete' : 'Delete';
    const resetLabel = document.body ? document.body.dataset.confirmLabelReset || 'Reset' : 'Reset';
    const removeLabel = document.body ? document.body.dataset.confirmLabelRemove || deleteLabel : deleteLabel;
    let pendingForm = null;

    const resolveActionLabel = (form) => {
        if (!(form instanceof HTMLFormElement)) {
            return deleteLabel;
        }

        const explicitLabel = form.dataset.confirmActionLabel;
        if (explicitLabel) {
            return explicitLabel;
        }

        const action = (form.getAttribute('action') || '').toLowerCase();
        if (/(\/|_)(reset)(\/|_|$)/i.test(action)) {
            return resetLabel;
        }
        if (/(\/|_)(remove)(\/|_|$)/i.test(action)) {
            return removeLabel;
        }

        return deleteLabel;
    };

    const needsConfirmation = (form) => {
        if (!(form instanceof HTMLFormElement)) {
            return false;
        }

        if (form.hasAttribute('data-confirm')) {
            return true;
        }

        const action = form.getAttribute('action') || '';
        return /(\/|_)(delete|remove|reset)(\/|_|$)/i.test(action);
    };

    const openModal = (text) => {
        if (!modal) {
            return;
        }
        if (message) {
            message.textContent = text;
        }
        if (accept && pendingForm) {
            accept.textContent = resolveActionLabel(pendingForm);
        }
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
    };

    const closeModal = () => {
        if (!modal) {
            return;
        }
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        pendingForm = null;
    };

    const submitPendingForm = () => {
        if (!pendingForm) {
            return;
        }
        const form = pendingForm;
        pendingForm = null;
        HTMLFormElement.prototype.submit.call(form);
    };

    document.addEventListener('submit', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLFormElement)) {
            return;
        }

        if (!needsConfirmation(target)) {
            return;
        }

        event.preventDefault();

        const text = target.dataset.confirmMessage || defaultText || '';

        if (!modal || !accept || !message) {
            if (window.confirm(text)) {
                HTMLFormElement.prototype.submit.call(target);
            }
            return;
        }

        pendingForm = target;
        openModal(text);
    });

    if (modal) {
        modal.addEventListener('click', (event) => {
            const target = event.target;
            if (target instanceof HTMLElement && target.dataset.modalClose !== undefined) {
                closeModal();
            }
        });
    }

    if (accept) {
        accept.addEventListener('click', () => {
            submitPendingForm();
            closeModal();
        });
    }
});
