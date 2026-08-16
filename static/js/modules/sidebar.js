/**
 * ZK Remote Operations Center - Sidebar Controller
 * Supports Collapsible 80px/260px mode, live search, and tree accordion toggles
 */

const Sidebar = {
  init() {
    this.sidebar = document.getElementById('app-sidebar');
    this.restoreState();
  },

  toggleCollapse() {
    if (!this.sidebar) return;
    this.sidebar.classList.toggle('collapsed');
    const isCollapsed = this.sidebar.classList.contains('collapsed');
    localStorage.setItem('zk_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    if (window.lucide) window.lucide.createIcons();
  },

  restoreState() {
    if (!this.sidebar) return;
    const saved = localStorage.getItem('zk_sidebar_collapsed');
    if (saved === 'true') {
      this.sidebar.classList.add('collapsed');
    }
  },

  toggleTree(linkEl) {
    const group = linkEl.closest('.sidebar-tree-group');
    if (group) {
      group.classList.toggle('expanded');
    }
  },

  filterMenu(query) {
    const q = (query || '').toLowerCase();
    document.querySelectorAll('.sidebar-nav-link, .sidebar-sub-link').forEach(link => {
      const text = link.innerText.toLowerCase();
      const match = text.includes(q);
      link.style.display = match ? 'flex' : 'none';
    });
  }
};

window.Sidebar = Sidebar;
document.addEventListener('DOMContentLoaded', () => Sidebar.init());
