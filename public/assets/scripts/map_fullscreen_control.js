(() => {
  let installed = false;
  let activeMap = null;
  let activeContainer = null;
  const ENTER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M5 9V5h4v2H7v2H5zm10-4h4v4h-2V7h-2V5zM5 15h2v2h2v2H5v-4zm12 2h-2v2h4v-4h-2v2z"/></svg>';
  const EXIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8.2 8.2H5V5h1.8v2.1L9 4.9l1.3 1.3-2.1 2.1zM15.8 8.2l-2.1-2.1L15 4.9l2.2 2.2V5H19v3.2zM8.2 15.8l2.1 2.1L9 19.1l-2.2-2.2V19H5v-3.2zM15.8 15.8H19V19h-1.8v-2.1L15 19.1l-1.3-1.3 2.1-2.1z"/></svg>';

  const lockBodyScroll = (locked) => {
    document.body.classList.toggle('map-fullscreen-lock', locked);
  };

  const setFullscreenState = (map, enabled) => {
    const container = map.getContainer();
    if (!container) {
      return;
    }

    if (enabled) {
      if (activeMap && activeMap !== map) {
        setFullscreenState(activeMap, false);
      }

      container.classList.add('map-fullscreen-active');
      lockBodyScroll(true);
      activeMap = map;
      activeContainer = container;
    } else {
      container.classList.remove('map-fullscreen-active');
      if (activeMap === map) {
        activeMap = null;
        activeContainer = null;
        lockBodyScroll(false);
      }
    }

    window.setTimeout(() => {
      map.invalidateSize();
    }, 320);
  };

  const install = () => {
    if (installed || !window.L || !window.L.Map || !window.L.Control) {
      return;
    }

    const L = window.L;

    const FullscreenControl = L.Control.extend({
      options: {
        position: 'topright',
      },

      onAdd(map) {
        const wrapper = L.DomUtil.create('div', 'leaflet-bar leaflet-control map-fullscreen-control');
        const button = L.DomUtil.create('button', 'map-fullscreen-control__btn', wrapper);
        button.type = 'button';
        button.innerHTML = ENTER_ICON;
        button.setAttribute('aria-label', 'Enter fullscreen map');
        button.title = 'Fullscreen';

        const syncButton = () => {
          const isActive = map.getContainer().classList.contains('map-fullscreen-active');
          button.innerHTML = isActive ? EXIT_ICON : ENTER_ICON;
          button.setAttribute('aria-label', isActive ? 'Exit fullscreen map' : 'Enter fullscreen map');
          button.title = isActive ? 'Exit fullscreen' : 'Fullscreen';
        };

        L.DomEvent.disableClickPropagation(wrapper);
        L.DomEvent.disableScrollPropagation(wrapper);

        L.DomEvent.on(button, 'click', (event) => {
          L.DomEvent.preventDefault(event);
          const isActive = map.getContainer().classList.contains('map-fullscreen-active');
          setFullscreenState(map, !isActive);
          syncButton();
        });

        map.on('resize', syncButton);
        map.on('zoomend', syncButton);
        syncButton();

        return wrapper;
      },
    });

    L.Map.addInitHook(function addFullscreenControl() {
      this.addControl(new FullscreenControl());
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && activeMap && activeContainer) {
        setFullscreenState(activeMap, false);
      }
    });

    installed = true;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      install();
    });
  } else {
    install();
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    install();
    if (installed || attempts > 120) {
      window.clearInterval(timer);
    }
  }, 100);
})();
