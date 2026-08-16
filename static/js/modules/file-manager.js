/**
 * ZK Remote Operations Center - Enterprise Luxury Interactive File Explorer & Manager
 * Supports: Real SSH (Linux) / WinRM & PowerShell (Windows), Quick Connect, and Multi-viewer
 */

const FileManager = {
  currentDeviceId: null,
  currentPath: '',
  pathSeparator: '/',
  isWindows: false,
  operatingSystem: 'LINUX',
  history: [],
  historyIndex: -1,
  selectedItem: null,
  allEntries: [],
  pathCache: new Map(), // key -> { data, timestamp }

  init() {
    this.breadcrumbContainer = document.getElementById('fm-breadcrumbs');
    this.osShortcutsContainer = document.getElementById('fm-os-shortcuts');
    this.fileTableBody = document.getElementById('fm-table-body');
    this.inspector = document.getElementById('fm-inspector');
    this.directPathInput = document.getElementById('fm-direct-path');
    this.filterInput = document.getElementById('fm-filter-input');

    this.bindEvents();
    this.updateCmdPreview();

    // Check device_id from URL query or template data-device-id or selected item
    const deviceIdParam = new URLSearchParams(window.location.search).get('device_id');
    const layoutContainer = document.getElementById('fm-layout-container');
    const selectedDeviceId = deviceIdParam || layoutContainer?.dataset.deviceId || document.querySelector('.device-menu-item.selected')?.dataset.id;

    if (selectedDeviceId && this.fileTableBody) {
      this.currentDeviceId = selectedDeviceId;
      this.navigateTo(null);
    }
  },

  selectQuickConnectOs(os) {
    const hidden = document.getElementById('qc-os-select');
    if (hidden) hidden.value = os;

    const cardLinux = document.getElementById('qc-card-linux');
    const cardWindows = document.getElementById('qc-card-windows');
    const portInput = document.getElementById('qc-port');

    if (os === 'LINUX') {
      if (cardLinux) {
        cardLinux.style.border = '2px solid #10B981';
        cardLinux.style.background = 'rgba(16, 185, 129, 0.06)';
        cardLinux.style.opacity = '1';
      }
      if (cardWindows) {
        cardWindows.style.border = '1px solid var(--border-default)';
        cardWindows.style.background = 'var(--bg-card)';
        cardWindows.style.opacity = '0.7';
      }
      if (portInput) portInput.value = '22';
    } else {
      if (cardWindows) {
        cardWindows.style.border = '2px solid #38BDF8';
        cardWindows.style.background = 'rgba(56, 189, 248, 0.08)';
        cardWindows.style.opacity = '1';
      }
      if (cardLinux) {
        cardLinux.style.border = '1px solid var(--border-default)';
        cardLinux.style.background = 'var(--bg-card)';
        cardLinux.style.opacity = '0.7';
      }
      if (portInput) portInput.value = '22';
    }

    this.updateCmdPreview();
  },

  updateCmdPreview() {
    const previewEl = document.getElementById('qc-cmd-preview');
    const badgeEl = document.getElementById('qc-os-badge');
    const os = document.getElementById('qc-os-select')?.value || 'LINUX';
    const ip = document.getElementById('qc-ip')?.value.trim() || '10.211.31.42';
    const user = document.getElementById('qc-username')?.value.trim() || 'root';
    const port = document.getElementById('qc-port')?.value.trim() || '22';

    if (previewEl) {
      const portSuffix = port !== '22' ? ` -p ${port}` : '';
      previewEl.textContent = `ssh ${user}@${ip}${portSuffix}`;
    }

    if (badgeEl) {
      if (os === 'WINDOWS') {
        badgeEl.className = 'badge blue font-bold';
        badgeEl.textContent = `WINDOWS / SSH (Port ${port})`;
      } else {
        badgeEl.className = 'badge green font-bold';
        badgeEl.textContent = `PARDUS / SSH (Port ${port})`;
      }
    }
  },

  logConsole(msg, type = 'status') {
    const logContainer = document.getElementById('fz-console-log');
    if (!logContainer) return;
    const line = document.createElement('div');
    line.className = `fz-log-line ${type}`;
    line.textContent = msg;
    logContainer.appendChild(line);
    logContainer.scrollTop = logContainer.scrollHeight;
  },

  bindEvents() {
    if (this.directPathInput) {
      this.directPathInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.navigateTo(this.directPathInput.value.trim());
        }
      });
    }

    if (this.filterInput) {
      this.filterInput.addEventListener('input', (e) => {
        this.filterTable(e.target.value.trim().toLowerCase());
      });
    }

    // Toolbar buttons
    document.getElementById('fm-btn-refresh')?.addEventListener('click', () => this.refresh());
    document.getElementById('fm-btn-up')?.addEventListener('click', () => this.goUp());
    document.getElementById('fm-btn-back')?.addEventListener('click', () => this.goBack());
    document.getElementById('fm-btn-forward')?.addEventListener('click', () => this.goForward());
    document.getElementById('fm-btn-mkdir')?.addEventListener('click', () => this.promptMkdir());
    document.getElementById('fm-btn-upload')?.addEventListener('click', () => this.triggerUploadPicker());

    // File input change for upload
    const uploadInput = document.getElementById('fm-file-input');
    if (uploadInput) {
      uploadInput.addEventListener('change', (e) => this.handleUploadFiles(e.target.files));
    }

    // Drag & Drop SFTP upload overlay handlers
    const dropZone = document.getElementById('fm-file-list-container');
    const overlay = document.getElementById('fm-dropzone-overlay');
    if (dropZone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (overlay) overlay.classList.add('active');
        });
      });

      ['dragleave', 'dragend'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = dropZone.getBoundingClientRect();
          if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
            if (overlay) overlay.classList.remove('active');
          }
        });
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (overlay) overlay.classList.remove('active');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleUploadFiles(e.dataTransfer.files);
        }
      });
    }

    // Global click listener to close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#custom-device-dropdown') && !e.target.closest('#quick-connect-modal') && !e.target.closest('#fm-standby-view')) {
        const menu = document.getElementById('custom-device-menu');
        if (menu) {
          menu.classList.remove('active');
          menu.style.display = 'none';
        }
        document.getElementById('custom-device-btn')?.classList.remove('active');
      }
    });
  },

  toggleDeviceDropdown(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const btn = document.getElementById('custom-device-btn');
    const menu = document.getElementById('custom-device-menu');
    if (!menu) return;

    const isOpen = menu.classList.contains('active') || menu.style.display === 'flex';
    if (isOpen) {
      menu.classList.remove('active');
      menu.style.display = 'none';
      if (btn) btn.classList.remove('active');
    } else {
      menu.classList.add('active');
      menu.style.display = 'flex';
      if (btn) btn.classList.add('active');
      const searchInput = document.getElementById('device-menu-search-input');
      if (searchInput) {
        searchInput.value = '';
        this.filterDeviceMenu('');
        setTimeout(() => searchInput.focus(), 60);
      }
    }
  },

  filterDeviceMenu(query) {
    const q = (query || '').toLowerCase();
    document.querySelectorAll('.device-menu-item').forEach(item => {
      const name = (item.dataset.hostname || '').toLowerCase();
      const ip = (item.dataset.ip || '').toLowerCase();
      const pers = (item.dataset.personnel || '').toLowerCase();
      const match = name.includes(q) || ip.includes(q) || pers.includes(q);
      item.style.display = match ? 'flex' : 'none';
    });
  },

  selectDevice(deviceId) {
    if (!deviceId) return;
    window.location.href = `/files/?device_id=${encodeURIComponent(deviceId)}`;
  },

  showConnectingState(hostname, ip, user, os) {
    const standbyView = document.getElementById('fm-standby-view');
    const connectingView = document.getElementById('fm-connecting-view');
    const mainTable = document.getElementById('fm-main-table');

    // Hide standby and table, show connecting
    if (standbyView) standbyView.style.display = 'none';
    if (mainTable) mainTable.style.display = 'none';
    if (connectingView) connectingView.style.display = 'flex';

    // Update connecting info
    const titleEl = document.getElementById('fm-connecting-title');
    const targetEl = document.getElementById('fm-connecting-target');
    if (titleEl) titleEl.textContent = `${hostname || ip} Sunucusuna Bağlanılıyor...`;
    if (targetEl) targetEl.textContent = `ssh ${user}@${ip}`;

    // Reset all steps
    const steps = ['fm-step-auth', 'fm-step-sftp', 'fm-step-scan'];
    steps.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.className = 'fm-connect-step';
        const icon = el.querySelector('.fm-step-icon');
        if (icon) icon.textContent = steps.indexOf(id) + 1;
      }
    });

    // Animate steps sequentially
    const self = this;
    const stepDelay = 600;

    // Step 1: SSH Auth
    setTimeout(() => {
      const s1 = document.getElementById('fm-step-auth');
      if (s1) {
        s1.classList.add('active');
        const icon = s1.querySelector('.fm-step-icon');
        if (icon) icon.innerHTML = '⟳';
      }
    }, 100);

    // Step 1 done, Step 2 start
    setTimeout(() => {
      const s1 = document.getElementById('fm-step-auth');
      if (s1) {
        s1.className = 'fm-connect-step done';
        const icon = s1.querySelector('.fm-step-icon');
        if (icon) icon.innerHTML = '✓';
      }
      const s2 = document.getElementById('fm-step-sftp');
      if (s2) {
        s2.classList.add('active');
        const icon = s2.querySelector('.fm-step-icon');
        if (icon) icon.innerHTML = '⟳';
      }
    }, stepDelay + 100);

    // Step 2 done, Step 3 start
    setTimeout(() => {
      const s2 = document.getElementById('fm-step-sftp');
      if (s2) {
        s2.className = 'fm-connect-step done';
        const icon = s2.querySelector('.fm-step-icon');
        if (icon) icon.innerHTML = '✓';
      }
      const s3 = document.getElementById('fm-step-scan');
      if (s3) {
        s3.classList.add('active');
        const icon = s3.querySelector('.fm-step-icon');
        if (icon) icon.innerHTML = '⟳';
      }
    }, stepDelay * 2 + 100);

    // Step 3 done, navigate
    setTimeout(() => {
      const s3 = document.getElementById('fm-step-scan');
      if (s3) {
        s3.className = 'fm-connect-step done';
        const icon = s3.querySelector('.fm-step-icon');
        if (icon) icon.innerHTML = '✓';
      }

      // Small pause before showing files
      setTimeout(() => {
        if (connectingView) connectingView.style.display = 'none';
        if (mainTable) mainTable.style.display = 'table';
        self.navigateTo(null);
      }, 300);
    }, stepDelay * 3 + 100);
  },

  openQuickConnectModal() {
    document.getElementById('custom-device-menu')?.classList.remove('active');
    document.getElementById('custom-device-btn')?.classList.remove('active');
    this.updateCmdPreview();
    Modal.open('quick-connect-modal');
  },

  async handleQuickConnectSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('qc-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:14px;height:14px;"></i> SSH Bağlantısı Test Ediliyor...';
      if (window.lucide) window.lucide.createIcons();
    }

    const username = document.getElementById('qc-username').value.trim();
    const ip = document.getElementById('qc-ip').value.trim();
    const os = document.getElementById('qc-os-select')?.value || 'LINUX';
    const port = parseInt(document.getElementById('qc-port').value, 10) || 22;
    const secret = document.getElementById('qc-password').value;
    let hostname = document.getElementById('qc-hostname')?.value.trim();
    if (!hostname) {
      hostname = `${os === 'WINDOWS' ? 'WIN' : 'PARDUS'}-${username}@${ip}`;
    }

    const personnel = username.length >= 4 ? username : `USER-${username}-${Date.now().toString().slice(-4)}`;

    try {
      const payload = {
        personnel_number: personnel,
        hostname: hostname,
        display_name: hostname,
        operating_system: os,
        ip_address: ip,
        port: port,
        username: username,
        connector_type: os === 'WINDOWS' ? 'WINDOWS_REMOTE' : 'SSH',
        status: 'ONLINE',
        credential: {
          credential_type: 'PASSWORD',
          secret: secret
        }
      };

      const newDevice = await API.post('/api/devices/', payload);
      Toast.success(`'${hostname}' (${ip}) cihazına ${os === 'WINDOWS' ? 'Windows' : 'Pardus/SSH'} bağlantısı sağlandı ve eklendi.`);

      // Add to menu list dynamically
      const menuList = document.getElementById('device-menu-list');
      if (menuList) {
        const itemEl = document.createElement('div');
        itemEl.className = 'device-menu-item selected';
        itemEl.dataset.id = newDevice.id;
        itemEl.dataset.hostname = newDevice.hostname;
        itemEl.dataset.ip = newDevice.ip_address;
        itemEl.dataset.personnel = newDevice.personnel_number;
        itemEl.dataset.os = newDevice.operating_system;
        itemEl.dataset.osDisplay = newDevice.os_display || 'Linux';
        itemEl.onclick = () => FileManager.selectDevice(newDevice.id);

        itemEl.innerHTML = `
          <div class="device-item-icon">
            <i data-lucide="terminal" style="width: 15px; height: 15px; color: #F59E0B;"></i>
          </div>
          <div class="device-item-info">
            <div class="device-item-name">
              ${newDevice.hostname}
              <span class="device-item-badge">SSH</span>
            </div>
            <div class="device-item-sub">${newDevice.ip_address} • Sicil: ${newDevice.personnel_number}</div>
          </div>
          <div class="device-item-status">
            <span class="status-dot status-online"></span>
          </div>
        `;
        menuList.prepend(itemEl);
      }

      Modal.close('quick-connect-modal');
      this.selectDevice(newDevice.id, true);
    } catch (err) {
      Toast.error(`Bağlantı hatası: ${err.message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="zap" style="width: 14px; height: 14px;"></i> Bağlan ve Verileri Çek';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  },

  async loadDirectory() {
    this.navigateTo(this.currentPath || null);
  },

  async navigateTo(path, addToHistory = true) {
    if (!this.currentDeviceId) return;

    const cacheKey = `${this.currentDeviceId}:${path || '__default__'}`;
    const cached = this.pathCache.get(cacheKey);
    const now = Date.now();

    // If valid cache exists (TTL: 30s), render immediately without skeleton flash!
    if (cached && (now - cached.timestamp < 30000)) {
      const data = cached.data;
      this.currentPath = data.current_path;
      this.pathSeparator = data.path_separator;
      this.isWindows = data.is_windows || data.operating_system === 'WINDOWS';
      this.operatingSystem = data.operating_system || (this.isWindows ? 'WINDOWS' : 'LINUX');
      this.allEntries = data.entries || [];

      if (this.directPathInput) this.directPathInput.value = this.currentPath;

      if (addToHistory) {
        if (this.historyIndex < this.history.length - 1) {
          this.history = this.history.slice(0, this.historyIndex + 1);
        }
        this.history.push(this.currentPath);
        this.historyIndex = this.history.length - 1;
      }

      this.updateHistoryButtons();
      this.renderOSShortcuts(data.roots || []);
      this.renderBreadcrumbs(data.breadcrumbs || []);
      this.renderTable(this.allEntries);
      return;
    }

    this.renderSkeleton();
    this.selectedItem = null;
    this.updateInspector(null);

    const syncIcon = document.querySelector('.sync-icon');
    if (syncIcon) syncIcon.style.animation = 'spin 0.8s linear infinite';

    try {
      const params = path ? { path } : {};
      const data = await API.get(`/api/devices/${this.currentDeviceId}/files/`, params);

      // Save to pathCache
      this.pathCache.set(cacheKey, { data: data, timestamp: Date.now() });

      this.currentPath = data.current_path;
      this.pathSeparator = data.path_separator;
      this.isWindows = data.is_windows || data.operating_system === 'WINDOWS';
      this.operatingSystem = data.operating_system || (this.isWindows ? 'WINDOWS' : 'LINUX');
      this.allEntries = data.entries || [];

      if (this.directPathInput) {
        this.directPathInput.value = this.currentPath;
      }

      if (addToHistory) {
        if (this.historyIndex < this.history.length - 1) {
          this.history = this.history.slice(0, this.historyIndex + 1);
        }
        this.history.push(this.currentPath);
        this.historyIndex = this.history.length - 1;
      }

      this.updateHistoryButtons();
      this.renderOSShortcuts(data.roots || []);
      this.renderBreadcrumbs(data.breadcrumbs || []);
      this.renderTable(this.allEntries);

      const led = document.getElementById('fz-status-led');
      const ledText = document.getElementById('fz-status-text');
      if (led) {
        led.style.backgroundColor = '#10B981';
        led.style.boxShadow = '0 0 8px #10B981';
      }
      if (ledText) {
        ledText.textContent = this.isWindows ? 'Windows (WinRM/SFTP)' : 'Linux (SSH/SFTP)';
      }
    } catch (err) {
      this.renderError(err.message || 'Dizin listelenemedi.');
      const led = document.getElementById('fz-status-led');
      const ledText = document.getElementById('fz-status-text');
      if (led) {
        led.style.backgroundColor = '#EF4444';
        led.style.boxShadow = '0 0 8px #EF4444';
      }
      if (ledText) ledText.textContent = 'Bağlantı Hatası';
    } finally {
      if (syncIcon) syncIcon.style.animation = '';
    }
  },

  renderOSShortcuts(roots) {
    if (!this.osShortcutsContainer) return;
    this.osShortcutsContainer.innerHTML = '';

    if (this.isWindows) {
      const winShortcuts = [
        { name: 'C:\\', path: 'C:\\' },
        { name: 'Users', path: 'C:\\Users' },
        { name: 'Program Files', path: 'C:\\Program Files' },
        { name: 'Temp', path: 'C:\\Windows\\Temp' },
      ];

      winShortcuts.forEach(sc => {
        const btn = document.createElement('button');
        btn.className = 'os-quick-pill';
        btn.innerHTML = `<i data-lucide="hard-drive" style="width: 12px; height: 12px; color: #38BDF8;"></i> ${sc.name}`;
        btn.title = sc.path;
        btn.addEventListener('click', () => this.navigateTo(sc.path));
        this.osShortcutsContainer.appendChild(btn);
      });
    } else {
      const linuxShortcuts = [
        { name: 'kök (/)', path: '/' },
        { name: 'home', path: '/home' },
        { name: 'etc', path: '/etc' },
        { name: 'var/log', path: '/var/log' },
        { name: 'tmp', path: '/tmp' },
      ];

      linuxShortcuts.forEach(sc => {
        const btn = document.createElement('button');
        btn.className = 'os-quick-pill';
        btn.innerHTML = `<i data-lucide="folder" style="width: 12px; height: 12px; color: #F59E0B;"></i> ${sc.name}`;
        btn.title = sc.path;
        btn.addEventListener('click', () => this.navigateTo(sc.path));
        this.osShortcutsContainer.appendChild(btn);
      });
    }

    if (window.lucide) window.lucide.createIcons();
  },

  renderBreadcrumbs(breadcrumbs) {
    const container = document.getElementById('fm-breadcrumbs');
    if (!container) return;

    if (!breadcrumbs || !breadcrumbs.length) {
      const p = this.currentPath || (this.isWindows ? 'C:\\' : '/');
      const isWin = this.isWindows;
      const parts = isWin ? p.split('\\').filter(Boolean) : p.split('/').filter(Boolean);
      breadcrumbs = [];
      let accumulated = '';
      if (!isWin) {
        breadcrumbs.push({ name: '/', path: '/' });
      }
      parts.forEach((part, i) => {
        if (isWin) {
          accumulated += (i === 0 ? part : '\\' + part);
          breadcrumbs.push({ name: part, path: accumulated + (i === 0 ? '\\' : '') });
        } else {
          accumulated += '/' + part;
          breadcrumbs.push({ name: part, path: accumulated });
        }
      });
    }

    container.innerHTML = breadcrumbs.map((b, idx) => `
      <span class="breadcrumb-crumb" onclick="event.stopPropagation(); FileManager.navigateTo('${b.path.replace(/\\/g, '\\\\')}')">
        ${b.name}
      </span>
      ${idx < breadcrumbs.length - 1 ? '<span class="breadcrumb-sep">&gt;</span>' : ''}
    `).join('');
  },

  enableDirectPathEdit(e) {
    if (e && e.target.closest('.breadcrumb-crumb')) return;
    const addressBar = document.getElementById('fm-address-bar');
    const breadcrumbBox = document.getElementById('fm-breadcrumbs');
    const input = document.getElementById('fm-direct-path');
    if (!input || !breadcrumbBox) return;

    addressBar?.classList.add('editing');
    breadcrumbBox.style.display = 'none';
    input.style.display = 'block';
    input.value = this.currentPath || (this.isWindows ? 'C:\\' : '/');
    input.focus();
    input.select();
  },

  disableDirectPathEdit() {
    setTimeout(() => {
      const addressBar = document.getElementById('fm-address-bar');
      const breadcrumbBox = document.getElementById('fm-breadcrumbs');
      const input = document.getElementById('fm-direct-path');
      if (!input || !breadcrumbBox) return;

      addressBar?.classList.remove('editing');
      input.style.display = 'none';
      breadcrumbBox.style.display = 'flex';
    }, 200);
  },

  applyDirectPath() {
    const input = document.getElementById('fm-direct-path');
    if (!input) return;
    const targetPath = input.value.trim();
    if (targetPath) {
      this.navigateTo(targetPath);
      this.disableDirectPathEdit();
    }
  },

  filterTable(query) {
    if (!query) {
      this.renderTable(this.allEntries);
      return;
    }
    const filtered = this.allEntries.filter(e => e.name.toLowerCase().includes(query));
    this.renderTable(filtered);
  },

  refresh() {
    this.navigateTo(this.currentPath, false);
  },

  goUp() {
    if (!this.currentPath) return;
    if (this.isWindows) {
      const parts = this.currentPath.replace(/\//g, '\\').split('\\').filter(Boolean);
      if (parts.length <= 1) {
        this.navigateTo('C:\\');
      } else {
        parts.pop();
        const parent = parts.join('\\') + (parts.length === 1 ? '\\' : '');
        this.navigateTo(parent);
      }
    } else {
      const parts = this.currentPath.split('/').filter(Boolean);
      if (parts.length <= 1) {
        this.navigateTo('/');
      } else {
        parts.pop();
        this.navigateTo('/' + parts.join('/'));
      }
    }
  },

  goBack() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.navigateTo(this.history[this.historyIndex], false);
    }
  },

  goForward() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.navigateTo(this.history[this.historyIndex], false);
    }
  },

  updateHistoryButtons() {
    const btnBack = document.getElementById('fm-btn-back');
    const btnFwd = document.getElementById('fm-btn-forward');
    if (btnBack) btnBack.disabled = this.historyIndex <= 0;
    if (btnFwd) btnFwd.disabled = this.historyIndex >= this.history.length - 1;
  },

  renderBreadcrumbs(breadcrumbs) {
    if (!this.breadcrumbContainer) return;
    this.breadcrumbContainer.innerHTML = '';

    breadcrumbs.forEach((crumb, idx) => {
      if (idx > 0) {
        const div = document.createElement('span');
        div.className = 'breadcrumb-divider';
        div.textContent = this.isWindows ? '\\' : '/';
        this.breadcrumbContainer.appendChild(div);
      }

      const seg = document.createElement('span');
      seg.className = `breadcrumb-crumb ${idx === breadcrumbs.length - 1 ? 'active' : ''}`;
      seg.textContent = crumb.name;
      seg.title = crumb.path;
      if (idx !== breadcrumbs.length - 1) {
        seg.addEventListener('click', () => this.navigateTo(crumb.path));
      }
      this.breadcrumbContainer.appendChild(seg);
    });
  },

  renderSkeleton(rowCount = 6) {
    if (!this.fileTableBody) return;
    let html = '';
    for (let i = 0; i < rowCount; i++) {
      const nameWidth = [45, 65, 35, 55, 75, 40][i % 6];
      html += `
        <tr class="zk-skeleton-table-row">
          <td style="width: 40px; padding: 10px 14px;">
            <div class="zk-skeleton" style="width: 20px; height: 20px; border-radius: 5px;"></div>
          </td>
          <td style="padding: 10px 14px;">
            <div class="zk-skeleton" style="width: ${nameWidth}%; height: 14px; border-radius: 4px;"></div>
          </td>
          <td style="width: 100px; padding: 10px 14px;">
            <div class="zk-skeleton" style="width: 55px; height: 12px; border-radius: 4px;"></div>
          </td>
          <td style="width: 130px; padding: 10px 14px;">
            <div class="zk-skeleton" style="width: 85px; height: 12px; border-radius: 4px;"></div>
          </td>
          <td style="width: 140px; padding: 10px 14px;">
            <div class="zk-skeleton" style="width: 100px; height: 12px; border-radius: 4px;"></div>
          </td>
          <td style="width: 100px; padding: 10px 14px; text-align: right;">
            <div class="zk-skeleton" style="width: 65px; height: 14px; border-radius: 4px; display: inline-block;"></div>
          </td>
        </tr>
      `;
    }
    this.fileTableBody.innerHTML = html;
  },

  renderError(msg) {
    if (!this.fileTableBody) return;
    this.fileTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="padding: 40px 20px; text-align: center;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--status-offline);">
            <i data-lucide="alert-triangle" style="width: 32px; height: 32px;"></i>
            <h4 style="font-size: 15px; font-weight: 600; color: var(--text-primary);">Dizin Okunamadı</h4>
            <p style="font-size: 13px; color: var(--text-muted); max-width: 450px;">${msg}</p>
            <button class="btn btn-secondary btn-sm" onclick="FileManager.refresh()" style="margin-top: 6px;">
              <i data-lucide="refresh-cw" style="width: 13px; height: 13px;"></i> Tekrar Dene
            </button>
          </div>
        </td>
      </tr>
    `;
    if (window.lucide) window.lucide.createIcons();
  },

  renderTable(entries) {
    if (!this.fileTableBody) return;
    this.fileTableBody.innerHTML = '';

    if (entries.length === 0) {
      this.fileTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 36px; color: var(--text-muted);">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <i data-lucide="folder-open" style="width: 32px; height: 32px; stroke-width: 1.5;"></i>
              <span>Bu dizin boş</span>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    entries.forEach((entry) => {
      const row = document.createElement('tr');
      row.className = 'fm-table-row';
      row.dataset.path = entry.path;
      row.dataset.isDir = entry.is_dir;

      const iconName = entry.is_dir ? 'folder' : this.getFileIcon(entry.extension);
      const iconColor = entry.is_dir ? '#F59E0B' : this.getFileIconColor(entry.extension);
      const sizeStr = entry.is_dir ? '--' : this.formatBytes(entry.size);
      const modStr = entry.modified_time ? new Date(entry.modified_time).toLocaleString('tr-TR') : '--';

      row.innerHTML = `
        <td style="text-align: center; width: 36px;">
          <input type="checkbox" class="fm-row-checkbox" value="${entry.path}" onclick="event.stopPropagation()">
        </td>
        <td>
          <div class="fm-cell-name">
            <i data-lucide="${iconName}" style="width: 17px; height: 17px; color: ${iconColor}; flex-shrink: 0;"></i>
            <span class="fm-filename" title="${entry.name}">${entry.name}</span>
          </div>
        </td>
        <td><span class="badge ${entry.is_dir ? 'badge-primary' : 'badge-neutral'}">${entry.is_dir ? 'Klasör' : (entry.extension.toUpperCase() || 'Dosya')}</span></td>
        <td style="font-family: var(--font-mono); font-size: 12px;">${sizeStr}</td>
        <td style="font-size: 12px; color: var(--text-muted);">${modStr}</td>
        <td style="font-family: var(--font-mono); font-size: 12px;">${entry.permissions || (this.isWindows ? 'ACL' : '0755')}</td>
        <td style="font-size: 12px;">${entry.owner || (this.isWindows ? 'SYSTEM' : 'root')}</td>
        <td class="actions-cell">
          <div class="action-dropdown" onclick="event.stopPropagation()">
            <button class="btn-action-more" onclick="FileManager.toggleRowMenu(this, event)" title="İşlemler">
              <i data-lucide="more-horizontal" style="width: 16px; height: 16px;"></i>
            </button>
            <div class="action-dropdown-menu">
              ${!entry.is_dir ? `
                <div class="action-menu-item" onclick="FileManager.downloadFile('${entry.path}')">
                  <i data-lucide="download" style="width: 14px; height: 14px;"></i> İndir
                </div>
                <div class="action-menu-item" onclick="FileManager.handleOpenItem('${entry.path}', false, '${entry.name}')">
                  <i data-lucide="eye" style="width: 14px; height: 14px;"></i> Görüntüle / Düzenle
                </div>
              ` : `
                <div class="action-menu-item" onclick="FileManager.navigateTo('${entry.path}')">
                  <i data-lucide="folder-open" style="width: 14px; height: 14px;"></i> Klasörü Aç
                </div>
              `}
              <div class="action-menu-item" onclick="FileManager.promptRename('${entry.path}', '${entry.name}')">
                <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> Yeniden Adlandır
              </div>
              <div class="action-menu-item" onclick="FileManager.openChmodModalByPath('${entry.path}', '${entry.permissions || '0755'}')">
                <i data-lucide="shield-check" style="width: 14px; height: 14px; color: #8B5CF6;"></i> İzinleri Düzenle (chmod)
              </div>
              <div class="action-menu-item" onclick="FileManager.promptArchive('${entry.path}', '${entry.name}')">
                <i data-lucide="archive" style="width: 14px; height: 14px; color: #F59E0B;"></i> Arşivle (.tar.gz)
              </div>
              ${(entry.name.endsWith('.zip') || entry.name.endsWith('.tar.gz') || entry.name.endsWith('.tgz')) ? `
                <div class="action-menu-item" onclick="FileManager.promptExtract('${entry.path}')">
                  <i data-lucide="folder-archive" style="width: 14px; height: 14px; color: #10B981;"></i> Arşivden Çıkar
                </div>
              ` : ''}
              <div class="action-menu-divider"></div>
              <div class="action-menu-item danger" onclick="FileManager.promptDelete('${entry.path}')">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Sil
              </div>
            </div>
          </div>
        </td>
      `;

      // Row Click to select & Inspect
      row.addEventListener('click', () => {
        this.selectRow(row, entry);
      });

      // Double Click to open
      row.addEventListener('dblclick', () => {
        this.handleOpenItem(entry.path, entry.is_dir, entry.name);
      });

      this.fileTableBody.appendChild(row);
    });

    if (window.lucide) window.lucide.createIcons();
  },

  toggleRowMenu(btn, event) {
    if (event) event.stopPropagation();
    const menu = btn.nextElementSibling;
    const isActive = menu && menu.classList.contains('active');

    // Close all other open action menus
    document.querySelectorAll('.action-dropdown-menu.active').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));

    if (menu && !isActive) {
      menu.classList.add('active');
      btn.classList.add('active');
    }
  },

  selectRow(row, entry) {
    document.querySelectorAll('.fm-table-row').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
    this.selectedItem = entry;
    this.updateInspector(entry);
  },

  handleOpenItem(path, isDir, name) {
    document.querySelectorAll('.action-dropdown-menu.active').forEach(m => m.classList.remove('active'));

    if (isDir) {
      this.navigateTo(path);
    } else {
      if (window.FilePreview) {
        window.FilePreview.open(this.currentDeviceId, path, name);
      }
    }
  },

  updateInspector(entry) {
    if (!this.inspector) return;
    if (!entry) {
      this.inspector.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
          Bir dosya veya klasör seçin
        </div>
      `;
      return;
    }

    const iconName = entry.is_dir ? 'folder' : this.getFileIcon(entry.extension);
    const iconColor = entry.is_dir ? '#F59E0B' : this.getFileIconColor(entry.extension);

    this.inspector.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; text-align: center; padding-bottom: 14px; border-bottom: 1px solid var(--border-color);">
        <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
          <i data-lucide="${iconName}" style="width: 24px; height: 24px; color: ${iconColor};"></i>
        </div>
        <h4 style="font-size: 13.5px; font-weight: 600; color: var(--text-primary); word-break: break-all;">${entry.name}</h4>
        <span style="font-size: 11.5px; color: var(--text-muted);">${entry.is_dir ? 'Klasör' : (entry.extension.toUpperCase() || 'Dosya')}</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; padding-top: 10px;">
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Boyut:</span> <span style="font-family: var(--font-mono);">${this.formatBytes(entry.size)}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">İzinler:</span> <span style="font-family: var(--font-mono);">${entry.permissions || (this.isWindows ? 'ACL' : '0755')}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: var(--text-muted);">Sahip:</span> <span>${entry.owner || (this.isWindows ? 'SYSTEM' : 'root')}</span></div>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="color: var(--text-muted);">Tam Yol:</span>
          <span style="font-family: var(--font-mono); font-size: 11px; word-break: break-all; background: var(--bg-secondary); padding: 5px 8px; border-radius: 6px;">${entry.path}</span>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 6px; margin-top: auto; padding-top: 14px;">
        ${!entry.is_dir ? `
          <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="FileManager.downloadFile('${entry.path}')">
            <i data-lucide="download" style="width: 13px; height: 13px;"></i> İndir
          </button>
          <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="FileManager.handleOpenItem('${entry.path}', false, '${entry.name}')">
            <i data-lucide="eye" style="width: 13px; height: 13px;"></i> Görüntüle / Düzenle
          </button>
        ` : ''}
        <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="FileManager.promptRename('${entry.path}', '${entry.name}')">
          <i data-lucide="edit-3" style="width: 13px; height: 13px;"></i> Yeniden Adlandır
        </button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  },

  downloadFile(path) {
    document.querySelectorAll('.action-dropdown-menu.active').forEach(m => m.classList.remove('active'));
    window.location.href = `/api/devices/${this.currentDeviceId}/files/download/?path=${encodeURIComponent(path)}`;
    Toast.success('Dosya indirme başlatıldı.');
  },

  promptMkdir() {
    Modal.prompt({
      title: 'Yeni Klasör Oluştur',
      message: 'Oluşturulacak klasör adını giriniz:',
      placeholder: 'yeni_klasor',
      onConfirm: async (folderName) => {
        if (!folderName || !folderName.trim()) return;
        try {
          await API.post(`/api/devices/${this.currentDeviceId}/files/mkdir/`, {
            path: this.currentPath,
            name: folderName.trim()
          });
          Toast.success(`'${folderName}' klasörü başarıyla oluşturuldu.`);
          this.refresh();
        } catch (err) {
          Toast.error(err.message || 'Klasör oluşturulamadı.');
        }
      }
    });
  },

  promptNewFile() {
    Modal.prompt({
      title: 'Yeni Boş Dosya Oluştur',
      message: 'Oluşturulacak dosya adını ve uzantısını giriniz:',
      placeholder: 'script.sh veya ayarlar.json',
      onConfirm: async (fileName) => {
        if (!fileName || !fileName.trim()) return;
        try {
          const blob = new Blob([''], { type: 'text/plain' });
          const file = new File([blob], fileName.trim());
          const formData = new FormData();
          formData.append('path', this.currentPath);
          formData.append('file', file);
          formData.append('overwrite', 'true');

          await API.upload(`/api/devices/${this.currentDeviceId}/files/upload/`, formData);
          Toast.success(`'${fileName}' dosyası oluşturuldu.`);
          this.refresh();
        } catch (err) {
          Toast.error(err.message || 'Dosya oluşturulamadı.');
        }
      }
    });
  },

  promptRename(path, oldName) {
    document.querySelectorAll('.action-dropdown-menu.active').forEach(m => m.classList.remove('active'));
    Modal.prompt({
      title: 'Yeniden Adlandır',
      message: `'${oldName}' için yeni ismi giriniz:`,
      defaultValue: oldName,
      onConfirm: async (newName) => {
        if (!newName || !newName.trim() || newName.trim() === oldName) return;
        try {
          await API.post(`/api/devices/${this.currentDeviceId}/files/rename/`, {
            path,
            new_name: newName.trim()
          });
          Toast.success('Yeniden adlandırma başarılı.');
          this.refresh();
        } catch (err) {
          Toast.error(err.message || 'Yeniden adlandırılamadı.');
        }
      }
    });
  },

  promptDelete(path) {
    document.querySelectorAll('.action-dropdown-menu.active').forEach(m => m.classList.remove('active'));
    Modal.confirm({
      title: 'Öğeyi Sil',
      message: `'${path}' konumundaki öğeyi kalıcı olarak silmek istediğinize emin misiniz? (Linux: rm -rf)`,
      confirmText: 'Evet, Sil',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          await API.post(`/api/devices/${this.currentDeviceId}/files/delete/`, { path });
          Toast.success('Öğe başarıyla silindi.');
          this.refresh();
        } catch (err) {
          Toast.error(err.message || 'Silme işlemi başarısız.');
        }
      }
    });
  },

  triggerUploadPicker() {
    document.getElementById('fm-file-input')?.click();
  },

  async handleUploadFiles(files) {
    if (!files || files.length === 0) return;
    const count = files.length;
    Toast.info(`${count} dosya yükleniyor...`);

    let uploaded = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('path', this.currentPath);
      formData.append('file', file);
      formData.append('overwrite', 'true');

      try {
        await API.upload(`/api/devices/${this.currentDeviceId}/files/upload/`, formData);
        uploaded++;
      } catch (err) {
        Toast.error(`'${file.name}' yüklenemedi: ${err.message}`);
      }
    }

    if (uploaded > 0) {
      Toast.success(`${uploaded} dosya başarıyla yüklendi.`);
      this.refresh();
    }
  },

  toggleSelectAll(checked) {
    document.querySelectorAll('.fm-row-checkbox').forEach(cb => cb.checked = checked);
  },

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  getFileIcon(ext) {
    if (!ext) return 'file';
    const extLower = ext.toLowerCase();
    const map = {
      pdf: 'file-text',
      txt: 'file-text',
      log: 'file-text',
      md: 'file-text',
      py: 'file-code',
      js: 'file-code',
      json: 'file-code',
      html: 'file-code',
      css: 'file-code',
      sh: 'terminal',
      bat: 'terminal',
      ps1: 'terminal',
      zip: 'archive',
      tar: 'archive',
      gz: 'archive',
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      gif: 'image',
      svg: 'image',
    };
    return map[extLower] || 'file';
  },

  getFileIconColor(ext) {
    if (!ext) return 'var(--text-muted)';
    const extLower = ext.toLowerCase();
    if (['py', 'js', 'json', 'html', 'css'].includes(extLower)) return '#38BDF8';
    if (['sh', 'bat', 'ps1'].includes(extLower)) return '#10B981';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(extLower)) return '#A855F7';
    if (['zip', 'tar', 'gz'].includes(extLower)) return '#EC4899';
    if (['pdf', 'log'].includes(extLower)) return '#EF4444';
    return 'var(--text-secondary)';
  },

  // ─── 4 Enterprise Modules ───

  openGrepModal() {
    Modal.open('grep-search-modal');
    setTimeout(() => {
      const input = document.getElementById('grep-query-input');
      if (input) input.focus();
    }, 150);
  },

  async executeGrep(e) {
    if (e) e.preventDefault();
    const query = document.getElementById('grep-query-input').value.trim();
    if (!query) return;

    const statusText = document.getElementById('grep-status-text');
    const tbody = document.getElementById('grep-results-tbody');
    statusText.innerHTML = `<span style="color:var(--accent-primary);"><i data-lucide="loader-2" class="spin" style="width:12px;height:12px;display:inline-block;"></i> '${query}' terimi taranıyor...</span>`;
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:24px;color:var(--text-muted);">Arama yapılıyor...</td></tr>`;
    if (window.lucide) window.lucide.createIcons();

    try {
      const res = await API.post(`/api/devices/${this.currentDeviceId}/files/grep/`, {
        path: this.currentPath,
        query: query
      });

      statusText.innerHTML = `Toplam <strong>${res.count}</strong> eşleşme bulundu (${res.path}).`;
      if (!res.matches || !res.matches.length) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:24px;color:var(--text-muted);">'${query}' ile eşleşen dosya içeriği bulunamadı.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.matches.map(m => `
        <tr class="fm-table-row" style="cursor:pointer;" onclick="FileManager.handleOpenItem('${m.file}', false, '${m.file.split('/').pop()}')">
          <td style="font-family:var(--font-mono);font-size:11px;color:var(--accent-primary);font-weight:600;">${m.file}</td>
          <td style="text-align:center;font-family:var(--font-mono);color:var(--text-muted);">${m.line_number}</td>
          <td style="font-family:var(--font-mono);font-size:11.5px;color:var(--text-primary);"><code style="background:var(--bg-surface);padding:2px 6px;border-radius:4px;">${m.snippet}</code></td>
        </tr>
      `).join('');
    } catch (err) {
      statusText.innerHTML = `<span style="color:#EF4444;">Hata: ${err.message}</span>`;
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#EF4444;padding:16px;">${err.message}</td></tr>`;
    }
  },

  promptArchive(path, name) {
    document.querySelectorAll('.action-dropdown-menu.active').forEach(m => m.classList.remove('active'));
    const defaultArchiveName = (name ? name.replace(/[/\\]/g, '') : 'arsiv') + '.tar.gz';
    Modal.prompt({
      title: 'Sunucu İçi Arşivleme',
      message: `'${path}' için oluşturulacak arşiv dosya adını giriniz (.tar.gz veya .zip):`,
      placeholder: defaultArchiveName,
      onConfirm: async (archiveName) => {
        if (!archiveName || !archiveName.trim()) return;
        const targetArchive = this.currentPath.replace(/\/+$/, '') + '/' + archiveName.trim();
        try {
          Toast.info('Arşiv oluşturuluyor...');
          const res = await API.post(`/api/devices/${this.currentDeviceId}/files/archive/`, {
            action: 'compress',
            source_paths: [path],
            archive_path: targetArchive
          });
          Toast.success(res.message || 'Arşiv başarıyla oluşturuldu.');
          this.refresh();
        } catch (err) {
          Toast.error(`Arşivleme hatası: ${err.message}`);
        }
      }
    });
  },

  promptExtract(path) {
    document.querySelectorAll('.action-dropdown-menu.active').forEach(m => m.classList.remove('active'));
    Modal.confirm({
      title: 'Arşivden Çıkar (Extract)',
      message: `'${path}' arşivi geçerli dizine çıkarılsın mı? (${this.currentPath})`,
      confirmText: 'Arşivi Çıkar',
      onConfirm: async () => {
        try {
          Toast.info('Arşiv çıkarılıyor...');
          const res = await API.post(`/api/devices/${this.currentDeviceId}/files/archive/`, {
            action: 'extract',
            archive_path: path,
            extract_to: this.currentPath
          });
          Toast.success(res.message || 'Arşiv başarıyla çıkarıldı.');
          this.refresh();
        } catch (err) {
          Toast.error(`Çıkarma hatası: ${err.message}`);
        }
      }
    });
  },

  openChmodModalByPath(path, perms) {
    document.querySelectorAll('.action-dropdown-menu.active').forEach(m => m.classList.remove('active'));
    const pathEl = document.getElementById('chmod-target-path');
    if (pathEl) pathEl.innerText = path;
    Modal.open('chmod-modal');
  },

  calcOctal() {
    let u = 0, g = 0, o = 0;
    if (document.getElementById('perm-ur')?.checked) u += 4;
    if (document.getElementById('perm-uw')?.checked) u += 2;
    if (document.getElementById('perm-ux')?.checked) u += 1;

    if (document.getElementById('perm-gr')?.checked) g += 4;
    if (document.getElementById('perm-gw')?.checked) g += 2;
    if (document.getElementById('perm-gx')?.checked) g += 1;

    if (document.getElementById('perm-or')?.checked) o += 4;
    if (document.getElementById('perm-ow')?.checked) o += 2;
    if (document.getElementById('perm-ox')?.checked) o += 1;

    const octalInput = document.getElementById('chmod-octal-input');
    if (octalInput) octalInput.value = `0${u}${g}${o}`;
  },

  async submitChmod(e) {
    if (e) e.preventDefault();
    const path = document.getElementById('chmod-target-path')?.innerText;
    const mode = document.getElementById('chmod-octal-input')?.value;
    const owner = document.getElementById('chmod-owner-input')?.value;
    const recursive = document.getElementById('chmod-recursive-check')?.checked;

    if (!path) return;

    try {
      const res = await API.post(`/api/devices/${this.currentDeviceId}/files/chmod/`, {
        path,
        mode,
        owner,
        recursive
      });
      Toast.success(res.message || 'İzinler güncellendi.');
      Modal.close('chmod-modal');
      this.refresh();
    } catch (err) {
      Toast.error(`İzin güncelleme hatası: ${err.message}`);
    }
  },

  async openDiskUsageModal() {
    const pathEl = document.getElementById('disk-usage-current-path');
    if (pathEl) pathEl.innerText = this.currentPath;
    const tbody = document.getElementById('disk-usage-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;padding:20px;color:var(--text-muted);">Disk analizi yapılıyor...</td></tr>`;

    Modal.open('disk-usage-modal');

    try {
      const res = await API.get(`/api/devices/${this.currentDeviceId}/files/disk-usage/?path=${encodeURIComponent(this.currentPath)}`);
      
      const percentEl = document.getElementById('disk-used-percent');
      const statsEl = document.getElementById('disk-usage-stats');
      const barEl = document.getElementById('disk-usage-progress-bar');

      if (percentEl) percentEl.innerText = res.used_percent;
      if (statsEl) statsEl.innerText = `Kullanılan: ${res.used_space} / Toplam: ${res.total_space}`;
      if (barEl) barEl.style.width = res.used_percent;

      if (!res.items || !res.items.length) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;padding:20px;color:var(--text-muted);">Dizin boş veya analiz verisi yok.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.items.map(item => `
        <tr class="fm-table-row">
          <td style="font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
            <i data-lucide="folder" style="width:14px;height:14px;color:#F59E0B;"></i>
            <span>${item.name}</span>
          </td>
          <td style="text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--accent-primary);">${item.size_display}</td>
        </tr>
      `).join('');

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#EF4444;padding:16px;">Analiz hatası: ${err.message}</td></tr>`;
    }
  }
};

window.FileManager = FileManager;
document.addEventListener('DOMContentLoaded', () => FileManager.init());
