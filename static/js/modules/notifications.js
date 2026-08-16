/**
 * ZK Remote Operations Center - Smart SOC Notification & Alarm Center
 */

const Notifications = {
  items: [],
  currentTab: 'all',

  init() {
    this.trigger = document.getElementById('notifDropdownTrigger');
    this.menu = document.getElementById('notifDropdownMenu');
    this.badge = document.getElementById('notifBadgeDot');
    this.countBadge = document.getElementById('notifCountBadge');
    this.itemsContainer = document.getElementById('notifItemsList');

    if (!this.trigger || !this.menu) return;

    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShowing = this.menu.style.display === 'flex';
      this.closeAllDropdowns();
      if (!isShowing) {
        this.menu.style.display = 'flex';
        this.loadNotifications();
      }
    });

    document.addEventListener('click', (e) => {
      if (this.menu && !this.menu.contains(e.target) && !this.trigger.contains(e.target)) {
        this.menu.style.display = 'none';
      }
    });

    // Initial check
    this.loadNotifications();

    // Auto-poll live alarms every 15 seconds
    setInterval(() => this.loadNotifications(true), 15000);
  },

  closeAllDropdowns() {
    if (this.menu) this.menu.style.display = 'none';
    const userMenu = document.getElementById('userDropdownMenu');
    if (userMenu) userMenu.classList.remove('show');
  },

  async loadNotifications(isBackground = false) {
    try {
      const data = await API.get('/api/audit/notifications/');
      this.items = data.notifications || [];
      const unreadCount = data.unread_count || this.items.length;

      if (this.badge) {
        this.badge.style.display = unreadCount > 0 ? 'block' : 'none';
      }
      if (this.countBadge) {
        this.countBadge.textContent = unreadCount;
      }

      if (!isBackground || this.menu.style.display === 'flex') {
        this.renderItems();
      }
    } catch (e) {
      // Fallback
    }
  },

  filterTab(tab, btn) {
    this.currentTab = tab;
    document.querySelectorAll('.notif-tab').forEach(b => {
      b.classList.remove('active');
      b.style.background = 'transparent';
      b.style.color = 'var(--text-muted)';
    });
    if (btn) {
      btn.classList.add('active');
      btn.style.background = 'var(--sidebar-hover)';
      btn.style.color = 'var(--text-primary)';
    }
    this.renderItems();
  },

  renderItems() {
    if (!this.itemsContainer) return;

    let filtered = this.items;
    if (this.currentTab !== 'all') {
      filtered = this.items.filter(i => i.category === this.currentTab);
    }

    if (!filtered.length) {
      this.itemsContainer.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 11.5px;">
          Aktif alarm veya bildirim bulunmuyor.
        </div>
      `;
      return;
    }

    this.itemsContainer.innerHTML = filtered.map(item => {
      const borderLeft = item.severity === 'danger' ? '#EF4444' : (item.severity === 'purple' ? '#8B5CF6' : '#38BDF8');
      const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      return `
        <a href="${item.target_url || '#'}" style="padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); border-left: 3px solid ${borderLeft}; text-decoration: none; display: flex; flex-direction: column; gap: 2px; background: var(--bg-card); transition: background 0.12s ease;" onmouseover="this.style.background='var(--sidebar-hover)'" onmouseout="this.style.background='var(--bg-card)'">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <strong style="font-size: 12px; color: var(--text-primary);">${item.title}</strong>
            <span style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono);">${timeStr}</span>
          </div>
          <p style="margin: 0; font-size: 11px; color: var(--text-muted); line-height: 1.3;">${item.message}</p>
        </a>
      `;
    }).join('');
  },

  async markAllRead() {
    try {
      await API.post('/api/audit/notifications/mark-read/');
      if (this.badge) this.badge.style.display = 'none';
      if (this.countBadge) this.countBadge.textContent = '0';
      this.items.forEach(i => i.is_read = true);
      Toast.success('Tüm bildirimler okundu olarak işaretlendi.');
    } catch (e) {
      if (this.badge) this.badge.style.display = 'none';
      if (this.countBadge) this.countBadge.textContent = '0';
    }
  }
};

window.Notifications = Notifications;
document.addEventListener('DOMContentLoaded', () => Notifications.init());
