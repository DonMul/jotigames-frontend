(() => {
  const tryPatchLeaflet = () => {
    if (!window.L || !window.L.Map || window.L.__jotiAutoCenterPatched) {
      return false;
    }

    window.L.__jotiAutoCenterPatched = true;

    window.L.Map.addInitHook(function autoCenterOnUserLocation() {
      if (!navigator.geolocation) {
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const zoom = Number.isFinite(this.getZoom()) ? this.getZoom() : 14;
          this.setView([lat, lon], zoom);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 },
      );
    });

    return true;
  };

  if (tryPatchLeaflet()) {
    return;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (tryPatchLeaflet() || attempts > 80) {
      window.clearInterval(timer);
    }
  }, 100);
})();
