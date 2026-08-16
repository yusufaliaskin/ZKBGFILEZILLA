/**
 * ZK Remote Operations Center - Theme Manager
 * Default: Light Theme. Switchable to Dark Theme.
 */

const ThemeManager = {
  storageKey: 'zk_theme',

  init() {
    // Determine initial theme: localStorage -> default 'light'
    const savedTheme = localStorage.getItem('zk_theme') || localStorage.getItem('zk_roc_theme') || 'light';
    this.applyTheme(savedTheme, false);

    // Bind theme toggle buttons
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleTheme());
    });
  },

  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  },

  applyTheme(theme, syncWithBackend = true) {
    const validTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', validTheme);
    localStorage.setItem(this.storageKey, validTheme);

    // Update icons in toggle button
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
      const iconEl = btn.querySelector('[data-lucide]');
      if (iconEl) {
        iconEl.setAttribute('data-lucide', validTheme === 'dark' ? 'sun' : 'moon');
      }
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Sync preference with backend if API is available
    if (syncWithBackend && window.API) {
      const formData = new FormData();
      formData.append('theme', validTheme);
      fetch('/set-theme/', {
        method: 'POST',
        headers: { 'X-CSRFToken': API.csrfToken },
        body: formData,
      }).catch(() => {});
    }
  },

  toggleTheme() {
    const nextTheme = this.getCurrentTheme() === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme, true);
    if (window.Toast) {
      Toast.show(`Tema değiştirildi: ${nextTheme === 'dark' ? 'Koyu Tema' : 'Açık Tema'}`, 'info', 2000);
    }
  }
};

window.ThemeManager = ThemeManager;
document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
