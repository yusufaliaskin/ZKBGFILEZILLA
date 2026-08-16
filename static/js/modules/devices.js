/**
 * ZK Remote Operations Center - Device Inventory & Management Module
 */

const DeviceManager = {
  devices: [],
  currentFilter: { q: '', os: '', status: '' },

  init() {
    this.tableBody = document.getElementById('device-table-body');
    this.searchInput = document.getElementById('device-search-input');
    this.osFilter = document.getElementById('device-os-filter');
    this.statusFilter = document.getElementById('device-status-filter');
    this.addDeviceForm = document.getElementById('add-device-form');

    if (!this.tableBody) return;

    // Read URL search params (e.g. ?os=LINUX, ?status=WARNING)
    const urlParams = new URLSearchParams(window.location.search);
    const osParam = urlParams.get('os');
    const statusParam = urlParams.get('status');
    const qParam = urlParams.get('q');

    if (osParam) {
      this.currentFilter.os = osParam;
      if (this.osFilter) this.osFilter.value = osParam;
    }
    if (statusParam) {
      this.currentFilter.status = statusParam;
      if (this.statusFilter) this.statusFilter.value = statusParam;
    }
    if (qParam) {
      this.currentFilter.q = qParam;
      if (this.searchInput) this.searchInput.value = qParam;
    }

    this.bindEvents();
    this.loadDevices();
  },

  bindEvents() {
    if (this.searchInput) {
      let debounceTimer;
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.currentFilter.q = e.target.value;
          this.loadDevices();
        }, 250);
      });
    }

    if (this.osFilter) {
      this.osFilter.addEventListener('change', (e) => {
        this.currentFilter.os = e.target.value;
        this.loadDevices();
      });
    }

    if (this.statusFilter) {
      this.statusFilter.addEventListener('change', (e) => {
        this.currentFilter.status = e.target.value;
        this.loadDevices();
      });
    }

    if (this.addDeviceForm) {
      this.addDeviceForm.addEventListener('submit', (e) => this.handleAddDevice(e));
    }
  },

  async loadDevices() {
    if (!this.tableBody) return;
    this.renderSkeleton();
    try {
      const data = await API.get('/api/devices/', this.currentFilter);
      this.devices = Array.isArray(data) ? data : (data.results || []);
      this.renderDevices(this.devices);
    } catch (err) {
      if (this.tableBody) {
        this.tableBody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; color: var(--status-offline); padding: 32px;">
              Cihazlar yüklenirken bir hata oluştu: ${err.message}
            </td>
          </tr>
        `;
      }
    }
  },

  renderSkeleton() {
    if (!this.tableBody) return;
    this.tableBody.innerHTML = Array(5).fill(0).map(() => `
      <tr>
        <td><div class="skeleton" style="height: 20px; width: 70px;"></div></td>
        <td><div class="skeleton" style="height: 18px; width: 60px;"></div></td>
        <td><div class="skeleton" style="height: 18px; width: 120px;"></div></td>
        <td><div class="skeleton" style="height: 18px; width: 80px;"></div></td>
        <td><div class="skeleton" style="height: 18px; width: 100px;"></div></td>
        <td><div class="skeleton" style="height: 18px; width: 70px;"></div></td>
        <td><div class="skeleton" style="height: 18px; width: 80px;"></div></td>
        <td><div class="skeleton" style="height: 28px; width: 120px;"></div></td>
      </tr>
    `).join('');
  },

  renderDevices(devices) {
    if (!this.tableBody) return;
    if (!devices || devices.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state" style="padding: 36px 16px; text-align: center; color: var(--text-muted);">
              <i data-lucide="server-off" style="width: 28px; height: 28px; margin-bottom: 8px; opacity: 0.6;"></i>
              <h4 style="font-size: 14px; font-weight: 600; color: var(--text-primary);">Düğüm Bulunamadı</h4>
              <p style="font-size: 12px; margin-top: 2px;">Arama kriterlerinize uygun kayıtlı cihaz bulunmuyor.</p>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    this.tableBody.innerHTML = devices.map(d => {
      const isOnline = d.status === 'ONLINE';
      const isWarn = d.status === 'WARNING';
      const statusClass = isOnline ? 'online' : (isWarn ? 'warning' : 'offline');
      const statusText = isOnline ? 'Çevrimiçi' : (isWarn ? 'Uyarı' : 'Çevrimdışı');
      const isWin = d.operating_system === 'WINDOWS';

      return `
        <tr data-device-id="${d.id}">
          <td>
            <div class="zk-table-pill ${statusClass}">
              <span class="zk-status-dot ${statusClass}"></span>
              <span>${statusText}</span>
            </div>
          </td>
          <td>
            <span class="zk-sicil-badge">${d.personnel_number}</span>
          </td>
          <td>
            <div class="zk-host-cell">
              <span class="zk-host-name">${d.hostname}</span>
              ${d.display_name && d.display_name !== d.hostname ? `<span class="zk-host-sub">${d.display_name}</span>` : ''}
            </div>
          </td>
          <td>
            <div class="zk-os-badge ${isWin ? 'win' : 'pardus'}">
              <img src="${isWin ? '/static/img/windows.png' : '/static/img/pardus.png'}" alt="${isWin ? 'Windows' : 'Pardus'}" class="zk-os-icon">
              <span>${isWin ? 'Windows' : 'Pardus'}</span>
            </div>
          </td>
          <td>
            <span class="zk-ip-badge">${d.ip_address}</span>
          </td>
          <td>
            <div class="zk-user-cell">
              <i data-lucide="user" style="width: 12px; height: 12px; color: var(--text-muted);"></i>
              <span>${d.username}</span>
            </div>
          </td>
          <td>
            <div class="zk-time-cell">
              <i data-lucide="clock" style="width: 11px; height: 11px; opacity: 0.7;"></i>
              <span>${d.last_seen ? Formatters.timeAgo(d.last_seen) : 'Bilinmiyor'}</span>
            </div>
          </td>
          <td style="text-align: right; padding-right: 18px;">
            <div style="display: inline-flex; align-items: center; gap: 5px;">
              <!-- Ping Button -->
              <button class="zk-action-btn ping" onclick="DeviceManager.pingNode('${d.id}', this)" title="Canlı Ping Testi">
                <i data-lucide="activity" style="width: 12px; height: 12px;"></i>
                <span>Ping</span>
              </button>
              
              <!-- SSH (Linux) / RDP (Windows) Button -->
              ${isWin ? `
                <a href="/devices/${d.id}/rdp/" class="zk-action-btn rdp" title="Microsoft RDP İndir">
                  <i data-lucide="monitor" style="width: 12px; height: 12px;"></i>
                  <span>RDP</span>
                </a>
              ` : `
                <a href="/terminal/${d.id}/" class="zk-action-btn ssh" title="Canlı SSH Terminali">
                  <i data-lucide="terminal" style="width: 12px; height: 12px;"></i>
                  <span>SSH</span>
                </a>
              `}

              <!-- SFTP Explorer Button -->
              <a href="/files/${d.id}/" class="zk-action-btn sftp" title="SFTP Dosya Gezgini">
                <i data-lucide="folder" style="width: 12px; height: 12px;"></i>
                <span>SFTP</span>
              </a>
              
              <!-- 3-Dots Dropdown Trigger -->
              <div class="action-dropdown" style="position: relative; display: inline-block;">
                <button class="zk-action-btn more" onclick="DeviceManager.toggleRowMenu(this, event)" title="Daha Fazla İşlem">
                  <i data-lucide="more-vertical" style="width: 13px; height: 13px;"></i>
                </button>
                <div class="action-dropdown-menu" style="right: 0; min-width: 180px;">
                  <div class="action-menu-item" onclick="DeviceManager.testConnection('${d.id}', event)">
                    <i data-lucide="check-circle-2" style="width: 13px; height: 13px; color: #10B981;"></i> Bağlantı Testi
                  </div>
                  <div class="action-menu-item" onclick="DeviceManager.openEditModal('${d.id}')">
                    <i data-lucide="edit-3" style="width: 13px; height: 13px; color: #0284C7;"></i> Cihazı Düzenle
                  </div>
                  <a href="/devices/${d.id}/" class="action-menu-item">
                    <i data-lucide="info" style="width: 13px; height: 13px; color: var(--text-primary);"></i> Cihaz Detayları
                  </a>
                  <div class="action-menu-divider"></div>
                  <div class="action-menu-item danger" onclick="DeviceManager.deleteDevice('${d.id}', '${d.hostname}')">
                    <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i> Cihazı Sil
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  toggleRowMenu(btn, event) {
    if (event) event.stopPropagation();
    const menu = btn.nextElementSibling;
    const isActive = menu && menu.classList.contains('active');
    
    this.closeAllRowMenus();

    if (menu && !isActive) {
      const rect = btn.getBoundingClientRect();
      const menuWidth = 180;
      const menuHeight = 115;
      
      const spaceBelow = window.innerHeight - rect.bottom;
      let top;
      if (spaceBelow < menuHeight + 10) {
        top = rect.top - menuHeight - 4;
      } else {
        top = rect.bottom + 4;
      }

      let left = rect.right - menuWidth;
      if (left < 10) left = 10;

      menu.style.position = 'fixed';
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      menu.style.right = 'auto';
      menu.style.bottom = 'auto';
      menu.style.zIndex = '999999';
      menu.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.35)';
      menu.classList.add('active');
    }
  },

  closeAllRowMenus() {
    document.querySelectorAll('.action-dropdown-menu.active').forEach(m => {
      m.classList.remove('active');
      m.style.position = '';
      m.style.top = '';
      m.style.left = '';
    });
  },

  async testConnection(deviceId, event) {
    if (event) event.stopPropagation();
    const btn = event ? event.currentTarget : null;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:14px;height:14px;"></i>';
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await API.post(`/api/devices/${deviceId}/connect/`);
      if (res.success) {
        Toast.success(`SSH/SFTP Bağlantısı Başarılı: ${res.message} (${res.latency_ms} ms)`);
      } else {
        Toast.error(`Bağlantı Başarısız: ${res.message}`);
      }
      this.loadDevices();
    } catch (err) {
      Toast.error(`Bağlantı hatası: ${err.message}`);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="activity" style="width:14px;height:14px;"></i>';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  },

  async pingNode(deviceId, btn) {
    if (!deviceId || !btn) return;
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⟳ Ping...';

    try {
      const data = await API.post(`/api/devices/${deviceId}/ping/`, {});
      if (data.success) {
        btn.innerHTML = `✓ ${data.latency_ms}ms`;
        btn.style.color = '#10B981';
        Toast.success(`${data.hostname} ping başarılı: ${data.latency_ms} ms`);
        const row = document.querySelector(`tr[data-device-id="${deviceId}"]`);
        if (row) {
          const pill = row.querySelector('.zk-table-pill');
          if (pill) {
            pill.className = 'zk-table-pill online';
            pill.innerHTML = '<span class="zk-status-dot online"></span><span>Çevrimiçi</span>';
          }
        }
      } else {
        btn.innerHTML = '✕ Yanıt Yok';
        btn.style.color = '#EF4444';
        Toast.error(`${data.hostname} ping yanıt vermedi.`);
      }
    } catch (err) {
      btn.innerHTML = '✕ Hata';
      btn.style.color = '#EF4444';
      Toast.error(`Ping hatası: ${err.message}`);
    }

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = origHtml;
      btn.style.color = '';
      if (window.lucide) window.lucide.createIcons();
    }, 4000);
  },

  async pingAllNodes(btn) {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:13px;height:13px;"></i> <span>Ağ Taranıyor...</span>';
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const res = await API.get('/api/devices/ping-all/');
      const results = res.devices || [];
      let onlineCount = 0;
      results.forEach(d => {
        const row = document.querySelector(`tr[data-device-id="${d.id}"]`);
        if (row) {
          const pill = row.querySelector('.zk-table-pill');
          const pingBtn = row.querySelector('.zk-action-btn.ping');
          if (d.online) {
            onlineCount++;
            if (pill) {
              pill.className = 'zk-table-pill online';
              pill.innerHTML = '<span class="zk-status-dot online"></span><span>Çevrimiçi</span>';
            }
            if (pingBtn) {
              pingBtn.innerHTML = `✓ ${d.latency_ms}ms`;
              pingBtn.style.color = '#10B981';
            }
          } else {
            if (pill) {
              pill.className = 'zk-table-pill offline';
              pill.innerHTML = '<span class="zk-status-dot offline"></span><span>Çevrimdışı</span>';
            }
            if (pingBtn) {
              pingBtn.innerHTML = `✕ Timeout`;
              pingBtn.style.color = '#EF4444';
            }
          }
        }
      });
      Toast.success(`Canlı Ağ Taraması Tamamlandı: ${onlineCount}/${results.length} Düğüm Aktif`);
    } catch (err) {
      Toast.error(`Ağ tarama hatası: ${err.message}`);
    } finally {
      if (btn) {
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = '<i data-lucide="activity" style="width:13px;height:13px;color:#10B981;"></i> <span>Canlı Ağ Radarı (Ping All)</span>';
          if (window.lucide) window.lucide.createIcons();
        }, 2000);
      }
    }
  },

  deleteDevice(deviceId, hostname) {
    Modal.confirm({
      title: 'Cihazı Sil',
      message: `'${hostname}' adlı cihazı envanterden kalıcı olarak silmek istediğinize emin misiniz?`,
      confirmText: 'Evet, Sil',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        try {
          await API.delete(`/api/devices/${deviceId}/`);
          Toast.success(`'${hostname}' başarıyla silindi.`);
          this.loadDevices();
        } catch (err) {
          Toast.error(`Silinemedi: ${err.message}`);
        }
      }
    });
  },

  selectOs(os) {
    const hiddenInput = document.getElementById('dev-os-select');
    if (hiddenInput) hiddenInput.value = os;

    const cardLinux = document.getElementById('os-card-linux');
    const cardWindows = document.getElementById('os-card-windows');
    const portInput = document.getElementById('dev-port-input');

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

    this.updateModalCmdPreview();
  },

  updateModalCmdPreview() {
    const ip = document.getElementById('dev-ip-input')?.value.trim() || '10.211.31.42';
    const user = document.getElementById('dev-user-input')?.value.trim() || 'root';
    const port = document.getElementById('dev-port-input')?.value.trim() || '22';
    const os = document.getElementById('dev-os-select')?.value || 'LINUX';

    const preview = document.getElementById('dev-cmd-preview');
    const badge = document.getElementById('dev-os-badge');
    const icon = document.getElementById('dev-cmd-icon');

    if (preview) {
      const portSuffix = port !== '22' ? ` -p ${port}` : '';
      preview.textContent = `ssh ${user}@${ip}${portSuffix}`;
    }

    if (badge) {
      if (os === 'WINDOWS') {
        badge.className = 'badge blue font-bold';
        badge.textContent = `WINDOWS / SSH (Port ${port})`;
      } else {
        badge.className = 'badge green font-bold';
        badge.textContent = `PARDUS / SSH (Port ${port})`;
      }
    }

    if (icon) {
      icon.style.color = os === 'WINDOWS' ? '#38BDF8' : '#10B981';
    }
  },

  onModalOsChange(os) {
    this.selectOs(os);
  },

  async handleAddDevice(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = document.getElementById('add-device-submit-btn');
    const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';

    const ip = document.getElementById('dev-ip-input')?.value.trim();
    const username = document.getElementById('dev-user-input')?.value.trim();
    let personnel = document.getElementById('dev-sicil-input')?.value.trim();
    let hostname = document.getElementById('dev-hostname-input')?.value.trim();
    const os = document.getElementById('dev-os-select')?.value || 'LINUX';
    const port = parseInt(document.getElementById('dev-port-input')?.value, 10) || 22;
    const secret = form.querySelector('input[name="secret"]')?.value;

    if (!ip || !username || !secret) {
      Toast.error('Lütfen IP adresi, kullanıcı adı ve parolayı eksiksiz girin.');
      return;
    }

    if (!hostname) {
      hostname = `ZK-${username}@${ip}`;
    }

    if (!personnel) {
      personnel = username.length >= 4 ? username : `SICIL-${username}-${Date.now().toString().slice(-4)}`;
    }

    const payload = {
      personnel_number: personnel,
      hostname: hostname,
      display_name: hostname,
      operating_system: os,
      ip_address: ip,
      username: username,
      port: port,
      connector_type: os === 'WINDOWS' ? 'WINDOWS_REMOTE' : 'SSH',
      status: 'ONLINE',
      credential: {
        credential_type: 'PASSWORD',
        secret: secret
      }
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:14px;height:14px;"></i> Bağlantı Test Ediliyor...';
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const created = await API.post('/api/devices/', payload);
      Toast.success(`'${hostname}' düğümü kaydedildi ve doğrulandı!`);
      Modal.close('add-device-modal');
      form.reset();
      this.loadDevices();

      // Trigger background ping to verify network reachable
      if (created && created.id) {
        API.post(`/api/devices/${created.id}/ping/`, {}).catch(() => {});
      }
    } catch (err) {
      Toast.error(`Cihaz eklenemedi: ${err.message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  },

  toggleDropdown(dropdownId, e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const menu = dropdown.querySelector('.zk-select-menu');
    const trigger = dropdown.querySelector('.zk-select-trigger');
    const isShowing = menu.classList.contains('show');

    // Close all other dropdowns
    document.querySelectorAll('.zk-select-menu').forEach(m => m.classList.remove('show'));
    document.querySelectorAll('.zk-select-trigger').forEach(t => t.classList.remove('active'));

    if (!isShowing) {
      menu.classList.add('show');
      trigger.classList.add('active');
    }
  },

  setOsFilter(value, label, iconSrc) {
    this.currentFilter.os = value;
    if (this.osFilter) this.osFilter.value = value;

    const contentEl = document.getElementById('selectedOsText');
    if (contentEl) {
      if (iconSrc) {
        contentEl.innerHTML = `<img src="${iconSrc}" style="width:15px;height:15px;object-fit:contain;" alt="${label}"> <span>${label}</span>`;
      } else {
        contentEl.innerHTML = `<span>${label}</span>`;
      }
    }

    document.querySelectorAll('#dropdownOsMenu .zk-select-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.value === value);
    });

    document.querySelectorAll('.zk-select-menu').forEach(m => m.classList.remove('show'));
    document.querySelectorAll('.zk-select-trigger').forEach(t => t.classList.remove('active'));

    this.loadDevices();
  },

  setStatusFilter(value, label, dotColor) {
    this.currentFilter.status = value;
    if (this.statusFilter) this.statusFilter.value = value;

    const contentEl = document.getElementById('selectedStatusText');
    if (contentEl) {
      if (dotColor) {
        contentEl.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${dotColor};box-shadow:0 0 5px ${dotColor};"></span> <span>${label}</span>`;
      } else {
        contentEl.innerHTML = `<span>${label}</span>`;
      }
    }

    document.querySelectorAll('#dropdownStatusMenu .zk-select-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.value === value);
    });

    document.querySelectorAll('.zk-select-menu').forEach(m => m.classList.remove('show'));
    document.querySelectorAll('.zk-select-trigger').forEach(t => t.classList.remove('active'));

    this.loadDevices();
  },

  selectEditOs(os) {
    const osSelect = document.getElementById('edit-dev-os-select');
    const portInput = document.getElementById('edit-port');
    const portVisible = document.getElementById('edit-port-visible');
    const cardLinux = document.getElementById('edit-os-card-linux');
    const cardWindows = document.getElementById('edit-os-card-windows');

    if (osSelect) osSelect.value = os;

    if (os === 'LINUX') {
      if (cardLinux) {
        cardLinux.classList.add('active');
        cardLinux.style.border = '2px solid #10B981';
        cardLinux.style.background = 'rgba(16, 185, 129, 0.06)';
        cardLinux.style.opacity = '1';
      }
      if (cardWindows) {
        cardWindows.classList.remove('active');
        cardWindows.style.border = '1px solid var(--border-default)';
        cardWindows.style.background = 'var(--bg-card)';
        cardWindows.style.opacity = '0.85';
      }
      if (portInput && (!portInput.value || portInput.value === '3389')) {
        portInput.value = '22';
        if (portVisible) portVisible.value = '22';
      }
    } else {
      if (cardWindows) {
        cardWindows.classList.add('active');
        cardWindows.style.border = '2px solid #0284C7';
        cardWindows.style.background = 'rgba(14, 165, 233, 0.06)';
        cardWindows.style.opacity = '1';
      }
      if (cardLinux) {
        cardLinux.classList.remove('active');
        cardLinux.style.border = '1px solid var(--border-default)';
        cardLinux.style.background = 'var(--bg-card)';
        cardLinux.style.opacity = '0.85';
      }
      if (portInput && !portInput.value) {
        portInput.value = '22';
        if (portVisible) portVisible.value = '22';
      }
    }
    this.updateEditModalCmdPreview();
  },

  updateEditModalCmdPreview() {
    const osSelect = document.getElementById('edit-dev-os-select');
    const ipInput = document.getElementById('edit-ip-address');
    const userInput = document.getElementById('edit-username');
    const portInput = document.getElementById('edit-port');
    const previewEl = document.getElementById('edit-dev-cmd-preview');
    const badgeEl = document.getElementById('edit-dev-os-badge');
    const iconEl = document.getElementById('edit-dev-cmd-icon');

    if (!previewEl) return;

    const os = osSelect ? osSelect.value : 'LINUX';
    const ip = (ipInput && ipInput.value.trim()) ? ipInput.value.trim() : '10.211.31.42';
    const user = (userInput && userInput.value.trim()) ? userInput.value.trim() : 'root';
    const port = (portInput && portInput.value) ? portInput.value : '22';

    const portSuffix = port !== '22' ? ` -p ${port}` : '';
    previewEl.innerText = `ssh ${user}@${ip}${portSuffix}`;

    if (badgeEl) {
      if (os === 'WINDOWS') {
        badgeEl.className = 'badge blue font-bold';
        badgeEl.innerText = `WINDOWS / SSH (Port ${port})`;
      } else {
        badgeEl.className = 'badge green font-bold';
        badgeEl.innerText = `PARDUS / SSH (Port ${port})`;
      }
    }
    if (iconEl) iconEl.style.color = os === 'WINDOWS' ? '#0284C7' : '#10B981';
  },

  async openEditModal(id) {
    this.closeAllRowMenus();
    try {
      const d = await API.get(`/api/devices/${id}/`);
      document.getElementById('edit-device-id').value = d.id;
      document.getElementById('edit-hostname').value = d.hostname || '';
      document.getElementById('edit-personnel-number').value = d.personnel_number || '';
      document.getElementById('edit-ip-address').value = d.ip_address || '';
      document.getElementById('edit-port').value = d.port || 22;
      const portVisible = document.getElementById('edit-port-visible');
      if (portVisible) portVisible.value = d.port || 22;

      document.getElementById('edit-username').value = d.username || '';
      document.getElementById('edit-display-name').value = d.display_name || '';
      document.getElementById('edit-domain').value = d.domain || '';
      const domainVisible = document.getElementById('edit-domain-visible');
      if (domainVisible) domainVisible.value = d.domain || '';

      document.getElementById('edit-description').value = d.description || '';

      this.selectEditOs(d.operating_system || 'LINUX');

      const subTitle = document.getElementById('edit-device-subtitle');
      if (subTitle) subTitle.innerText = `${d.hostname} (${d.ip_address}) yapılandırmasını güncelleyin`;

      Modal.open('edit-device-modal');
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      Toast.error(`Cihaz bilgileri alınamadı: ${err.message}`);
    }
  },

  async handleEditDevice(e) {
    e.preventDefault();
    const id = document.getElementById('edit-device-id').value;
    const btn = document.getElementById('edit-device-submit-btn');

    const osSelect = document.getElementById('edit-dev-os-select');
    const portVisible = document.getElementById('edit-port-visible');
    const domainVisible = document.getElementById('edit-domain-visible');

    const payload = {
      hostname: document.getElementById('edit-hostname').value.trim(),
      personnel_number: document.getElementById('edit-personnel-number').value.trim(),
      ip_address: document.getElementById('edit-ip-address').value.trim(),
      port: parseInt((portVisible && portVisible.value) || document.getElementById('edit-port').value, 10) || 22,
      username: document.getElementById('edit-username').value.trim(),
      operating_system: osSelect ? osSelect.value : 'LINUX',
      display_name: document.getElementById('edit-display-name').value.trim(),
      domain: (domainVisible && domainVisible.value.trim()) || document.getElementById('edit-domain').value.trim(),
      description: document.getElementById('edit-description').value.trim()
    };

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:14px;height:14px;"></i> Kaydediliyor...';
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      await API.patch(`/api/devices/${id}/`, payload);
      Toast.success(`'${payload.hostname}' bilgileri başarıyla güncellendi.`);
      Modal.close('edit-device-modal');
      this.loadDevices();
    } catch (err) {
      Toast.error(`Güncelleme hatası: ${err.message}`);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save" style="width: 15px; height: 15px;"></i> <span>Değişiklikleri Kaydet</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  },

  deleteDevice(id, hostname) {
    this.closeAllRowMenus();
    Modal.confirm({
      title: 'Düğümü / Cihazı Sil',
      message: `'${hostname}' isimli sunucu/cihaz envanterden tamamen silinsin mi? Bu işlem geri alınamaz.`,
      confirmText: 'Evet, Cihazı Sil',
      onConfirm: async () => {
        try {
          await API.delete(`/api/devices/${id}/`);
          Toast.success(`'${hostname}' cihazı envanterden silindi.`);
          this.loadDevices();
        } catch (err) {
          Toast.error(`Cihaz silinemedi: ${err.message}`);
        }
      }
    });
  }
};

window.DeviceManager = DeviceManager;
document.addEventListener('DOMContentLoaded', () => {
  DeviceManager.init();
  DeviceManager.updateModalCmdPreview();

  // Close custom dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.zk-select-dropdown')) {
      document.querySelectorAll('.zk-select-menu').forEach(m => m.classList.remove('show'));
      document.querySelectorAll('.zk-select-trigger').forEach(t => t.classList.remove('active'));
    }
    if (!e.target.closest('.action-dropdown')) {
      DeviceManager.closeAllRowMenus();
    }
  });

  // Close fixed row menus on scroll or resize
  window.addEventListener('scroll', () => DeviceManager.closeAllRowMenus(), true);
  window.addEventListener('resize', () => DeviceManager.closeAllRowMenus());
});

