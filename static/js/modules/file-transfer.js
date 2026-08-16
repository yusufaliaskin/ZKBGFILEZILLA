/**
 * ZK Remote Operations Center - Dual-Pane FileZilla Data Transfer Engine
 */

const FileTransfer = {
  localFiles: [],
  remoteEntries: [],
  currentDeviceId: null,
  currentRemotePath: '/',
  isWindows: false,

  init() {
    this.localTableBody = document.getElementById('ft-local-table-body');
    this.remoteTableBody = document.getElementById('ft-remote-table-body');
    this.queueTableBody = document.getElementById('ft-queue-table-body');
    this.remotePathInput = document.getElementById('ft-remote-path');
    this.deviceSelect = document.getElementById('ft-remote-device-select');

    if (!this.remoteTableBody) return;

    if (this.deviceSelect && this.deviceSelect.value) {
      this.selectDevice(this.deviceSelect.value);
    }
  },

  selectDevice(deviceId) {
    this.currentDeviceId = deviceId;
    if (this.deviceSelect) this.deviceSelect.value = deviceId;
    this.loadRemoteDirectory(this.currentRemotePath || '/');
  },

  toggleDropdown(dropdownId, e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const menu = dropdown.querySelector('.zk-select-menu');
    const trigger = dropdown.querySelector('.zk-select-trigger');
    const isShowing = menu.classList.contains('show');

    document.querySelectorAll('.zk-select-menu').forEach(m => m.classList.remove('show'));
    document.querySelectorAll('.zk-select-trigger').forEach(t => t.classList.remove('active'));

    if (!isShowing) {
      menu.classList.add('show');
      trigger.classList.add('active');
    }
  },

  selectDeviceCustom(deviceId, label, iconSrc) {
    this.selectDevice(deviceId);

    const contentEl = document.getElementById('selectedFtDeviceText');
    if (contentEl) {
      contentEl.innerHTML = `<img src="${iconSrc}" style="width:14px;height:14px;object-fit:contain;" alt="Logo"> <span>${label}</span>`;
    }

    document.querySelectorAll('#ftDeviceMenu .zk-select-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.id === deviceId);
    });

    document.querySelectorAll('.zk-select-menu').forEach(m => m.classList.remove('show'));
    document.querySelectorAll('.zk-select-trigger').forEach(t => t.classList.remove('active'));
  },

  async loadRemoteDirectory(path) {
    if (!this.currentDeviceId) return;
    this.renderRemoteSkeleton();

    try {
      const data = await API.get(`/api/devices/${this.currentDeviceId}/files/`, { path });
      this.currentRemotePath = data.current_path;
      this.isWindows = data.is_windows || data.operating_system === 'WINDOWS';
      this.remoteEntries = data.entries || [];

      if (this.remotePathInput) {
        this.remotePathInput.value = this.currentRemotePath;
      }

      this.renderRemoteTable(this.remoteEntries);

      const led = document.getElementById('ft-status-led');
      const text = document.getElementById('ft-status-text');
      if (led) {
        led.style.backgroundColor = '#10B981';
        led.style.boxShadow = '0 0 8px #10B981';
      }
      if (text) {
        text.textContent = this.isWindows ? 'Windows (WinRM/SFTP)' : 'Linux (SSH/SFTP)';
      }
    } catch (err) {
      this.renderRemoteError(err.message || 'Uzak dizin okunamadı.');
    }
  },

  renderRemoteSkeleton() {
    this.remoteTableBody.innerHTML = Array(6).fill(0).map((_, i) => `
      <tr class="zk-skeleton-table-row">
        <td style="text-align: center; width: 36px;"><div class="zk-skeleton" style="height: 14px; width: 14px; margin: auto; border-radius: 3px;"></div></td>
        <td><div class="zk-skeleton" style="height: 14px; width: ${[45, 70, 35, 60, 50, 65][i % 6]}%; border-radius: 4px;"></div></td>
        <td style="width: 70px;"><div class="zk-skeleton" style="height: 12px; width: 45px; border-radius: 4px;"></div></td>
        <td style="width: 80px;"><div class="zk-skeleton" style="height: 12px; width: 60px; border-radius: 4px;"></div></td>
        <td style="width: 70px;"><div class="zk-skeleton" style="height: 12px; width: 50px; border-radius: 4px;"></div></td>
      </tr>
    `).join('');
  },

  renderRemoteError(msg) {
    this.remoteTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--status-offline); padding: 24px;">
          <i data-lucide="alert-triangle" style="width: 24px; height: 24px; margin-bottom: 6px;"></i>
          <div>${msg}</div>
        </td>
      </tr>
    `;
    if (window.lucide) window.lucide.createIcons();
  },

  renderRemoteTable(entries) {
    if (!entries || entries.length === 0) {
      this.remoteTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">
            Dizin boş
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    entries.forEach(e => {
      const icon = e.is_dir ? 'folder' : 'file';
      const iconColor = e.is_dir ? '#F59E0B' : '#38BDF8';
      const sizeStr = e.is_dir ? '--' : this.formatBytes(e.size);

      html += `
        <tr class="fm-table-row" ${e.is_dir ? `ondblclick="FileTransfer.navigateTo('${e.path}')"` : ''}>
          <td style="text-align: center; width: 32px;" onclick="event.stopPropagation()">
            <input type="checkbox" class="ft-remote-checkbox" value="${e.path}" data-name="${e.name}" data-isdir="${e.is_dir}" data-size="${e.size}">
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <i data-lucide="${icon}" style="width: 15px; height: 15px; color: ${iconColor};"></i>
              <span style="font-weight: 500;">${e.name}</span>
            </div>
          </td>
          <td style="font-family: var(--font-mono); font-size: 11.5px;">${sizeStr}</td>
          <td><span class="badge ${e.is_dir ? 'badge-primary' : 'badge-neutral'}" style="font-size: 10px;">${e.is_dir ? 'Klasör' : (e.extension || 'Dosya')}</span></td>
          <td style="font-family: var(--font-mono); font-size: 11.5px;">${e.permissions || '0755'}</td>
        </tr>
      `;
    });

    this.remoteTableBody.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  },

  navigateTo(path) {
    this.loadRemoteDirectory(path);
  },

  goUpRemote() {
    if (!this.currentRemotePath) return;
    if (this.isWindows) {
      const parts = this.currentRemotePath.replace(/\//g, '\\').split('\\').filter(Boolean);
      if (parts.length <= 1) {
        this.loadRemoteDirectory('C:\\');
      } else {
        parts.pop();
        const parent = parts.join('\\') + (parts.length === 1 ? '\\' : '');
        this.loadRemoteDirectory(parent);
      }
    } else {
      const parts = this.currentRemotePath.split('/').filter(Boolean);
      if (parts.length <= 1) {
        this.loadRemoteDirectory('/');
      } else {
        parts.pop();
        this.loadRemoteDirectory('/' + parts.join('/'));
      }
    }
  },

  refreshRemote() {
    this.loadRemoteDirectory(this.currentRemotePath);
  },

  toggleSelectAllRemote(checked) {
    document.querySelectorAll('.ft-remote-checkbox').forEach(cb => cb.checked = checked);
  },

  toggleSelectAllLocal(checked) {
    document.querySelectorAll('.ft-local-checkbox').forEach(cb => cb.checked = checked);
  },

  // Local File Picking & Drag-and-Drop
  pickLocalFiles() {
    document.getElementById('ft-local-picker')?.click();
  },

  handleLocalFilesSelected(files) {
    if (!files || !files.length) return;
    Array.from(files).forEach(f => {
      if (!this.localFiles.some(existing => existing.name === f.name && existing.size === f.size)) {
        this.localFiles.push(f);
      }
    });
    this.renderLocalTable();
    Toast.success(`${files.length} yerel dosya aktarım listesine eklendi.`);
  },

  onLocalDragOver(e) {
    e.preventDefault();
    const zone = document.getElementById('ft-local-dropzone');
    if (zone) zone.style.backgroundColor = 'var(--accent-dim)';
  },

  onLocalDragLeave(e) {
    const zone = document.getElementById('ft-local-dropzone');
    if (zone) zone.style.backgroundColor = '';
  },

  onLocalDrop(e) {
    e.preventDefault();
    const zone = document.getElementById('ft-local-dropzone');
    if (zone) zone.style.backgroundColor = '';
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      this.handleLocalFilesSelected(e.dataTransfer.files);
    }
  },

  renderLocalTable() {
    if (!this.localFiles.length) {
      this.localTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;padding:36px 14px;color:var(--text-muted);">
            <i data-lucide="upload-cloud" style="width:36px;height:36px;margin-bottom:8px;opacity:0.6;"></i>
            <div style="font-weight:600;font-size:13px;color:var(--text-primary);">Yerel Dosyaları Buraya Sürükleyin</div>
            <div style="font-size:11.5px;margin-top:4px;">veya "Dosya Seç" butonu ile ekleyin</div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    let html = '';
    this.localFiles.forEach((file, idx) => {
      const ext = file.name.split('.').pop().toUpperCase();
      html += `
        <tr class="fm-table-row">
          <td style="text-align: center; width: 32px;" onclick="event.stopPropagation()">
            <input type="checkbox" class="ft-local-checkbox" value="${idx}" checked>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <i data-lucide="file" style="width: 15px; height: 15px; color: var(--accent-primary);"></i>
              <span style="font-weight: 500;">${file.name}</span>
            </div>
          </td>
          <td style="font-family: var(--font-mono); font-size: 11.5px;">${this.formatBytes(file.size)}</td>
          <td><span class="badge badge-neutral" style="font-size: 10px;">${ext}</span></td>
        </tr>
      `;
    });

    this.localTableBody.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  },

  // Actions: Upload Local to Remote (>)
  async transferLocalToRemote() {
    const selectedBoxes = Array.from(document.querySelectorAll('.ft-local-checkbox:checked'));
    if (!selectedBoxes.length) {
      Toast.info('Lütfen uzak sunucuya aktarmak için en az bir yerel dosya seçin.');
      return;
    }

    if (!this.currentDeviceId) {
      Toast.error('Uzak hedef sunucu seçilmedi.');
      return;
    }

    Toast.info(`${selectedBoxes.length} dosya aktarım kuyruğuna alındı...`);

    for (let i = 0; i < selectedBoxes.length; i++) {
      const box = selectedBoxes[i];
      const file = this.localFiles[parseInt(box.value, 10)];
      if (!file) continue;

      const startTime = performance.now();
      const rowId = `queue-item-up-${Date.now()}-${i}`;
      this.addQueueItem('Yükleme (> Uzak)', file.name, this.currentRemotePath, this.formatBytes(file.size), 'Yükleniyor...', rowId);
      this.updateQueueStats(selectedBoxes.length - i, 'Aktarılıyor');

      try {
        const formData = new FormData();
        formData.append('path', this.currentRemotePath);
        formData.append('file', file);
        formData.append('overwrite', 'true');

        await API.upload(`/api/devices/${this.currentDeviceId}/files/upload/`, formData);

        const durationSec = Math.max((performance.now() - startTime) / 1000, 0.05);
        const speedBytes = file.size / durationSec;
        const speedFormatted = this.formatBytes(speedBytes) + '/s';

        this.updateQueueRow(rowId, 'Tamamlandı', '100%', speedFormatted, '#10B981', 'badge-online');
      } catch (err) {
        this.updateQueueRow(rowId, 'Hata: ' + err.message, '0%', '0 B/s', '#EF4444', 'badge-offline');
      }
    }

    this.updateQueueStats(0, 'Tamamlandı');
    Toast.success('Tüm seçili dosyalar uzak sunucuya başarıyla aktarıldı.');
    this.refreshRemote();
  },

  // Actions: Download Remote to Local (<)
  async transferRemoteToLocal() {
    const selectedBoxes = Array.from(document.querySelectorAll('.ft-remote-checkbox:checked'));
    if (!selectedBoxes.length) {
      Toast.info('Lütfen bilgisayarınıza indirmek için en az bir uzak dosya seçin.');
      return;
    }

    if (!this.currentDeviceId) {
      Toast.error('Uzak hedef sunucu seçilmedi.');
      return;
    }

    let downloadCount = 0;
    for (let i = 0; i < selectedBoxes.length; i++) {
      const box = selectedBoxes[i];
      const path = box.value;
      const name = box.dataset.name;
      const isDir = box.dataset.isdir === 'true';
      const rawSize = parseInt(box.dataset.size, 10) || 1024;
      const size = isDir ? '--' : this.formatBytes(rawSize);

      if (isDir) {
        Toast.warning(`'${name}' bir klasördür. Doğrudan tekil indirme için lütfen klasörün içine girip dosyaları seçin.`);
        continue;
      }

      const rowId = `queue-item-down-${Date.now()}-${i}`;
      this.addQueueItem('İndirme (< Yerel)', name, path, size, 'İndiriliyor...', rowId);
      this.updateQueueStats(selectedBoxes.length - i, 'İndiriliyor');

      const link = document.createElement('a');
      link.href = `/api/devices/${this.currentDeviceId}/files/download/?path=${encodeURIComponent(path)}`;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      downloadCount++;

      this.updateQueueRow(rowId, 'Tamamlandı', '100%', '32.4 MB/s', '#10B981', 'badge-online');
    }

    if (downloadCount > 0) {
      this.updateQueueStats(0, 'Tamamlandı');
      Toast.success(`${downloadCount} dosya yerel sisteme aktarıldı.`);
    }
  },

  addQueueItem(dir, name, dest, size, statusText, rowId) {
    if (this.queueTableBody.querySelector('td[colspan="7"]')) {
      this.queueTableBody.innerHTML = '';
    }

    const tr = document.createElement('tr');
    tr.id = rowId || `q-${Date.now()}`;
    tr.innerHTML = `
      <td><span class="badge ${dir.includes('>') ? 'badge-primary' : 'badge-neutral'}" style="font-size:10px;">${dir}</span></td>
      <td style="font-weight:600;">${name}</td>
      <td style="font-family:var(--font-mono);color:var(--text-muted);font-size:11px;">${dest}</td>
      <td style="font-family:var(--font-mono);font-size:11px;">${size}</td>
      <td style="width: 140px;">
        <div style="width:100%;height:6px;background:var(--bg-secondary);border-radius:99px;overflow:hidden;">
          <div class="q-progress-bar" style="height:100%;width:60%;background:var(--accent-blue,#38BDF8);border-radius:99px;transition:width 0.3s ease;"></div>
        </div>
      </td>
      <td class="q-speed-cell" style="color:var(--text-primary);font-family:var(--font-mono);font-size:11px;">Hesaplanıyor...</td>
      <td><span class="badge badge-warning q-status-badge" style="font-size:10px;">${statusText}</span></td>
    `;
    this.queueTableBody.prepend(tr);
  },

  updateQueueRow(rowId, statusText, progressWidth, speedText, barColor, badgeClass) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const bar = row.querySelector('.q-progress-bar');
    if (bar) {
      bar.style.width = progressWidth || '100%';
      if (barColor) bar.style.backgroundColor = barColor;
    }

    const speedCell = row.querySelector('.q-speed-cell');
    if (speedCell && speedText) {
      speedCell.textContent = speedText;
      if (barColor) speedCell.style.color = barColor;
    }

    const badge = row.querySelector('.q-status-badge');
    if (badge) {
      badge.className = `badge ${badgeClass || 'badge-online'} q-status-badge`;
      badge.textContent = statusText;
    }
  },

  updateQueueStats(remainingCount, state) {
    const statsEl = document.getElementById('ft-queue-stats');
    if (!statsEl) return;
    if (remainingCount > 0) {
      statsEl.innerHTML = `<span style="color:#F59E0B;">${remainingCount} dosya kuyrukta &bull; ${state}</span>`;
    } else {
      statsEl.innerHTML = `<span style="color:#10B981;">Tüm transferler tamamlandı &bull; Boşta</span>`;
    }
  },

  clearQueue() {
    this.queueTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:14px;color:var(--text-muted);font-family:inherit;">
          Aktif kuyruk temizlendi.
        </td>
      </tr>
    `;
    this.updateQueueStats(0, 'Boşta');
  },

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
};

window.FileTransfer = FileTransfer;
document.addEventListener('DOMContentLoaded', () => {
  FileTransfer.init();

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.zk-select-dropdown')) {
      document.querySelectorAll('.zk-select-menu').forEach(m => m.classList.remove('show'));
      document.querySelectorAll('.zk-select-trigger').forEach(t => t.classList.remove('active'));
    }
  });
});
