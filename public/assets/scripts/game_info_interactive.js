(() => {
    const tabSections = document.querySelectorAll('[data-game-info-tabs]');

    if (!tabSections.length) {
        return;
    }

    tabSections.forEach((section) => {
        const tabs = Array.from(section.querySelectorAll('[data-game-info-tab]'));
        const panels = Array.from(section.querySelectorAll('[data-game-info-panel]'));

        if (!tabs.length || !panels.length) {
            return;
        }

        const activateTab = (target) => {
            tabs.forEach((tab) => {
                const isActive = tab.dataset.gameInfoTab === target;
                tab.classList.toggle('is-active', isActive);
                tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });

            panels.forEach((panel) => {
                const isActive = panel.dataset.gameInfoPanel === target;
                panel.classList.toggle('is-active', isActive);
                panel.hidden = !isActive;
            });
        };

        tabs.forEach((tab) => {
            tab.addEventListener('click', () => activateTab(tab.dataset.gameInfoTab || 'flow'));
        });
    });
})();