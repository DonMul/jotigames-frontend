document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('[data-game-form]');
    if (!root) {
        return;
    }

    const gameTypeId = root.dataset.gameTypeId;
    const latInputId = root.dataset.blindhikeLatId;
    const lonInputId = root.dataset.blindhikeLonId;
    const crazy88VisibilityId = root.dataset.crazy88VisibilityId;
    const gameTypeLocked = root.dataset.gameTypeLocked === '1';
    const removeEmailLabel = root.dataset.removeEmailLabel || 'Remove';

    const gameTypeSelect = gameTypeId ? document.getElementById(gameTypeId) : null;
    if (!(gameTypeSelect instanceof HTMLSelectElement)) {
        return;
    }

    const gameTypePicker = root.querySelector('[data-game-type-picker]');
    const gameTypeOptions = gameTypePicker ? gameTypePicker.querySelectorAll('[data-game-type-option]') : [];
    const geoModeWrapper = document.getElementById('geo-mode-wrapper');
    const geoHunterRetryWrapper = document.getElementById('geohunter-retry-wrapper');
    const marketCrashBudgetWrapper = document.getElementById('market-crash-budget-wrapper');
    const crazy88VisibilityWrapper = document.getElementById('crazy88-visibility-wrapper');
    const blindhikeWrapper = document.getElementById('blindhike-target-wrapper');
    const crazy88VisibilityInput = crazy88VisibilityId ? document.getElementById(crazy88VisibilityId) : null;
    const latInput = latInputId ? document.getElementById(latInputId) : null;
    const lonInput = lonInputId ? document.getElementById(lonInputId) : null;

    let map = null;
    let marker = null;

    const updateGameTypePickerSelection = () => {
        if (!gameTypeOptions.length) {
            return;
        }

        gameTypeOptions.forEach((option) => {
            if (!(option instanceof HTMLElement)) {
                return;
            }
            const isSelected = option.dataset.gameTypeOption === gameTypeSelect.value;
            option.classList.toggle('is-selected', isSelected);
            option.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        });
    };

    const setupMarkerEvents = () => {
        if (!marker || !(latInput instanceof HTMLInputElement) || !(lonInput instanceof HTMLInputElement)) {
            return;
        }
        marker.on('dragend', () => {
            const pos = marker.getLatLng();
            latInput.value = pos.lat.toFixed(7);
            lonInput.value = pos.lng.toFixed(7);
        });
    };

    const updateMarkerFromInputs = () => {
        if (!(latInput instanceof HTMLInputElement) || !(lonInput instanceof HTMLInputElement) || !map) {
            return;
        }

        const lat = parseFloat(latInput.value);
        const lon = parseFloat(lonInput.value);

        if (!isNaN(lat) && !isNaN(lon)) {
            if (marker) {
                marker.setLatLng([lat, lon]);
            } else {
                marker = L.marker([lat, lon], { draggable: true }).addTo(map);
                setupMarkerEvents();
            }
            map.setView([lat, lon], 15);
        }
    };

    const createMap = (lat, lon, zoom) => {
        map = L.map('blindhike-form-map').setView([lat, lon], zoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        if (latInput instanceof HTMLInputElement && lonInput instanceof HTMLInputElement && latInput.value && lonInput.value) {
            marker = L.marker([lat, lon], { draggable: true }).addTo(map);
            setupMarkerEvents();
        }

        map.on('click', (event) => {
            if (!(latInput instanceof HTMLInputElement) || !(lonInput instanceof HTMLInputElement)) {
                return;
            }

            const clickLat = event.latlng.lat.toFixed(7);
            const clickLon = event.latlng.lng.toFixed(7);

            latInput.value = clickLat;
            lonInput.value = clickLon;

            if (marker) {
                marker.setLatLng(event.latlng);
            } else {
                marker = L.marker(event.latlng, { draggable: true }).addTo(map);
                setupMarkerEvents();
            }
        });

        latInput?.addEventListener('change', updateMarkerFromInputs);
        lonInput?.addEventListener('change', updateMarkerFromInputs);
    };

    const initializeMap = () => {
        if (typeof L === 'undefined') {
            return;
        }

        window.setTimeout(() => {
            if (latInput instanceof HTMLInputElement && lonInput instanceof HTMLInputElement && latInput.value && lonInput.value) {
                const lat = parseFloat(latInput.value);
                const lon = parseFloat(lonInput.value);
                createMap(lat, lon, 15);
            } else if (navigator.geolocation && latInput instanceof HTMLInputElement && lonInput instanceof HTMLInputElement) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        createMap(lat, lon, 15);
                        latInput.value = lat.toFixed(7);
                        lonInput.value = lon.toFixed(7);
                        marker = L.marker([lat, lon], { draggable: true }).addTo(map);
                        setupMarkerEvents();
                    },
                    () => {
                        createMap(52.3676, 4.9041, 13);
                    },
                );
            } else {
                createMap(52.3676, 4.9041, 13);
            }
        }, 100);
    };

    const toggleGameTypeFields = () => {
        const gameType = gameTypeSelect.value;
        updateGameTypePickerSelection();

        if (geoModeWrapper) {
            geoModeWrapper.classList.toggle('is-hidden', gameType !== 'geohunter');
        }

        if (geoHunterRetryWrapper) {
            geoHunterRetryWrapper.classList.toggle('is-hidden', gameType !== 'geohunter');
        }

        if (marketCrashBudgetWrapper) {
            marketCrashBudgetWrapper.classList.toggle('is-hidden', gameType !== 'market_crash');
        }

        if (crazy88VisibilityWrapper) {
            const show = gameType === 'crazy_88';
            crazy88VisibilityWrapper.classList.toggle('is-hidden', !show);
            if (!show && crazy88VisibilityInput instanceof HTMLSelectElement) {
                crazy88VisibilityInput.value = 'all_visible';
            }
        }

        if (blindhikeWrapper) {
            const show = gameType === 'blindhike';
            blindhikeWrapper.classList.toggle('is-hidden', !show);
            if (show && !map) {
                initializeMap();
            }
        }
    };

    gameTypeOptions.forEach((option) => {
        option.addEventListener('click', () => {
            if (gameTypeLocked) {
                return;
            }

            if (!(option instanceof HTMLElement)) {
                return;
            }

            const value = option.dataset.gameTypeOption;
            if (!value || gameTypeSelect.value === value) {
                return;
            }

            gameTypeSelect.value = value;
            gameTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });

    const createEmailRow = (collection) => {
        const prototype = collection.dataset.prototype || '';
        const index = parseInt(collection.dataset.index || '0', 10);
        const html = prototype.replace(/__name__/g, String(index));
        collection.dataset.index = String(index + 1);

        const row = document.createElement('div');
        row.className = 'admin-inline-form game-email-row';
        row.setAttribute('data-email-row', '');
        row.innerHTML = html;

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'btn btn-remove btn-small';
        removeButton.setAttribute('data-email-remove', '');
        removeButton.textContent = removeEmailLabel;
        row.appendChild(removeButton);

        collection.appendChild(row);
    };

    const bindEmailCollection = (collection) => {
        collection.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            if (target.matches('[data-email-remove]')) {
                const row = target.closest('[data-email-row]');
                row?.remove();
            }
        });

        if (collection.querySelectorAll('[data-email-row]').length === 0) {
            createEmailRow(collection);
        }
    };

    document.querySelectorAll('[data-email-collection]').forEach((collection) => {
        if (collection instanceof HTMLElement) {
            bindEmailCollection(collection);
        }
    });

    document.querySelectorAll('[data-email-add]').forEach((button) => {
        button.addEventListener('click', () => {
            if (!(button instanceof HTMLElement)) {
                return;
            }
            const listId = button.getAttribute('data-email-add');
            if (!listId) {
                return;
            }

            const collection = document.getElementById(listId);
            if (collection instanceof HTMLElement) {
                createEmailRow(collection);
            }
        });
    });

    gameTypeSelect.addEventListener('change', toggleGameTypeFields);
    toggleGameTypeFields();
});