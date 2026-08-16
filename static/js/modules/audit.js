/**
 * ZK Remote Operations Center - SIEM Audit Log Inspection Module
 */

const AuditManager = {
  currentFilters: { q: '', operation: '', status: '', category: '' },

  init() {
    this.tableBody = document.getElementById('audit-table-body');
    this.searchInput = document.getElementById('audit-search-input');
    this.opFilter = document.getElementById('audit-op-filter');
    this.statusFilter = document.getElementById('audit-status-filter');

    if (!this.tableBody) return;

    this.bindEvents();
    this.loadLogs();
  },

  bindEvents() {
    if (this.searchInput) {
      let debounceTimer;
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.currentFilters.q = e.target.value;
          this.loadLogs();
        }, 250);
      });
    }

    if (this.opFilter) {
      this.opFilter.addEventListener('change', (e) => {
        this.currentFilters.operation = e.target.value;
        this.loadLogs();
      });
    }

    if (this.statusFilter) {
      this.statusFilter.addEventListener('change', (e) => {
        this.currentFilters.status = e.target.value;
        this.loadLogs();
      });
    }
  },

  setCategoryFilter(category, btn) {
    this.currentFilters.category = category;
    document.querySelectorAll('.audit-filter-chip').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.loadLogs();
  },

  async loadLogs() {
    this.renderSkeleton();
    try {
      const data = await API.get('/api/audit/', this.currentFilters);
      let logs = data.results || data;

      // Category filter in client if needed
      if (this.currentFilters.category === 'FILE') {
        logs = logs.filter(l => (l.operation || '').includes('FILE') || (l.operation || '').includes('DIR') || (l.operation || '').includes('UPLOAD') || (l.operation || '').includes('DOWNLOAD'));
      } else if (this.currentFilters.category === 'TERMINAL') {
        logs = logs.filter(l => (l.operation || '').includes('EXEC') || (l.operation || '').includes('COMMAND') || (l.operation || '').includes('TERMINAL') || (l.operation || '').includes('SSH'));
      } else if (this.currentFilters.category === 'AUTH') {
        logs = logs.filter(l => (l.operation || '').includes('LOGIN') || (l.operation || '').includes('LOGOUT') || (l.operation || '').includes('AUTH') || (l.operation || '').includes('DEVICE'));
      }

      this.renderLogs(logs);
    } catch (err) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: #EF4444; padding: 32px;">
            Denetim kayıtları yüklenemedi: ${err.message}
          </td>
        </tr>
      `;
    }
  },

  renderSkeleton() {
    this.tableBody.innerHTML = Array(6).fill(0).map(() => `
      <tr>
        <td><div class="skeleton" style="height: 14px; width: 14px; border-radius: 4px;"></div></td>
        <td><div class="skeleton" style="height: 16px; width: 130px; border-radius: 4px;"></div></td>
        <td><div class="skeleton" style="height: 16px; width: 80px; border-radius: 4px;"></div></td>
        <td><div class="skeleton" style="height: 16px; width: 110px; border-radius: 4px;"></div></td>
        <td><div class="skeleton" style="height: 16px; width: 100px; border-radius: 4px;"></div></td>
        <td><div class="skeleton" style="height: 16px; width: 220px; border-radius: 4px;"></div></td>
        <td><div class="skeleton" style="height: 18px; width: 65px; border-radius: 4px;"></div></td>
        <td><div class="skeleton" style="height: 16px; width: 85px; border-radius: 4px;"></div></td>
      </tr>
    `).join('');
  },

  renderLogs(logs) {
    if (!logs || logs.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 36px; color: var(--text-muted);">
            <i data-lucide="shield-check" style="width: 28px; height: 28px; margin-bottom: 8px; opacity: 0.6;"></i>
            <div style="font-weight: 600; color: var(--text-primary);">Denetim Kaydı Bulunamadı</div>
            <div style="font-size: 11.5px; margin-top: 2px;">Seçilen kriterlere uygun olay günlüğü bulunmuyor.</div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    let html = '';
    logs.forEach(l => {
      const timeStr = new Date(l.timestamp).toLocaleString('tr-TR');
      const isSuccess = l.status === 'SUCCESS';
      const badgeClass = isSuccess ? 'green' : (l.status === 'DENIED' ? 'orange' : 'red');

      html += `
        <tr class="audit-row" onclick="this.classList.toggle('expanded')">
          <td style="text-align: center;">
            <i data-lucide="chevron-right" class="chevron-arrow" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
          </td>
          <td style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-secondary);">${timeStr}</td>
          <td><strong style="color: var(--text-primary);">${l.username}</strong></td>
          <td>
            <span style="font-family: var(--font-mono); font-size: 12px; font-weight: 600;">${l.hostname || 'SYSTEM'}</span>
          </td>
          <td>
            <span style="font-weight: 600; color: var(--text-primary); font-size: 12px;">${l.operation_display || l.operation}</span>
          </td>
          <td style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-primary); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${l.path || l.details || '--'}
          </td>
          <td style="text-align: center;">
            <span class="badge ${badgeClass}" style="font-size: 9.5px; padding: 2px 6px; font-weight: 700;">${l.status_display || l.status}</span>
          </td>
          <td style="text-align: right; font-family: var(--font-mono); font-size: 11.5px; padding-right: 18px;">${l.ip_address || '127.0.0.1'}</td>
        </tr>
        <tr class="audit-detail-row">
          <td colspan="8" style="padding: 0;">
            <div class="audit-detail-content">
              <div>
                <div class="detail-field-title">Kullanıcı &amp; Rol</div>
                <div class="detail-field-value">${l.username} (${l.user_role || 'Operatör'})</div>
              </div>
              <div>
                <div class="detail-field-title">İstemci IP Adresi</div>
                <div class="detail-field-value">${l.ip_address || '127.0.0.1'}</div>
              </div>
              <div>
                <div class="detail-field-title">Hedef Düğüm / Sunucu</div>
                <div class="detail-field-value">${l.hostname || 'SYSTEM'}</div>
              </div>
              <div>
                <div class="detail-field-title">Hedef Dosya / Komut Yolu</div>
                <div class="detail-field-value">${l.path || l.details || '--'}</div>
              </div>
              <div>
                <div class="detail-field-title">İşlem &amp; Durum Kodu</div>
                <div class="detail-field-value" style="color: ${isSuccess ? '#10B981' : '#EF4444'}; font-weight: 700;">
                  ${l.operation} &bull; ${l.status_display || l.status}
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    });

    this.tableBody.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  },

  async exportCSV() {
    try {
      const data = await API.get('/api/audit/', this.currentFilters);
      const logs = data.results || data;
      if (!logs || !logs.length) {
        Toast.info('Dışa aktarılacak denetim kaydı bulunamadı.');
        return;
      }
      let csv = 'Zaman,Kullanici,Rol,Hedef_Dugum,Islem,Hedef_Yol,Durum,IP\n';
      logs.forEach(l => {
        csv += `"${l.timestamp}","${l.username}","${l.user_role || ''}","${l.hostname || ''}","${l.operation}","${l.path || l.details || ''}","${l.status}","${l.ip_address}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zk_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Toast.success('Denetim kayıtları CSV formatında indirildi.');
    } catch (err) {
      Toast.error('Dışa aktarma hatası: ' + err.message);
    }
  },

  async exportJSON() {
    try {
      const data = await API.get('/api/audit/', this.currentFilters);
      const logs = data.results || data;
      if (!logs || !logs.length) {
        Toast.info('Dışa aktarılacak denetim kaydı bulunamadı.');
        return;
      }
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zk_audit_logs_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Toast.success('Denetim kayıtları JSON formatında indirildi.');
    } catch (err) {
      Toast.error('Dışa aktarma hatası: ' + err.message);
    }
  }
};

window.AuditManager = AuditManager;
document.addEventListener('DOMContentLoaded', () => AuditManager.init());
