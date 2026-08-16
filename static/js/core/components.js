/**
 * ZK Remote Operations Center - Reusable UI Helpers & Modals
 */

// Toast Notifications
const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3500) {
    this.init();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" style="width:18px;height:18px;flex-shrink:0;"></i>
      <span style="flex:1;">${message}</span>
    `;

    this.container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  info(msg) { this.show(msg, 'info'); },
};

// Modal Helper
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  },

  close(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  },

  confirm({ title = 'İşlem Onayı', message, confirmText = 'Evet, Onayla', confirmClass = 'btn-primary', onConfirm }) {
    let confirmModal = document.getElementById('global-confirm-modal');
    if (!confirmModal) {
      confirmModal = document.createElement('div');
      confirmModal.id = 'global-confirm-modal';
      confirmModal.className = 'modal-overlay';
      confirmModal.innerHTML = `
        <div class="modal-container" style="max-width: 440px;">
          <div class="modal-header">
            <h3 class="modal-title" id="confirm-modal-title">
              <i data-lucide="alert-triangle" style="width: 18px; height: 18px; color: #F59E0B;"></i>
              <span>Onay</span>
            </h3>
            <button class="modal-close-btn" onclick="Modal.close('global-confirm-modal')">
              <i data-lucide="x"></i>
            </button>
          </div>
          <div class="modal-body" style="padding: 22px 20px;">
            <p id="confirm-modal-body" style="font-size: 13.5px; line-height: 1.5; color: var(--text-secondary);"></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Modal.close('global-confirm-modal')">İptal</button>
            <button class="btn" id="confirm-modal-btn">Onayla</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmModal);
    }

    const titleEl = confirmModal.querySelector('#confirm-modal-title span');
    if (titleEl) titleEl.innerText = title;
    document.getElementById('confirm-modal-body').innerText = message;
    const btn = document.getElementById('confirm-modal-btn');
    btn.className = `btn ${confirmClass}`;
    btn.innerText = confirmText;

    btn.onclick = () => {
      Modal.close('global-confirm-modal');
      if (typeof onConfirm === 'function') onConfirm();
    };

    if (window.lucide) window.lucide.createIcons();
    Modal.open('global-confirm-modal');
  },

  prompt({ title = 'Girdi', message, placeholder = '', defaultValue = '', onConfirm }) {
    let promptModal = document.getElementById('global-prompt-modal');
    if (!promptModal) {
      promptModal = document.createElement('div');
      promptModal.id = 'global-prompt-modal';
      promptModal.className = 'modal-overlay';
      promptModal.innerHTML = `
        <div class="modal-container" style="max-width: 460px;">
          <div class="modal-header">
            <h3 class="modal-title" id="prompt-modal-title">
              <i data-lucide="edit-3" style="width: 18px; height: 18px; color: var(--accent-primary);"></i>
              <span>Girdi</span>
            </h3>
            <button class="modal-close-btn" onclick="Modal.close('global-prompt-modal')">
              <i data-lucide="x"></i>
            </button>
          </div>
          <div class="modal-body" style="padding: 22px 20px; display: flex; flex-direction: column; gap: 10px;">
            <label id="prompt-modal-message" style="font-size: 13.5px; font-weight: 500; color: var(--text-secondary);"></label>
            <input type="text" id="prompt-modal-input" class="form-input" style="height: 42px; font-size: 14px;">
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="Modal.close('global-prompt-modal')">İptal</button>
            <button class="btn btn-primary" id="prompt-modal-btn">Tamam</button>
          </div>
        </div>
      `;
      document.body.appendChild(promptModal);
    }

    const titleEl = promptModal.querySelector('#prompt-modal-title span');
    if (titleEl) titleEl.innerText = title;
    document.getElementById('prompt-modal-message').innerText = message;
    const input = document.getElementById('prompt-modal-input');
    input.placeholder = placeholder;
    input.value = defaultValue;

    const confirmAction = () => {
      const val = input.value;
      Modal.close('global-prompt-modal');
      if (typeof onConfirm === 'function') onConfirm(val);
    };

    document.getElementById('prompt-modal-btn').onclick = confirmAction;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmAction();
      }
    };

    if (window.lucide) window.lucide.createIcons();
    Modal.open('global-prompt-modal');
    setTimeout(() => {
      input.focus();
      input.select();
    }, 80);
  }
};

// Global Click Listener for Dropdowns & Context Menus
document.addEventListener('click', (e) => {
  // If clicked outside any active dropdown menu or toggle button, close all dropdown menus
  if (!e.target.closest('.action-dropdown')) {
    document.querySelectorAll('.action-dropdown-menu.active').forEach(menu => {
      menu.classList.remove('active');
    });
    document.querySelectorAll('.btn-action-more.active').forEach(btn => {
      btn.classList.remove('active');
    });
  }

  // Close context menu on outside click
  const contextMenu = document.getElementById('fm-context-menu');
  if (contextMenu && !e.target.closest('#fm-context-menu')) {
    contextMenu.style.display = 'none';
  }
});

// Formatters
const Formatters = {
  fileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  timeAgo(dateString) {
    if (!dateString) return 'Hiç';
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return `${diffSec} sn önce`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dk önce`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} saat önce`;
    return `${Math.floor(diffSec / 86400)} gün önce`;
  },

  statusBadge(status) {
    const map = {
      'ONLINE': '<span class="badge badge-online"><i data-lucide="circle" style="width:6px;height:6px;fill:currentColor"></i> Çevrimiçi</span>',
      'OFFLINE': '<span class="badge badge-offline"><i data-lucide="circle" style="width:6px;height:6px;fill:currentColor"></i> Çevrimdışı</span>',
      'WARNING': '<span class="badge badge-warning"><i data-lucide="alert-circle" style="width:10px;height:10px"></i> Uyarı</span>',
    };
    return map[status] || `<span class="badge">${status}</span>`;
  },

  osBadge(os) {
    if (os === 'WINDOWS') {
      return '<span class="badge-os badge-windows"><img src="/static/img/windows.png" class="os-icon-inline" alt="Win"> Windows</span>';
    }
    return '<span class="badge-os badge-pardus"><img src="/static/img/pardus.png" class="os-icon-inline" alt="Pardus"> Pardus / Linux</span>';
  }
};

window.Toast = Toast;
window.Modal = Modal;
window.Formatters = Formatters;
