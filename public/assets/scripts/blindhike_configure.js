// Blind Hike Configuration Page - Admin Map with Geolocation
document.addEventListener('DOMContentLoaded', () => {
    const latInput = document.getElementById('target_lat');
    const lonInput = document.getElementById('target_lon');

    // Initialize map
    const map = L.map('blindhike-config-map').setView([52.3676, 4.9041], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Target marker
    let targetMarker = null;

    // Initialize with existing coordinates or try geolocation
    if (latInput.value && lonInput.value) {
        const lat = parseFloat(latInput.value);
        const lon = parseFloat(lonInput.value);
        map.setView([lat, lon], 15);
        
        targetMarker = L.marker([lat, lon], { draggable: true }).addTo(map);
        setupMarkerEvents(targetMarker);
    } else {
        // Try to get user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    map.setView([lat, lon], 15);
                    
                    // Place initial marker at current location
                    targetMarker = L.marker([lat, lon], { draggable: true }).addTo(map);
                    setupMarkerEvents(targetMarker);
                    
                    latInput.value = lat.toFixed(7);
                    lonInput.value = lon.toFixed(7);
                },
                (error) => {
                    console.log('Geolocation not available, using default location');
                }
            );
        }
    }

    // Click map to place/move marker
    map.on('click', (e) => {
        const lat = e.latlng.lat.toFixed(7);
        const lon = e.latlng.lng.toFixed(7);
        
        latInput.value = lat;
        lonInput.value = lon;

        if (targetMarker) {
            targetMarker.setLatLng(e.latlng);
        } else {
            targetMarker = L.marker(e.latlng, { draggable: true }).addTo(map);
            setupMarkerEvents(targetMarker);
        }
    });

    function setupMarkerEvents(marker) {
        marker.on('dragend', () => {
            const pos = marker.getLatLng();
            latInput.value = pos.lat.toFixed(7);
            lonInput.value = pos.lng.toFixed(7);
        });
    }

    // Update marker when inputs change
    latInput.addEventListener('change', updateMarkerFromInputs);
    lonInput.addEventListener('change', updateMarkerFromInputs);

    function updateMarkerFromInputs() {
        const lat = parseFloat(latInput.value);
        const lon = parseFloat(lonInput.value);
        
        if (!isNaN(lat) && !isNaN(lon)) {
            if (targetMarker) {
                targetMarker.setLatLng([lat, lon]);
            } else {
                targetMarker = L.marker([lat, lon], { draggable: true }).addTo(map);
                setupMarkerEvents(targetMarker);
            }
            map.setView([lat, lon], 15);
        }
    }
});
