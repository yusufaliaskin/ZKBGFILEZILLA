/**
 * ZK Remote Operations Center - Multi-Format Universal File Viewer & Cloud IDE Editor
 * Supports: Text/Code (Monaco), PDF, Excel (.xlsx/.xls/.csv via SheetJS), Images, Media
 */

const FilePreview = {
  editorInstance: null,
  currentDeviceId: null,
  currentPath: '',
  currentExt: '',
  isLoaded: false,
  currentWorkbook: null,
  currentFontSize: 13.5,
  isWordWrap: true,
  currentEditorTheme: 'vs-dark',
  initialContent: '',

  init() {
    this.modal = document.getElementById('file-preview-modal');
    this.container = document.getElementById('monaco-editor-container');
    this.saveBtn = document.getElementById('preview-btn-save');

    if (this.saveBtn && !this.saveBtn._bound) {
      this.saveBtn._bound = true;
      this.saveBtn.addEventListener('click', () => this.saveChanges());
    }

    // Ctrl+S / Cmd+S Global inside modal
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (this.modal && this.modal.classList.contains('active')) {
          e.preventDefault();
          this.saveChanges();
        }
      }
      if (e.key === 'Escape') {
        if (this.modal && this.modal.classList.contains('active')) {
          const box = document.getElementById('preview-modal-box');
          if (box && box.classList.contains('fullscreen')) {
            this.toggleFullscreen();
          }
        }
      }
    });

    window.addEventListener('resize', () => {
      if (this.editorInstance) this.editorInstance.layout();
    });

    window.addEventListener('themeChanged', () => {
      if (window.monaco && window.monaco.editor && this.editorInstance) {
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        this.currentEditorTheme = theme === 'dark' ? 'vs-dark' : 'vs';
        monaco.editor.setTheme(this.currentEditorTheme);
        this.updateThemeButton();
      }
    });
  },

  copyCurrentPath() {
    if (!this.currentPath) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(this.currentPath).then(() => {
        if (window.Toast) Toast.success(`Dosya yolu kopyalandı: ${this.currentPath}`);
      }).catch(() => {
        if (window.Toast) Toast.info(this.currentPath);
      });
    } else {
      if (window.Toast) Toast.info(this.currentPath);
    }
  },

  toggleWordWrap() {
    this.isWordWrap = !this.isWordWrap;
    if (this.editorInstance) {
      this.editorInstance.updateOptions({ wordWrap: this.isWordWrap ? 'on' : 'off' });
    } else {
      const ta = document.getElementById('fallback-editor-textarea');
      if (ta) ta.style.whiteSpace = this.isWordWrap ? 'pre-wrap' : 'pre';
    }
    const btn = document.getElementById('btn-editor-wrap');
    if (btn) btn.classList.toggle('active', this.isWordWrap);
  },

  zoomEditor(delta) {
    this.currentFontSize = Math.max(10, Math.min(26, this.currentFontSize + delta));
    if (this.editorInstance) {
      this.editorInstance.updateOptions({ fontSize: this.currentFontSize });
    } else {
      const ta = document.getElementById('fallback-editor-textarea');
      if (ta) ta.style.fontSize = `${this.currentFontSize}px`;
    }
  },

  toggleEditorTheme() {
    this.currentEditorTheme = this.currentEditorTheme === 'vs-dark' ? 'vs' : 'vs-dark';
    if (window.monaco && window.monaco.editor && this.editorInstance) {
      monaco.editor.setTheme(this.currentEditorTheme);
    }
    this.updateThemeButton();
  },

  updateThemeButton() {
    const btnIcon = document.getElementById('editor-theme-icon');
    const isDark = this.currentEditorTheme === 'vs-dark';
    if (btnIcon) {
      btnIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
      if (window.lucide) window.lucide.createIcons();
    }
    const sb = document.getElementById('editor-status-bar');
    if (sb) sb.classList.toggle('dark-mode', isDark);
  },

  toggleFullscreen() {
    const box = document.getElementById('preview-modal-box');
    const fsIcon = document.getElementById('editor-fs-icon');
    if (!box) return;
    const isFs = box.classList.toggle('fullscreen');
    if (fsIcon) {
      fsIcon.setAttribute('data-lucide', isFs ? 'minimize-2' : 'maximize-2');
      if (window.lucide) window.lucide.createIcons();
    }
    setTimeout(() => {
      if (this.editorInstance) this.editorInstance.layout();
    }, 100);
  },

  async ensureMonacoLoaded() {
    if (window.monaco) return Promise.resolve();

    return new Promise((resolve) => {
      if (typeof require !== 'undefined' && require.config) {
        require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.40.0/min/vs' } });
        require(['vs/editor/editor.main'], () => {
          this.isLoaded = true;
          resolve();
        });
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.40.0/min/vs/loader.min.js';
        script.onload = () => {
          try {
            require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.40.0/min/vs' } });
            require(['vs/editor/editor.main'], () => {
              this.isLoaded = true;
              resolve();
            });
          } catch (e) {
            resolve();
          }
        };
        script.onerror = () => resolve();
        document.head.appendChild(script);
        setTimeout(() => resolve(), 3000);
      }
    });
  },

  async ensureSheetJSLoaded() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
      setTimeout(() => resolve(), 3000);
    });
  },

  async open(deviceId, path, fileName) {
    this.currentDeviceId = deviceId;
    this.currentPath = path;
    this.init();

    const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
    this.currentExt = ext;

    if (window.Modal) Modal.open('file-preview-modal');
    
    // Set active tab title & dirty state
    const titleEl = document.getElementById('preview-modal-filename');
    if (titleEl) titleEl.innerText = fileName;

    const pathBadge = document.getElementById('preview-modal-path');
    if (pathBadge) pathBadge.innerText = path;

    const dirtyBadge = document.getElementById('editor-dirty-badge');
    if (dirtyBadge) dirtyBadge.style.display = 'none';

    // Set file icon
    const fileIcon = document.getElementById('editor-file-icon');
    if (fileIcon) {
      if (['py'].includes(ext)) { fileIcon.style.color = '#38BDF8'; }
      else if (['json', 'yaml', 'yml'].includes(ext)) { fileIcon.style.color = '#F59E0B'; }
      else if (['sh', 'bash', 'zsh', 'ps1'].includes(ext)) { fileIcon.style.color = '#10B981'; }
      else if (['sql'].includes(ext)) { fileIcon.style.color = '#0284C7'; }
      else if (['conf', 'ini', 'cfg', 'service'].includes(ext)) { fileIcon.style.color = '#8B5CF6'; }
      else if (['pdf'].includes(ext)) { fileIcon.style.color = '#E30613'; }
      else { fileIcon.style.color = 'var(--text-primary)'; }
    }

    if (!this.container) return;
    this.container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted); font-family: var(--font-mono); display: flex; align-items: center; justify-content: center; height: 100%;"><i data-lucide="loader-2" class="spin" style="width:20px;height:20px;margin-right:8px;"></i> Dosya yükleniyor...</div>';
    if (window.lucide) window.lucide.createIcons();

    // Show/hide save button based on file type
    const isEditableText = ['txt', 'log', 'py', 'js', 'json', 'html', 'css', 'sh', 'bash', 'zsh', 'ps1', 'yaml', 'yml', 'ini', 'conf', 'cfg', 'service', 'sql', 'md', 'env', 'xml', 'c', 'cpp', 'java', 'properties', 'toml', 'dockerfile'].includes(ext) || ext === '';
    if (this.saveBtn) {
      this.saveBtn.style.display = isEditableText ? 'inline-flex' : 'none';
    }

    try {
      // 1. PDF Viewer
      if (ext === 'pdf') {
        const downloadUrl = `/api/devices/${deviceId}/files/download/?path=${encodeURIComponent(path)}`;
        this.container.innerHTML = `
          <iframe src="${downloadUrl}" class="pdf-preview-frame" title="PDF Önizleme"></iframe>
        `;
        return;
      }

      // 2. Excel & CSV Viewer (SheetJS)
      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        await this.ensureSheetJSLoaded();
        const downloadUrl = `/api/devices/${deviceId}/files/download/?path=${encodeURIComponent(path)}`;
        const response = await fetch(downloadUrl);
        const arrayBuffer = await response.arrayBuffer();

        if (window.XLSX) {
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          this.currentWorkbook = workbook;
          this.renderExcelViewer(workbook);
        } else {
          const text = new TextDecoder().decode(arrayBuffer);
          this.renderTextFallback(text);
        }
        return;
      }

      // 3. Image Viewer
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
        const downloadUrl = `/api/devices/${deviceId}/files/download/?path=${encodeURIComponent(path)}`;
        this.container.innerHTML = `
          <div class="image-preview-container">
            <img src="${downloadUrl}" alt="${fileName}" class="image-preview-img">
          </div>
        `;
        return;
      }

      // 4. Audio / Video Player
      if (['mp3', 'wav', 'ogg'].includes(ext)) {
        const downloadUrl = `/api/devices/${deviceId}/files/download/?path=${encodeURIComponent(path)}`;
        this.container.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 16px;">
            <i data-lucide="music" style="width: 48px; height: 48px; color: var(--accent-primary);"></i>
            <audio controls src="${downloadUrl}" style="width: 80%; max-width: 500px;"></audio>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      if (['mp4', 'webm'].includes(ext)) {
        const downloadUrl = `/api/devices/${deviceId}/files/download/?path=${encodeURIComponent(path)}`;
        this.container.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
            <video controls src="${downloadUrl}" style="max-width: 90%; max-height: 90%; border-radius: 8px;"></video>
          </div>
        `;
        return;
      }

      // 5. Code & Text Editor (Monaco Editor with Full Layout)
      const data = await API.get(`/api/devices/${deviceId}/files/preview/`, { path });
      await this.ensureMonacoLoaded();

      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      this.currentEditorTheme = currentTheme === 'dark' ? 'vs-dark' : 'vs';
      this.initialContent = data.content || '';

      if (this.editorInstance) {
        this.editorInstance.dispose();
        this.editorInstance = null;
      }

      if (window.monaco && window.monaco.editor) {
        const langDisplay = (data.language || ext || 'plaintext').toUpperCase();
        const lineCount = (data.content.match(/\n/g) || []).length + 1;
        const charCount = data.content.length;

        this.container.innerHTML = `
          <div id="monaco-inner-host" style="width: 100%; height: calc(100% - 28px);"></div>
          <div class="editor-status-bar ${this.currentEditorTheme === 'vs-dark' ? 'dark-mode' : ''}" id="editor-status-bar">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="editor-status-pill" id="editor-status-lang">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
                <span>${langDisplay}</span>
              </span>
              <span id="editor-status-pos">Satır 1, Sütun 1</span>
              <span id="editor-status-count" style="opacity: 0.85;">${lineCount} satır, ${charCount} karakter</span>
            </div>
            <div style="display: flex; align-items: center; gap: 16px;">
              <span>Spaces: 4</span>
              <span>UTF-8</span>
              <span>LF</span>
              <span class="editor-status-pill" style="background: rgba(16, 185, 129, 0.2); color: #10B981;">
                <i data-lucide="lock" style="width: 10px; height: 10px;"></i> RW
              </span>
            </div>
          </div>
        `;

        const innerHost = document.getElementById('monaco-inner-host');
        this.editorInstance = monaco.editor.create(innerHost, {
          value: data.content,
          language: data.language || 'plaintext',
          theme: this.currentEditorTheme,
          automaticLayout: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          fontSize: this.currentFontSize,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          tabSize: 4,
          wordWrap: this.isWordWrap ? 'on' : 'off',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          bracketPairColorization: { enabled: true }
        });

        // Track cursor position and line changes
        this.editorInstance.onDidChangeCursorPosition((e) => {
          const posEl = document.getElementById('editor-status-pos');
          if (posEl) {
            posEl.innerText = `Satır ${e.position.lineNumber}, Sütun ${e.position.column}`;
          }
        });

        // Track content modification (dirty indicator)
        this.editorInstance.onDidChangeModelContent(() => {
          const val = this.editorInstance.getValue();
          const isDirty = val !== this.initialContent;
          const dirtyEl = document.getElementById('editor-dirty-badge');
          if (dirtyEl) dirtyEl.style.display = isDirty ? 'inline-block' : 'none';

          const countEl = document.getElementById('editor-status-count');
          if (countEl) {
            const lines = (val.match(/\n/g) || []).length + 1;
            countEl.innerText = `${lines} satır, ${val.length} karakter`;
          }
        });

        // Trigger layout pass
        setTimeout(() => {
          if (this.editorInstance) this.editorInstance.layout();
        }, 50);
        setTimeout(() => {
          if (this.editorInstance) this.editorInstance.layout();
        }, 200);
      } else {
        this.renderTextFallback(data.content);
      }
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      if (window.Toast) Toast.error(`Dosya görüntüleme hatası: ${err.message}`);
      if (window.Modal) Modal.close('file-preview-modal');
    }
  },

  renderExcelViewer(workbook) {
    const sheetNames = workbook.SheetNames;
    if (!sheetNames || sheetNames.length === 0) {
      this.container.innerHTML = '<div style="padding: 24px; color: var(--text-muted);">Çalışma sayfası bulunamadı.</div>';
      return;
    }

    let tabsHtml = sheetNames.map((name, i) => `
      <button class="excel-tab-btn ${i === 0 ? 'active' : ''}" onclick="FilePreview.switchExcelSheet('${name}', this)">
        ${name}
      </button>
    `).join('');

    this.container.innerHTML = `
      <div class="excel-viewer-container">
        <div class="excel-sheet-tabs">${tabsHtml}</div>
        <div class="excel-grid-wrapper" id="excel-grid-view"></div>
      </div>
    `;

    this.renderSheetTable(sheetNames[0]);
  },

  switchExcelSheet(sheetName, btn) {
    document.querySelectorAll('.excel-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.renderSheetTable(sheetName);
  },

  renderSheetTable(sheetName) {
    const gridEl = document.getElementById('excel-grid-view');
    if (!gridEl || !this.currentWorkbook) return;

    const worksheet = this.currentWorkbook.Sheets[sheetName];
    if (!worksheet) return;

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (!jsonData || jsonData.length === 0) {
      gridEl.innerHTML = '<div style="padding: 24px; color: var(--text-muted);">Bu sayfa boş.</div>';
      return;
    }

    let maxCols = Math.max(...jsonData.map(row => row.length));
    let tableHtml = '<table class="excel-data-table"><thead><tr><th style="width:40px;">#</th>';

    // A, B, C, ... column headers
    for (let c = 0; c < maxCols; c++) {
      let colName = String.fromCharCode(65 + (c % 26));
      if (c >= 26) colName = String.fromCharCode(64 + Math.floor(c / 26)) + colName;
      tableHtml += `<th>${colName}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';

    jsonData.forEach((row, rowIdx) => {
      tableHtml += `<tr><th style="font-size: 11px; width: 40px; text-align: center; color: var(--text-muted);">${rowIdx + 1}</th>`;
      for (let c = 0; c < maxCols; c++) {
        const cellVal = (row[c] !== undefined && row[c] !== null) ? row[c] : '';
        tableHtml += `<td>${cellVal}</td>`;
      }
      tableHtml += '</tr>';
    });

    tableHtml += '</tbody></table>';
    gridEl.innerHTML = tableHtml;
  },

  renderTextFallback(content) {
    this.container.innerHTML = `
      <textarea id="fallback-editor-textarea" style="width: 100%; height: 100%; min-height: 480px; background: var(--bg-surface); color: var(--text-primary); border: 1.5px solid var(--border-default); border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 13px; padding: 14px; resize: none; outline: none;"></textarea>
    `;
    document.getElementById('fallback-editor-textarea').value = content;
  },

  async saveChanges() {
    let content = '';
    if (this.editorInstance) {
      content = this.editorInstance.getValue();
    } else {
      const ta = document.getElementById('fallback-editor-textarea');
      content = ta ? ta.value : '';
    }

    const btn = this.saveBtn;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:14px;height:14px;"></i> Sunucuya Aktarılıyor...';
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      await API.post(`/api/devices/${this.currentDeviceId}/files/save/`, {
        path: this.currentPath,
        content: content,
      });
      if (window.Toast) Toast.success('Dosya başarıyla kaydedildi ve uzak sunucuya aktarıldı.');
      this.initialContent = content;
      const dirtyEl = document.getElementById('editor-dirty-badge');
      if (dirtyEl) dirtyEl.style.display = 'none';

      if (window.Modal) Modal.close('file-preview-modal');
      if (window.FileManager) FileManager.loadDirectory();
    } catch (err) {
      if (window.Toast) Toast.error(`Dosya kaydedilemedi: ${err.message}`);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save" style="width: 14px; height: 14px;"></i> <span>Değişiklikleri Kaydet &amp; Senkronize Et</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }
};

window.FilePreview = FilePreview;
window.FilePreviewModal = FilePreview;

document.addEventListener('DOMContentLoaded', () => FilePreview.init());
