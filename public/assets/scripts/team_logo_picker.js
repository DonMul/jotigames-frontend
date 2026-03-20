(() => {
  const pickers = document.querySelectorAll('[data-team-logo-picker]');
  if (!pickers.length) {
    return;
  }

  const revealImage = (image) => {
    image.classList.add('is-loaded');
  };

  const loadImage = (image) => {
    const source = image.dataset.src || '';
    if (!source || image.getAttribute('src')) {
      return;
    }

    image.addEventListener('load', () => revealImage(image), { once: true });
    image.addEventListener('error', () => revealImage(image), { once: true });
    image.setAttribute('src', source);
  };

  const loadImagesForVisibleOptions = (root) => {
    const images = root.querySelectorAll('.team-logo-option:not([hidden]) .team-logo-option-image[data-src]');
    if (!images.length) {
      return;
    }

    images.forEach((image) => loadImage(image));
  };

  const setSelectedOption = (root, selectedValue) => {
    root.querySelectorAll('[data-logo-option]').forEach((option) => {
      option.classList.toggle('is-selected', (option.dataset.logoValue || '') === selectedValue);
    });
  };

  const updateCurrentPreview = (root, selectedValue) => {
    const valueInput = root.querySelector('[data-logo-value]');
    const currentImage = root.querySelector('[data-logo-current-image]');
    const currentText = root.querySelector('[data-logo-current-text]');
    const noneLabel = root.dataset.logoNoneLabel || '';
    const normalizedValue = selectedValue || '';

    if (!valueInput || !currentImage || !currentText) {
      return;
    }

    valueInput.value = normalizedValue;

    if (normalizedValue === '') {
      currentText.textContent = noneLabel;
      currentImage.classList.add('is-hidden');
      currentImage.removeAttribute('src');
      return;
    }

    const selectedOption = root.querySelector(`[data-logo-option][data-logo-value="${CSS.escape(selectedValue)}"]`)
      || null;

    if (!selectedOption) {
      return;
    }

    const label = selectedOption.dataset.logoLabel || '';
    const source = selectedOption.dataset.logoSrc || '';
    currentText.textContent = label;

    if (!source) {
      currentImage.classList.add('is-hidden');
      currentImage.removeAttribute('src');
      return;
    }

    currentImage.classList.remove('is-hidden');
    currentImage.setAttribute('src', source);
  };

  const activateCategory = (root, category, shouldLoadImages = true) => {
    const categorySelect = root.querySelector('[data-logo-category-select]');
    if (categorySelect instanceof HTMLSelectElement && categorySelect.value !== category) {
      categorySelect.value = category;
    }

    root.querySelectorAll('.team-logo-option[data-logo-category]').forEach((option) => {
      const shouldHide = option.dataset.logoCategory !== category;
      option.hidden = shouldHide;
      option.classList.toggle('is-hidden', shouldHide);
      option.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
    });

    if (shouldLoadImages) {
      loadImagesForVisibleOptions(root);
    }
  };

  pickers.forEach((root) => {
    const modal = root.querySelector('.team-logo-modal');
    const openButton = root.querySelector('[data-logo-picker-open]');
    const closeButtons = root.querySelectorAll('[data-logo-picker-close]');
    const valueInput = root.querySelector('[data-logo-value]');
    const categorySelect = root.querySelector('[data-logo-category-select]');
    const clearButton = root.querySelector('[data-logo-clear]');

    if (!modal || !openButton || !valueInput) {
      return;
    }

    const closeModal = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    };

    const openModal = () => {
      const selectedOption = root.querySelector(`[data-logo-option][data-logo-value="${CSS.escape(valueInput.value || '')}"]`);
      const selectedCategory = selectedOption?.dataset.logoCategory
        || (categorySelect instanceof HTMLSelectElement ? categorySelect.value : '');
      if (selectedCategory) {
        activateCategory(root, selectedCategory, true);
      } else {
        root.querySelectorAll('.team-logo-option[data-logo-category]').forEach((option) => {
          option.hidden = false;
          option.classList.remove('is-hidden');
          option.setAttribute('aria-hidden', 'false');
        });
        loadImagesForVisibleOptions(root);
      }

      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');

      const grid = root.querySelector('[data-logo-grid]');
      if (grid instanceof HTMLElement) {
        grid.scrollTop = 0;
      }

      if (selectedOption instanceof HTMLElement && !selectedOption.hidden) {
        selectedOption.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    };

    openButton.addEventListener('click', openModal);

    closeButtons.forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    modal.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const option = target.closest('[data-logo-option]');
      if (option) {
        const selectedValue = option.dataset.logoValue || '';
        setSelectedOption(root, selectedValue);
        updateCurrentPreview(root, selectedValue);
        closeModal();
      }
    });

    modal.addEventListener('keydown', (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const option = event.target.closest('[data-logo-option]');
      if (!option) {
        return;
      }

      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      const selectedValue = option.dataset.logoValue || '';
      setSelectedOption(root, selectedValue);
      updateCurrentPreview(root, selectedValue);
      closeModal();
    });

    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    });

    if (categorySelect instanceof HTMLSelectElement) {
      categorySelect.addEventListener('change', () => {
        const category = categorySelect.value || '';
        if (!category) {
          return;
        }

        activateCategory(root, category, true);
      });
    }

    if (clearButton instanceof HTMLButtonElement) {
      clearButton.addEventListener('click', () => {
        setSelectedOption(root, '');
        updateCurrentPreview(root, '');
        closeModal();
      });
    }

    setSelectedOption(root, valueInput.value || '');
    if (categorySelect instanceof HTMLSelectElement) {
      const selectedOption = root.querySelector(`[data-logo-option][data-logo-value="${CSS.escape(valueInput.value || '')}"]`);
      const selectedCategory = selectedOption?.dataset.logoCategory || categorySelect.value || '';
      if (selectedCategory) {
        activateCategory(root, selectedCategory, true);
      }
    } else {
      root.querySelectorAll('.team-logo-option[data-logo-category]').forEach((option) => {
        option.hidden = false;
        option.classList.remove('is-hidden');
        option.setAttribute('aria-hidden', 'false');
      });
    }
  });
})();
