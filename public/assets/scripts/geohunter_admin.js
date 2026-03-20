document.addEventListener('DOMContentLoaded', () => {
    const adminMap = document.getElementById('geohunter-admin-map');
    if (adminMap && window.L) {
        const centerLat = parseFloat(adminMap.dataset.centerLat || '0');
        const centerLon = parseFloat(adminMap.dataset.centerLon || '0');
        const pois = adminMap.dataset.pois ? JSON.parse(adminMap.dataset.pois) : [];
        const map = L.map(adminMap).setView([centerLat, centerLon], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    map.setView([position.coords.latitude, position.coords.longitude], 14);
                },
                () => {}
            );
        }

        pois.forEach((poi) => {
            if (typeof poi.latitude !== 'number' || typeof poi.longitude !== 'number') {
                return;
            }
            const marker = L.marker([poi.latitude, poi.longitude]).addTo(map);
            const title = poi.title || adminMap.dataset.poiLabel || '';
            marker.bindPopup(`${title} (${poi.radius || 20}m)`);
        });
    }

    const poiMap = document.getElementById('geohunter-poi-map');
    if (poiMap && window.L) {
        const latInput = document.querySelector('[data-geo-lat]');
        const lonInput = document.querySelector('[data-geo-lon]');
        const startLat = parseFloat(poiMap.dataset.lat || '0');
        const startLon = parseFloat(poiMap.dataset.lon || '0');
        const isNew = poiMap.dataset.isNew === '1';

        const map = L.map(poiMap).setView([startLat, startLon], isNew ? 2 : 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        const marker = L.marker([startLat, startLon], { draggable: true }).addTo(map);

        const updateInputs = (lat, lon) => {
            if (latInput) {
                latInput.value = lat.toFixed(6);
            }
            if (lonInput) {
                lonInput.value = lon.toFixed(6);
            }
        };

        if (isNew && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    marker.setLatLng([lat, lon]);
                    map.setView([lat, lon], 15);
                    updateInputs(lat, lon);
                },
                () => {}
            );
        } else if (!isNew && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    map.setView([position.coords.latitude, position.coords.longitude], 15);
                },
                () => {}
            );
        }

        map.on('click', (event) => {
            const { lat, lng } = event.latlng;
            marker.setLatLng([lat, lng]);
            updateInputs(lat, lng);
        });

        marker.on('dragend', () => {
            const { lat, lng } = marker.getLatLng();
            updateInputs(lat, lng);
        });

        if (latInput && lonInput) {
            const updateMarker = () => {
                const lat = parseFloat(latInput.value || '0');
                const lon = parseFloat(lonInput.value || '0');
                if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
                    marker.setLatLng([lat, lon]);
                }
            };
            latInput.addEventListener('change', updateMarker);
            lonInput.addEventListener('change', updateMarker);
        }
    }

    const choiceList = document.querySelector('[data-choice-list]');
    const addChoiceBtn = document.querySelector('[data-choice-add]');
    if (choiceList && addChoiceBtn) {
        const renderRow = (index) => {
            const row = document.createElement('div');
            row.className = 'geo-choice-row';
            row.dataset.choiceRow = 'true';

            const input = document.createElement('input');
            input.type = 'text';
            input.name = `choices[${index}][label]`;
            input.required = true;

            const label = document.createElement('label');
            label.className = 'geo-choice-check';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = `choices[${index}][correct]`;
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${choiceList.dataset.choiceCorrectLabel || ''}`));

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn-ghost btn-small';
            removeBtn.dataset.choiceRemove = 'true';
            removeBtn.textContent = choiceList.dataset.choiceRemoveLabel || '';

            row.appendChild(input);
            row.appendChild(label);
            row.appendChild(removeBtn);

            return row;
        };

        const getNextIndex = () => {
            const nextIndex = parseInt(choiceList.dataset.nextIndex || '0', 10);
            choiceList.dataset.nextIndex = `${nextIndex + 1}`;
            return nextIndex;
        };

        addChoiceBtn.addEventListener('click', () => {
            const index = getNextIndex();
            const row = renderRow(index);
            choiceList.appendChild(row);
        });

        choiceList.addEventListener('click', (event) => {
            const target = event.target;
            if (target instanceof HTMLElement && target.dataset.choiceRemove !== undefined) {
                const row = target.closest('[data-choice-row]');
                if (row) {
                    row.remove();
                }
            }
        });
    }

    const typeSelect = document.querySelector('[data-geo-type]');
    if (typeSelect) {
        const fields = {
            content: document.querySelector('[data-geo-field="content"]'),
            question: document.querySelector('[data-geo-field="question"]'),
            expected: document.querySelector('[data-geo-field="expected"]'),
            choices: document.querySelector('[data-geo-field="choices"]'),
        };

        const updateFields = () => {
            const value = typeSelect.value;
            if (fields.content) {
                fields.content.style.display = value === 'text' ? '' : 'none';
            }
            if (fields.question) {
                fields.question.style.display = value === 'text' ? 'none' : '';
            }
            if (fields.expected) {
                fields.expected.style.display = value === 'open_answer' ? '' : 'none';
            }
            if (fields.choices) {
                fields.choices.style.display = value === 'multiple_choice' ? '' : 'none';
            }
        };

        typeSelect.addEventListener('change', updateFields);
        updateFields();
    }
});
