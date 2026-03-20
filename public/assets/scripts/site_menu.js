(() => {
  const root = document.documentElement;
  const themeToggle = document.querySelector('[data-theme-toggle]');
  const THEME_KEY = 'jotigames-theme';

  const applyTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    if (themeToggle) {
      const isDark = theme === 'dark';
      themeToggle.textContent = isDark ? '☀️' : '🌙';
      themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      themeToggle.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  };

  const currentTheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(currentTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      try {
        localStorage.setItem(THEME_KEY, nextTheme);
      } catch (e) {
        // ignore storage restrictions
      }
    });
  }

  const shell = document.querySelector('.nav-shell');
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.getElementById('site-nav');

  if (!shell || !toggle || !nav) {
    return;
  }

  const setExpanded = (expanded) => {
    shell.classList.toggle('is-menu-open', expanded);
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };

  const topLevelDropdowns = Array.from(nav.querySelectorAll(':scope > .nav-dropdown'));
  const subDropdowns = Array.from(nav.querySelectorAll('.nav-sub-dropdown'));

  const closeOtherTopLevelDropdowns = (current) => {
    topLevelDropdowns.forEach((dropdown) => {
      if (dropdown !== current) {
        dropdown.removeAttribute('open');
      }
    });
  };

  const closeSiblingSubDropdowns = (current) => {
    const parentMenu = current.closest('.nav-dropdown-menu');
    if (!parentMenu) {
      return;
    }

    parentMenu.querySelectorAll(':scope > .nav-sub-dropdown').forEach((dropdown) => {
      if (dropdown !== current) {
        dropdown.removeAttribute('open');
      }
    });
  };

  toggle.addEventListener('click', () => {
    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
    setExpanded(!isExpanded);

    if (isExpanded) {
      topLevelDropdowns.forEach((dropdown) => dropdown.removeAttribute('open'));
      subDropdowns.forEach((dropdown) => dropdown.removeAttribute('open'));
    }
  });

  topLevelDropdowns.forEach((dropdown) => {
    dropdown.addEventListener('toggle', () => {
      if (dropdown.open) {
        closeOtherTopLevelDropdowns(dropdown);
      }
    });
  });

  subDropdowns.forEach((dropdown) => {
    dropdown.addEventListener('toggle', () => {
      if (dropdown.open) {
        closeSiblingSubDropdowns(dropdown);
      }
    });
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        setExpanded(false);
      }
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      setExpanded(false);
    }
  });

  document.addEventListener('click', (event) => {
    if (!shell.contains(event.target)) {
      topLevelDropdowns.forEach((dropdown) => dropdown.removeAttribute('open'));
      subDropdowns.forEach((dropdown) => dropdown.removeAttribute('open'));
      setExpanded(false);
    }
  });
})();
