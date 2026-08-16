/**
 * ZK Remote Operations Center - Command Palette (Ctrl+K)
 */

const CommandPalette = {
  isOpen: false,

  init() {
    this.modal = document.getElementById('command-palette-modal');
    this.input = document.getElementById('cmd-palette-input');
    this.results = document.getElementById('cmd-palette-results');

    if (!this.modal) return;

    // Listen for Ctrl+K or Cmd+K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    if (this.input) {
      this.input.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }
  },

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  },

  open() {
    this.isOpen = true;
    this.modal.classList.add('active');
    if (this.input) {
      this.input.value = '';
      this.input.focus();
      this.handleSearch('');
    }
  },

  close() {
    this.isOpen = false;
    this.modal.classList.remove('active');
  },

  handleSearch(query) {
    const commands = [
      { title: 'Gösterge Paneli (Dashboard)', icon: 'layout-dashboard', url: '/dashboard/' },
      { title: 'Cihaz Envanteri (Devices)', icon: 'server', url: '/devices/' },
      { title: 'Uzak Dosya Yöneticisi (File Manager)', icon: 'folder', url: '/files/' },
      { title: 'Güvenlik ve Denetim Kayıtları (Audit Logs)', icon: 'shield-check', url: '/audit/' },
      { title: 'Açık / Koyu Tema Değiştir', icon: 'sun-moon', action: () => ThemeManager.toggleTheme() },
      { title: 'Profilim & Ayarlar', icon: 'user', url: '/profile/' },
    ];

    const q = query.toLowerCase().trim();
    const filtered = q ? commands.filter(c => c.title.toLowerCase().includes(q)) : commands;

    this.results.innerHTML = filtered.map(c => `
      <div class="cmd-item" style="padding: 10px 14px; display: flex; align-items: center; gap: 12px; border-radius: var(--radius-md); cursor: pointer; transition: background-color var(--transition-fast);"
           onmouseover="this.style.backgroundColor='var(--accent-dim)'"
           onmouseout="this.style.backgroundColor=''"
           onclick="CommandPalette.execute('${c.url || ''}')">
        <i data-lucide="${c.icon}" style="width: 16px; height: 16px; color: var(--accent-primary);"></i>
        <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">${c.title}</span>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  execute(url) {
    this.close();
    if (url) window.location.href = url;
  }
};

window.CommandPalette = CommandPalette;
document.addEventListener('DOMContentLoaded', () => CommandPalette.init());
