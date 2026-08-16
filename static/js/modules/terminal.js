/**
 * ZK Remote Operations Center - Real Multi-Terminal & Windows-Style Docking UX
 * 
 * Features:
 * - HTML5 Drag & Drop window splitting & tab docking (Windows Terminal / VS Code style)
 * - OS-Aware Dynamic Fast Snippets with smooth transitions
 * - Tab Key Auto-Completion for Linux (Bash) and Windows (PowerShell)
 * - Real Dynamic Tab Strip with "+" Add Button
 * - Topbar Prominent Server Switcher with Zero Overflow Clipping
 * - In-Pane Split Controls (Split Right, Split Down, Dock Tab, Close)
 * - Multi-Exec Broadcast Terminal Matrix (Simultaneous command execution)
 * - SIEM Session Recording & Step-by-Step Replay
 * - Themes (Matrix, Dracula, Monokai, Nord, Cyberpunk, Amber, etc.)
 */

const TerminalApp = {
  panes: {},
  activePaneId: null,
  paneCounter: 0,
  viewMode: 'tabs', // 'tabs' (single fullscreen tab) or 'split' (side-by-side windows)
  draggedPaneId: null,
  currentDockZone: 'tab-dock',
  fontSize: 13,
  currentTheme: 'default',
  currentFont: 'JetBrains Mono',
  defaultDeviceId: 'local',
  hostOs: 'LINUX',
  hostHostname: 'localhost',
  hostIp: '127.0.0.1',
  hostBuildStr: '',

  // SIEM Recording State
  isRecording: false,
  recordStartTime: 0,
  recordedEvents: [],
  recTimerInterval: null,
  replayInterval: null,
  replayIdx: 0,
  replaySpeed: 1,

  // OS-Aware Enterprise Snippets Library
  snippets: [
    // 🐧 LINUX / PARDUS SNIPPETS
    // System & Resources
    { title: 'Sistem Durumu & Uptime', cmd: 'uptime -p', cat: 'system', os: 'linux' },
    { title: 'Bellek Kullanımı (RAM/Swap)', cmd: 'free -h', cat: 'system', os: 'linux' },
    { title: 'Disk Bölümleri & Doluluk (df)', cmd: 'df -hT', cat: 'system', os: 'linux' },
    { title: 'En Çok RAM Tüketen 10 Süreç', cmd: 'ps aux --sort=-%mem | head -n 11', cat: 'system', os: 'linux' },
    { title: 'En Çok CPU Tüketen 10 Süreç', cmd: 'ps aux --sort=-%cpu | head -n 11', cat: 'system', os: 'linux' },
    { title: 'İşlemci Mimarisi & Çekirdekler', cmd: 'lscpu', cat: 'system', os: 'linux' },
    { title: 'Çekirdek (Kernel) & Dağıtım Bilgisi', cmd: 'uname -a && cat /etc/os-release', cat: 'system', os: 'linux' },
    // Network & Firewall
    { title: 'Ağ Arayüzleri & IP Adresleri', cmd: 'ip -c a', cat: 'network', os: 'linux' },
    { title: 'Dinleyen Portlar & Servisler (ss)', cmd: 'ss -tulpn', cat: 'network', os: 'linux' },
    { title: 'Yönlendirme Tablosu (Routing Table)', cmd: 'ip route show', cat: 'network', os: 'linux' },
    { title: 'Aktif TCP Bağlantıları (Established)', cmd: 'ss -ant state established', cat: 'network', os: 'linux' },
    { title: 'DNS Çözümleme & Ping Testi', cmd: 'ping -c 4 8.8.8.8', cat: 'network', os: 'linux' },
    { title: 'UFW Güvenlik Duvarı Durumu', cmd: 'ufw status verbose', cat: 'network', os: 'linux' },
    // Services & Systemd
    { title: 'Nginx Servis Durumu', cmd: 'systemctl status nginx --no-pager', cat: 'services', os: 'linux' },
    { title: 'PostgreSQL Servis Durumu', cmd: 'systemctl status postgresql --no-pager', cat: 'services', os: 'linux' },
    { title: 'SSH Daemon Servis Durumu', cmd: 'systemctl status sshd --no-pager', cat: 'services', os: 'linux' },
    { title: 'Başarısız Servisleri Listele (Failed)', cmd: 'systemctl --failed', cat: 'services', os: 'linux' },
    { title: 'Docker Çalışan Konteynerlar', cmd: 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"', cat: 'services', os: 'linux' },
    // Security & Logs
    { title: 'Son 50 Sistem Logu (Journalctl)', cmd: 'journalctl -xe -n 50 --no-pager', cat: 'security', os: 'linux' },
    { title: 'Son Başarısız Giriş Denemeleri', cmd: 'lastb -n 20', cat: 'security', os: 'linux' },
    { title: 'Şu Anda Bağlı Kullanıcılar (Who)', cmd: 'who -u', cat: 'security', os: 'linux' },
    { title: 'Sudo Yetkili Kullanıcı Listesi', cmd: 'grep -Po "^sudo.+:\\K.*$" /etc/group', cat: 'security', os: 'linux' },
    { title: 'Kimlik Doğrulama Logu (Auth.log)', cmd: 'tail -n 30 /var/log/auth.log', cat: 'security', os: 'linux' },
    // Files & Permissions
    { title: 'Dizini Sıkıştır (tar.gz)', cmd: 'tar -czvf backup.tar.gz /var/www/', cat: 'files', os: 'linux' },
    { title: 'Loglarda Hata Ara (grep ERROR)', cmd: "grep -rnw '/var/log/' -e 'ERROR' | head -n 30", cat: 'files', os: 'linux' },
    { title: '100MB Üzeri Büyük Dosyaları Bul', cmd: 'find / -type f -size +100M -exec ls -lh {} + 2>/dev/null | head -n 20', cat: 'files', os: 'linux' },
    { title: 'Dizin Sahipliğini Değiştir (chown)', cmd: 'chown -R www-data:www-data /var/www/html', cat: 'files', os: 'linux' },

    // 🪟 WINDOWS / POWERSHELL SNIPPETS
    // System & Hardware
    { title: 'Bilgisayar & Windows Sürüm Bilgisi', cmd: 'Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, TotalPhysicalMemory', cat: 'system', os: 'windows' },
    { title: 'En Çok CPU Kullanan 10 Süreç', cmd: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Id, ProcessName, CPU, WorkingSet', cat: 'system', os: 'windows' },
    { title: 'Disk Sürücüleri & Doluluk Oranları', cmd: 'Get-Volume | Select-Object DriveLetter, FileSystemLabel, @{N="Size(GB)";E={[math]::Round($_.Size/1GB,2)}}, @{N="Free(GB)";E={[math]::Round($_.SizeRemaining/1GB,2)}}', cat: 'system', os: 'windows' },
    { title: 'İşlemci & Çekirdek Bilgileri', cmd: 'Get-WmiObject Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors', cat: 'system', os: 'windows' },
    { title: 'Sistem Başlatılma Zamanı (Uptime)', cmd: '(Get-CimInstance Win32_OperatingSystem).LastBootUpTime', cat: 'system', os: 'windows' },
    // Network & Ports
    { title: 'Ağ Adaptörleri & IPv4 Adresleri', cmd: 'Get-NetIPAddress -AddressFamily IPv4 | Select-Object IPAddress, InterfaceAlias', cat: 'network', os: 'windows' },
    { title: 'Dinlenen TCP Portları & PID (NetTCP)', cmd: 'Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess', cat: 'network', os: 'windows' },
    { title: 'Hedef Sunucu Port Testi (Telnet)', cmd: 'Test-NetConnection -ComputerName 10.20.15.10 -Port 22', cat: 'network', os: 'windows' },
    { title: 'Detaylı Ağ Yapılandırması (ipconfig)', cmd: 'ipconfig /all', cat: 'network', os: 'windows' },
    { title: 'DNS Sunucu Adresleri', cmd: 'Get-DnsClientServerAddress -AddressFamily IPv4', cat: 'network', os: 'windows' },
    // Services & Processes
    { title: 'Çalışan Windows Servisleri', cmd: "Get-Service | Where-Object {$_.Status -eq 'Running'} | Select-Object -First 25 Name, DisplayName, Status", cat: 'services', os: 'windows' },
    { title: 'Otomatik Başlayan Durmuş Servisler', cmd: "Get-Service | Where-Object {$_.Status -eq 'Stopped' -and $_.StartType -eq 'Automatic'}", cat: 'services', os: 'windows' },
    { title: 'Yazdırma Biriktiricisi Yeniden Başlat', cmd: 'Restart-Service -Name Spooler -Force', cat: 'services', os: 'windows' },
    { title: 'Kritik Sunucu Servislerini Kontrol Et', cmd: 'Get-Service -Name W3SVC, MSSQLSERVER, LanmanServer -ErrorAction SilentlyContinue', cat: 'services', os: 'windows' },
    // Security & Events
    { title: 'Son 15 Sistem Hatası (EventLog)', cmd: 'Get-EventLog -LogName System -EntryType Error -Newest 15 | Select-Object TimeGenerated, Source, Message', cat: 'security', os: 'windows' },
    { title: 'Başarısız Oturum Açma Olayları (4625)', cmd: 'Get-WinEvent -FilterHashtable @{LogName="Security"; Id=4625} -MaxEvents 10 -ErrorAction SilentlyContinue', cat: 'security', os: 'windows' },
    { title: 'Yerel Kullanıcı Hesapları', cmd: 'Get-LocalUser | Select-Object Name, Enabled, LastLogon', cat: 'security', os: 'windows' },
    { title: 'Administrators Grubu Üyeleri', cmd: 'Get-LocalGroupMember -Group "Administrators"', cat: 'security', os: 'windows' },
    // Files & Disk
    { title: 'En Büyük 10 Log Dosyasını Listele', cmd: 'Get-ChildItem -Path C:\\ -Recurse -Filter *.log -ErrorAction SilentlyContinue | Sort-Object Length -Descending | Select-Object -First 10 FullName, @{N="Size(MB)";E={[math]::Round($_.Length/1MB,2)}}', cat: 'files', os: 'windows' },
    { title: 'Klasör İzinlerini Denetle (icacls)', cmd: 'icacls "C:\\inetpub\\wwwroot"', cat: 'files', os: 'windows' },
    { title: 'Log Klasörünü Zip Olarak Arşivle', cmd: 'Compress-Archive -Path "C:\\Logs\\*" -DestinationPath "C:\\Backup\\logs.zip" -Force', cat: 'files', os: 'windows' }
  ],

  // ═════════════════════════════════════════════════════════════════════════
  // 1. Core Lifecycle & Window Manager
  // ═════════════════════════════════════════════════════════════════════════
  init(defaultDeviceId, hostOs, hostHostname, hostIp, hostBuildStr) {
    this.defaultDeviceId = defaultDeviceId || 'local';
    this.hostOs = hostOs || 'LINUX';
    this.hostHostname = hostHostname || 'localhost';
    this.hostIp = hostIp || '127.0.0.1';
    this.hostBuildStr = hostBuildStr || '';

    this.container = document.getElementById('terminalGridContainer');
    this.tabsList = document.getElementById('termTabsList');
    this.dockOverlay = document.getElementById('term-dock-overlay');
    this.dockPreview = document.getElementById('term-dock-preview');
    this.dockHintText = document.getElementById('term-dock-hint-text');

    // Populate the Topbar Server Switcher Dropdown
    this.populateServerSwitcherList();

    // Setup Global Click Listener to Close Menus
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#termServerSwitcher')) {
        const menu = document.getElementById('termServerMenu');
        const btn = document.getElementById('termServerSwitcherBtn');
        if (menu) menu.classList.remove('show');
        if (btn) btn.classList.remove('active');
      }
    });

    // Initialize HTML5 Drag & Drop Docking Engine
    this.initDragAndDrop();

    // Keyboard global shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl + T : New Terminal Tab
      if (e.ctrlKey && e.key.toLowerCase() === 't' && !e.shiftKey) {
        e.preventDefault();
        this.addNewTerminal();
      }
      // Ctrl + W : Close Active Terminal
      else if (e.ctrlKey && e.key.toLowerCase() === 'w' && !e.shiftKey) {
        if (this.activePaneId) {
          e.preventDefault();
          this.closeTerminal(this.activePaneId);
        }
      }
      // Ctrl + Tab : Cycle Active Pane
      else if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        this.cycleActivePane();
      }
      // Ctrl + Shift + B : Broadcast Modal
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        this.openBroadcastModal();
      }
      // Ctrl + Shift + S : Snippets Drawer
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.toggleSnippetDrawer();
      }
      // Ctrl + Shift + R : Toggle Recording
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        this.toggleSessionRecording();
      }
    });

    // Spawn Initial Terminal
    this.addNewTerminal(this.defaultDeviceId);

    // Render initial Snippets
    this.renderSnippetsList('all');

    // Restore user settings
    try {
      const savedTheme = localStorage.getItem('zk_term_theme');
      if (savedTheme) this.setTheme(savedTheme, false);

      const savedFont = localStorage.getItem('zk_term_font');
      if (savedFont) this.setFontFamily(savedFont, false);

      const savedSize = localStorage.getItem('zk_term_fontsize');
      if (savedSize) {
        this.fontSize = parseInt(savedSize, 10);
        this.adjustFontSize(0);
      }
    } catch (e) {}
  },

  addNewTerminal(targetNodeId = null) {
    this.paneCounter++;
    const paneId = `pane-${this.paneCounter}`;
    const initialNode = targetNodeId || this.defaultDeviceId || 'local';

    // 1. Create Pane HTML element with Windows-style Window Controls
    const paneEl = document.createElement('div');
    paneEl.className = 'term-pane active-pane';
    paneEl.id = paneId;
    paneEl.innerHTML = `
      <div class="term-pane-header" draggable="true" ondragstart="TerminalApp.handleTabDragStart(event, '${paneId}')" ondragend="TerminalApp.handleTabDragEnd(event)">
        <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
          <div class="term-pane-title" id="${paneId}-title">
            <img src="/static/img/pardus.png" style="width:15px;height:15px;object-fit:contain;" alt="OS">
            <span>Düğüm Yükleniyor...</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="term-pane-latency" id="${paneId}-latency"><i data-lucide="zap" style="width:10px;height:10px;"></i> 12ms</span>
          <span class="term-pane-badge badge-online" id="${paneId}-badge">BAĞLI (ONLINE)</span>
          
          <!-- In-Pane Windows Controls -->
          <div class="term-pane-controls">
            <button type="button" class="term-pane-tool-btn" onclick="TerminalApp.splitPaneRight('${paneId}')" title="Sağa Böl (Split Right)">
              <i data-lucide="columns-2" style="width:13px;height:13px;"></i>
            </button>
            <button type="button" class="term-pane-tool-btn" onclick="TerminalApp.splitPaneDown('${paneId}')" title="Alta Böl (Split Down)">
              <i data-lucide="rows-2" style="width:13px;height:13px;"></i>
            </button>
            <button type="button" class="term-pane-tool-btn" onclick="TerminalApp.dockAsTab('${paneId}')" title="Tekil Sekme Yap (Tab View)">
              <i data-lucide="maximize" style="width:12px;height:12px;"></i>
            </button>
            <button type="button" class="term-pane-tool-btn" onclick="TerminalApp.clearPaneScreen('${paneId}')" title="Ekranı Temizle (Ctrl+L)">
              <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
            </button>
            <button type="button" class="term-pane-tool-btn close" onclick="TerminalApp.closeTerminal('${paneId}')" title="Kapat (Ctrl+W)">
              <i data-lucide="x" style="width:13px;height:13px;"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="term-body" id="${paneId}-body">
        <div class="term-history-log" id="${paneId}-history"></div>
        <div class="term-active-line">
          <span class="term-active-prompt term-prompt-linux" id="${paneId}-prompt">root@node:/#</span>
          <input type="text" class="term-input" id="${paneId}-input" spellcheck="false" autocomplete="off" placeholder="Komut yazın (Tab: Otomatik Tamamlama, Enter: Çalıştır)">
        </div>
      </div>
    `;

    if (this.container) {
      this.container.appendChild(paneEl);
    }

    // 2. Register Pane Object
    this.panes[paneId] = {
      id: paneId,
      nodeId: initialNode,
      mode: initialNode === 'local' ? 'local' : 'remote',
      hostOs: this.hostOs,
      targetOs: this.hostOs === 'Windows' ? 'WINDOWS' : 'LINUX',
      currentCwd: this.hostOs === 'Windows' ? 'C:\\Users\\Operator' : '/home/operator',
      cmdHistory: [],
      historyIndex: -1,
      tabMatches: null,
      tabIndex: -1,
      input: paneEl.querySelector('.term-input'),
      body: paneEl.querySelector('.term-body'),
      historyEl: paneEl.querySelector('.term-history-log'),
      promptEl: paneEl.querySelector('.term-active-prompt'),
      titleEl: paneEl.querySelector('.term-pane-title'),
      badgeEl: paneEl.querySelector('.term-pane-badge'),
      latencyEl: paneEl.querySelector('.term-pane-latency'),
      el: paneEl
    };

    const pane = this.panes[paneId];
    this.bindPaneEvents(pane);

    // 3. Connect & Initialize Node
    this.switchPaneNode(paneId, initialNode);

    // 4. Update Tabs & Layout
    this.renderTabs();
    this.setActivePane(paneId);
    this.updateGridLayout();

    if (window.lucide) window.lucide.createIcons();
    Toast.info(`Yeni Terminal Sekmesi açıldı (#${this.paneCounter})`);
  },

  closeTerminal(paneId) {
    const paneKeys = Object.keys(this.panes);
    if (paneKeys.length <= 1) {
      this.clearPaneScreen(paneId);
      Toast.info('Son aktif terminal temizlendi.');
      return;
    }

    const pane = this.panes[paneId];
    if (pane && pane.el) {
      pane.el.remove();
    }
    delete this.panes[paneId];

    const remaining = Object.keys(this.panes);
    if (this.activePaneId === paneId) {
      this.setActivePane(remaining[remaining.length - 1]);
    }

    this.renderTabs();
    this.updateGridLayout();
  },

  setActivePane(paneId) {
    if (!this.panes[paneId]) return;
    this.activePaneId = paneId;
    const activePane = this.panes[paneId];

    // Highlight pane in DOM
    document.querySelectorAll('.term-pane').forEach(p => {
      p.classList.toggle('active-pane', p.id === paneId);
      if (this.viewMode === 'tabs') {
        p.style.display = p.id === paneId ? 'flex' : 'none';
      } else {
        p.style.display = 'flex';
      }
    });

    // Highlight tab in header
    document.querySelectorAll('.term-tab-item').forEach(t => {
      t.classList.toggle('active', t.dataset.pane === paneId);
    });

    // Update Topbar Server Switcher Display
    this.updateTopbarServerSwitcher(activePane);

    // Update Bottom Quick Chips for this active Pane's OS
    this.renderQuickChips(activePane.targetOs);

    // If Snippet Drawer is open, refresh its categories & list for this active Pane's OS
    if (document.getElementById('term-snippet-drawer')?.classList.contains('show')) {
      this.updateSnippetCategoriesForActivePane();
      this.renderSnippetsList('all');
    }

    this.focusActivePane();
  },

  cycleActivePane() {
    const paneKeys = Object.keys(this.panes);
    if (paneKeys.length <= 1) return;
    const currentIdx = paneKeys.indexOf(this.activePaneId);
    const nextIdx = (currentIdx + 1) % paneKeys.length;
    this.setActivePane(paneKeys[nextIdx]);
  },

  focusActivePane() {
    const pane = this.panes[this.activePaneId];
    if (pane && pane.input) {
      pane.input.focus();
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 2. Windows-Style Drag & Drop Docking Engine
  // ═════════════════════════════════════════════════════════════════════════
  initDragAndDrop() {
    const termContainer = document.getElementById('terminalContainer');
    if (!termContainer) return;

    termContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!this.draggedPaneId) return;

      const rect = this.container.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;

      if (!this.dockOverlay) return;
      this.dockOverlay.style.display = 'flex';

      // Determine Docking Zone
      if (x < rect.left + rect.width * 0.32) {
        this.currentDockZone = 'split-left';
        this.dockPreview.style.left = '4px';
        this.dockPreview.style.top = '4px';
        this.dockPreview.style.width = 'calc(50% - 6px)';
        this.dockPreview.style.height = 'calc(100% - 8px)';
        this.dockHintText.textContent = 'Pencereyi sola yerleştir (Split Left)';
      } else if (x > rect.right - rect.width * 0.32) {
        this.currentDockZone = 'split-right';
        this.dockPreview.style.left = 'calc(50% + 2px)';
        this.dockPreview.style.top = '4px';
        this.dockPreview.style.width = 'calc(50% - 6px)';
        this.dockPreview.style.height = 'calc(100% - 8px)';
        this.dockHintText.textContent = 'Pencereyi sağa yerleştir (Split Right)';
      } else if (y > rect.bottom - rect.height * 0.32) {
        this.currentDockZone = 'split-down';
        this.dockPreview.style.left = '4px';
        this.dockPreview.style.top = 'calc(50% + 2px)';
        this.dockPreview.style.width = 'calc(100% - 8px)';
        this.dockPreview.style.height = 'calc(50% - 6px)';
        this.dockHintText.textContent = 'Pencereyi alta yerleştir (Split Down)';
      } else {
        this.currentDockZone = 'tab-dock';
        this.dockPreview.style.left = '4px';
        this.dockPreview.style.top = '4px';
        this.dockPreview.style.width = 'calc(100% - 8px)';
        this.dockPreview.style.height = 'calc(100% - 8px)';
        this.dockHintText.textContent = 'Tekil tam ekran sekme olarak kenetle (Tab View)';
      }
    });

    termContainer.addEventListener('dragleave', (e) => {
      if (!e.relatedTarget || !termContainer.contains(e.relatedTarget)) {
        if (this.dockOverlay) this.dockOverlay.style.display = 'none';
      }
    });

    termContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!this.draggedPaneId) return;

      this.executeDockAction(this.draggedPaneId, this.currentDockZone);
      if (this.dockOverlay) this.dockOverlay.style.display = 'none';
      this.draggedPaneId = null;
    });
  },

  handleTabDragStart(event, paneId) {
    this.draggedPaneId = paneId;
    event.dataTransfer.setData('text/plain', paneId);
    event.dataTransfer.effectAllowed = 'move';
    const tabEl = document.querySelector(`.term-tab-item[data-pane="${paneId}"]`);
    if (tabEl) tabEl.classList.add('is-dragging');
  },

  handleTabDragEnd(event) {
    document.querySelectorAll('.term-tab-item').forEach(t => t.classList.remove('is-dragging'));
    if (this.dockOverlay) this.dockOverlay.style.display = 'none';
    this.draggedPaneId = null;
  },

  executeDockAction(paneId, dockZone) {
    if (dockZone === 'split-left' || dockZone === 'split-right' || dockZone === 'split-down') {
      this.viewMode = 'split';
      this.updateGridLayout();
      this.setActivePane(paneId);
      Toast.success('Pencere ekranı bölerek kenetlendi (Split Mode)');
    } else {
      this.viewMode = 'tabs';
      this.updateGridLayout();
      this.setActivePane(paneId);
      Toast.success('Pencere tekil sekme olarak birleştirildi (Tab Mode)');
    }
  },

  splitPaneRight(paneId) {
    const paneKeys = Object.keys(this.panes);
    if (paneKeys.length <= 1) {
      this.addNewTerminal();
    }
    this.viewMode = 'split';
    this.updateGridLayout('columns');
    this.setActivePane(paneId);
    Toast.info('Terminal sağa bölündü (Split Right)');
  },

  splitPaneDown(paneId) {
    const paneKeys = Object.keys(this.panes);
    if (paneKeys.length <= 1) {
      this.addNewTerminal();
    }
    this.viewMode = 'split';
    this.updateGridLayout('rows');
    this.setActivePane(paneId);
    Toast.info('Terminal alta bölündü (Split Down)');
  },

  dockAsTab(paneId) {
    this.viewMode = 'tabs';
    this.updateGridLayout();
    this.setActivePane(paneId);
    Toast.info('Tam ekran sekme görünümüne geçildi');
  },

  updateGridLayout(orientation = 'columns') {
    if (!this.container) return;
    const count = Object.keys(this.panes).length;

    if (this.viewMode === 'tabs' || count <= 1) {
      this.container.style.gridTemplateColumns = '1fr';
      this.container.style.gridTemplateRows = '1fr';
    } else if (count === 2) {
      if (orientation === 'rows') {
        this.container.style.gridTemplateColumns = '1fr';
        this.container.style.gridTemplateRows = '1fr 1fr';
      } else {
        this.container.style.gridTemplateColumns = '1fr 1fr';
        this.container.style.gridTemplateRows = '1fr';
      }
    } else if (count === 3) {
      this.container.style.gridTemplateColumns = '1fr 1fr 1fr';
      this.container.style.gridTemplateRows = '1fr';
    } else {
      this.container.style.gridTemplateColumns = '1fr 1fr';
      this.container.style.gridTemplateRows = '1fr 1fr';
    }
  },

  renderTabs() {
    if (!this.tabsList) return;

    let html = '';
    const paneKeys = Object.keys(this.panes);

    paneKeys.forEach(k => {
      const p = this.panes[k];
      const isWin = p.targetOs === 'WINDOWS';
      const logo = isWin ? '/static/img/windows.png' : '/static/img/pardus.png';
      const titleText = p.titleEl ? p.titleEl.querySelector('span')?.innerText || 'Terminal' : 'Terminal';

      html += `
        <div class="term-tab-item ${k === this.activePaneId ? 'active' : ''}" 
             data-pane="${k}" 
             draggable="true" 
             ondragstart="TerminalApp.handleTabDragStart(event, '${k}')" 
             ondragend="TerminalApp.handleTabDragEnd(event)"
             onclick="TerminalApp.setActivePane('${k}')"
             title="Sürükleyerek pencereyi bölebilirsiniz">
          <img src="${logo}" style="width:13px;height:13px;object-fit:contain;" alt="OS">
          <span class="term-tab-label">${titleText}</span>
          ${paneKeys.length > 1 ? `
            <button type="button" class="term-tab-close-btn" onclick="event.stopPropagation(); TerminalApp.closeTerminal('${k}')" title="Kapat">
              <i data-lucide="x" style="width:11px;height:11px;"></i>
            </button>
          ` : ''}
        </div>
      `;
    });

    // Add "+" Button at the end of tabs
    html += `
      <button type="button" class="term-add-tab-btn" onclick="TerminalApp.addNewTerminal()" title="Yeni Terminal Aç (Ctrl+T)">
        <i data-lucide="plus" style="width:13px;height:13px;"></i>
        <span>Yeni</span>
      </button>
    `;

    this.tabsList.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 3. Tab Key Auto-Completion & Keyboard Engine
  // ═════════════════════════════════════════════════════════════════════════
  bindPaneEvents(pane) {
    if (!pane.input) return;

    pane.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        pane.tabMatches = null;
        pane.tabIndex = -1;
        this.submitPaneCommand(pane.id, pane.input.value);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.handleTabCompletion(pane);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        pane.tabMatches = null;
        pane.tabIndex = -1;
        if (pane.cmdHistory.length > 0 && pane.historyIndex < pane.cmdHistory.length - 1) {
          pane.historyIndex++;
          pane.input.value = pane.cmdHistory[pane.cmdHistory.length - 1 - pane.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        pane.tabMatches = null;
        pane.tabIndex = -1;
        if (pane.historyIndex > 0) {
          pane.historyIndex--;
          pane.input.value = pane.cmdHistory[pane.cmdHistory.length - 1 - pane.historyIndex];
        } else if (pane.historyIndex === 0) {
          pane.historyIndex = -1;
          pane.input.value = '';
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        this.clearPaneScreen(pane.id);
      } else if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt') {
        pane.tabMatches = null;
        pane.tabIndex = -1;
      }
    });

    if (pane.el) {
      pane.el.addEventListener('click', () => {
        this.setActivePane(pane.id);
      });
    }
  },

  handleTabCompletion(pane) {
    const input = pane.input;
    if (!input) return;

    const val = input.value;
    const isWin = pane.targetOs === 'WINDOWS';

    const linuxDict = [
      'systemctl status', 'systemctl restart', 'systemctl start', 'systemctl stop', 'systemctl enable', 'systemctl reload',
      'journalctl -xe', 'journalctl -u', 'journalctl -f',
      'docker ps', 'docker ps -a', 'docker logs', 'docker restart', 'docker compose',
      'uptime', 'free -m', 'free -h', 'df -h', 'df -i', 'top', 'htop', 'ps aux',
      'ss -tulpn', 'ss -ant', 'ip a', 'ip route', 'netstat -tulpn', 'ping', 'traceroute',
      'cat', 'tail -f', 'tail -n', 'head -n', 'grep -rnw', 'grep -i', 'find / -name',
      'chmod +x', 'chmod 755', 'chmod 644', 'chown -R', 'mkdir -p', 'rm -rf', 'cp -r', 'mv',
      'tar -czvf', 'tar -xzvf', 'unzip', 'zip -r',
      'apt update', 'apt upgrade', 'apt install -y', 'dpkg -l',
      'ufw status', 'ufw allow', 'ufw reload',
      'whoami', 'uname -a', 'hostname -I', 'id', 'history', 'clear', 'reboot', 'shutdown now'
    ];

    const winDict = [
      'Get-Service', 'Start-Service', 'Stop-Service', 'Restart-Service', 'Set-Service',
      'Get-Process', 'Stop-Process', 'Start-Process',
      'Get-EventLog -LogName System', 'Get-EventLog -LogName Application',
      'Get-Content', 'Set-Content', 'Add-Content', 'Clear-Content',
      'Get-ChildItem', 'Remove-Item -Recurse', 'Copy-Item', 'Move-Item', 'New-Item', 'Test-Path',
      'Get-ComputerInfo', 'Get-NetIPAddress', 'Get-NetTCPConnection', 'Get-NetAdapter',
      'ipconfig /all', 'ipconfig /flushdns', 'ipconfig /release', 'ipconfig /renew',
      'ping', 'tracert', 'netstat -ano', 'systeminfo', 'tasklist', 'taskkill /F /PID',
      'sfc /scannow', 'dism /online /cleanup-image /restorehealth',
      'whoami', 'hostname', 'cls', 'clear', 'Restart-Computer', 'Stop-Computer'
    ];

    const dict = isWin ? winDict : linuxDict;

    if (!pane.tabMatches || pane.tabMatches.length === 0) {
      const trimmed = val.trim();
      if (!trimmed) return;

      const matches = dict.filter(item => item.toLowerCase().startsWith(trimmed.toLowerCase()));
      if (matches.length === 0) {
        const containsMatches = dict.filter(item => item.toLowerCase().includes(trimmed.toLowerCase()));
        if (containsMatches.length > 0) {
          pane.tabMatches = containsMatches;
          pane.tabIndex = 0;
          input.value = containsMatches[0];
        }
        return;
      }

      pane.tabMatches = matches;
      pane.tabIndex = 0;
      input.value = matches[0];
    } else {
      pane.tabIndex = (pane.tabIndex + 1) % pane.tabMatches.length;
      input.value = pane.tabMatches[pane.tabIndex];
    }

    input.setSelectionRange(input.value.length, input.value.length);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 4. Prominent Server Switcher & Per-Pane Node Handling
  // ═════════════════════════════════════════════════════════════════════════
  toggleServerSwitcherMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('termServerMenu');
    const btn = document.getElementById('termServerSwitcherBtn');
    if (!menu) return;

    const isShowing = menu.classList.contains('show');
    menu.classList.toggle('show', !isShowing);
    if (btn) btn.classList.toggle('active', !isShowing);

    if (!isShowing) {
      const input = document.getElementById('term-server-search-input');
      if (input) {
        input.value = '';
        this.filterServerSwitcherMenu('');
        setTimeout(() => input.focus(), 60);
      }
    }
  },

  filterServerSwitcherMenu(query) {
    const q = (query || '').toLowerCase();
    document.querySelectorAll('.term-server-select-item').forEach(item => {
      const hostname = (item.dataset.hostname || '').toLowerCase();
      const ip = (item.dataset.ip || '').toLowerCase();
      const pers = (item.dataset.personnel || '').toLowerCase();
      const match = hostname.includes(q) || ip.includes(q) || pers.includes(q);
      item.style.display = match ? 'flex' : 'none';
    });
  },

  populateServerSwitcherList() {
    const container = document.getElementById('termServerList');
    if (!container) return;

    const rawItems = document.querySelectorAll('#termNodeMenu .zk-select-item');
    let html = '';

    // 1. Localhost Entry
    const hostIsWin = this.hostOs === 'Windows';
    const hostLogo = hostIsWin ? '/static/img/windows.png' : '/static/img/pardus.png';
    html += `
      <div class="term-server-select-item" data-id="local" data-hostname="Yerel Host" data-ip="${this.hostIp || '127.0.0.1'}" data-os="${hostIsWin ? 'WINDOWS' : 'LINUX'}" data-personnel="Localhost" onclick="TerminalApp.switchActivePaneServer('local'); TerminalApp.toggleServerSwitcherMenu();">
        <div class="term-server-select-icon" style="width:34px;height:34px;border-radius:8px;background:var(--bg-surface);display:flex;align-items:center;justify-content:center;padding:4px;border:1px solid var(--border-default);flex-shrink:0;">
          <img src="${hostLogo}" style="width:100%;height:100%;object-fit:contain;" alt="OS">
        </div>
        <div style="flex:1; min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:13px;font-weight:700;color:var(--text-primary);">Yerel Host</span>
            <span class="badge ${hostIsWin ? 'blue' : 'green'}" style="font-size:9.5px;padding:1px 6px;font-weight:700;">${hostIsWin ? 'WIN' : 'PARDUS'}</span>
          </div>
          <div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);margin-top:2px;">${this.hostIp || '127.0.0.1'} &bull; Localhost</div>
        </div>
      </div>
    `;

    // 2. Registered Devices List
    rawItems.forEach(it => {
      const id = it.dataset.id;
      const hostname = it.dataset.hostname || 'Host';
      const ip = it.dataset.ip || '127.0.0.1';
      const os = it.dataset.os || 'LINUX';
      const pers = it.dataset.personnel || '';
      const isWin = os === 'WINDOWS';
      const logo = isWin ? '/static/img/windows.png' : '/static/img/pardus.png';

      html += `
        <div class="term-server-select-item" data-id="${id}" data-hostname="${hostname}" data-ip="${ip}" data-os="${os}" data-personnel="${pers}" onclick="TerminalApp.switchActivePaneServer('${id}'); TerminalApp.toggleServerSwitcherMenu();">
          <div class="term-server-select-icon" style="width:34px;height:34px;border-radius:8px;background:var(--bg-surface);display:flex;align-items:center;justify-content:center;padding:4px;border:1px solid var(--border-default);flex-shrink:0;">
            <img src="${logo}" style="width:100%;height:100%;object-fit:contain;" alt="OS">
          </div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:13px;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${hostname}</span>
              <span class="badge ${isWin ? 'blue' : 'green'}" style="font-size:9.5px;padding:1px 6px;font-weight:700;">${isWin ? 'WIN' : 'PARDUS'}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);margin-top:2px;">${ip}${pers ? ' &bull; Sicil: ' + pers : ''}</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  updateTopbarServerSwitcher(pane) {
    const titleEl = document.getElementById('term-active-server-title');
    const subEl = document.getElementById('term-active-server-sub');
    const iconEl = document.getElementById('term-active-server-icon');
    if (!titleEl || !pane) return;

    const isWin = pane.targetOs === 'WINDOWS';
    const logo = isWin ? '/static/img/windows.png' : '/static/img/pardus.png';

    if (pane.nodeId === 'local') {
      titleEl.textContent = 'Yerel Host';
      if (subEl) subEl.textContent = `${this.hostIp || '127.0.0.1'} • Localhost`;
    } else {
      const devItem = document.querySelector(`#termNodeMenu .zk-select-item[data-id="${pane.nodeId}"]`);
      if (devItem) {
        titleEl.textContent = devItem.dataset.hostname;
        if (subEl) subEl.textContent = `${devItem.dataset.ip} • ${devItem.dataset.personnel ? 'Sicil: ' + devItem.dataset.personnel : devItem.dataset.os}`;
      }
    }

    if (iconEl) {
      iconEl.innerHTML = `<img src="${logo}" style="width:100%;height:100%;object-fit:contain;" alt="OS">`;
    }
  },

  switchActivePaneServer(nodeId) {
    if (this.activePaneId) {
      this.switchPaneNode(this.activePaneId, nodeId);
    }
  },

  async switchPaneNode(paneId, nodeId) {
    const pane = this.panes[paneId];
    if (!pane) return;

    if (nodeId === 'local') {
      if (pane.mode === 'remote') {
        this.appendOutputLine(paneId, 'logout');
        this.appendOutputLine(paneId, `Connection to remote host closed.`);
      }
      pane.nodeId = 'local';
      pane.mode = 'local';
      pane.targetOs = this.hostOs === 'Windows' ? 'WINDOWS' : 'LINUX';
      pane.currentCwd = this.hostOs === 'Windows' ? 'C:\\Users\\Operator' : '/home/operator';
      this.updatePaneHeader(pane, 'Yerel Host', this.hostIp, pane.targetOs, '/static/img/' + (pane.targetOs === 'WINDOWS' ? 'windows.png' : 'pardus.png'), 'BAĞLI (ONLINE)', 0);
      this.updatePanePrompt(pane);
      this.renderTabs();
      this.updateTopbarServerSwitcher(pane);
      this.renderQuickChips(pane.targetOs);
      return;
    }

    const devItem = document.querySelector(`#termNodeMenu .zk-select-item[data-id="${nodeId}"]`);
    let hostname = 'Uzak Sunucu';
    let ip = '';
    let os = 'LINUX';
    let user = 'root';

    if (devItem) {
      hostname = devItem.dataset.hostname || hostname;
      ip = devItem.dataset.ip || '';
      os = devItem.dataset.os || 'LINUX';
      user = devItem.dataset.username || 'root';
    }

    // Realistic SSH Terminal Command Echo & Handshake Sequence
    const sshCmd = `ssh ${user}@${ip}`;
    this.appendOutputLine(paneId, `${pane.promptEl.textContent} ${sshCmd}`, 'prompt');
    this.appendOutputLine(paneId, `Connecting to ${ip}...`);
    this.appendOutputLine(paneId, `Authenticating user '${user}'...`);

    this.updatePaneHeader(pane, hostname, ip, os, '/static/img/' + (os === 'WINDOWS' ? 'windows.png' : 'pardus.png'), 'BAĞLANILIYOR...');

    try {
      const startTime = performance.now();
      const res = await API.post(`/api/devices/${nodeId}/connect/`);
      const latency = Math.round(performance.now() - startTime);

      if (res.success) {
        pane.nodeId = nodeId;
        pane.mode = 'remote';
        pane.targetOs = os;
        pane.currentCwd = os === 'WINDOWS' ? 'C:\\Users\\' + user : '/home/' + user;
        
        this.appendOutputLine(paneId, `[✓] Authentication succeeded. Connected to ${hostname} (${ip})`);
        this.appendOutputLine(paneId, `Welcome to ${hostname} • OS: ${os === 'WINDOWS' ? 'Windows PowerShell' : 'Pardus GNU/Linux'} • Session: Active`);
        
        this.updatePaneHeader(pane, hostname, ip, os, '/static/img/' + (os === 'WINDOWS' ? 'windows.png' : 'pardus.png'), 'BAĞLI (ONLINE)', latency);
        Toast.success(`'${hostname}' (${ip}) SSH oturumu açıldı.`);
      } else {
        this.appendOutputLine(paneId, `ssh: connect to host ${ip}: Connection timed out / Connection refused.`, 'stderr');
        this.appendOutputLine(paneId, `Connection to ${ip} closed.`);
        pane.mode = 'local';
        this.updatePaneHeader(pane, hostname, ip, os, '/static/img/' + (os === 'WINDOWS' ? 'windows.png' : 'pardus.png'), 'HATA (OFFLINE)');
        Toast.error(`Düğüm bağlantısı başarısız: ${res.message || 'Bağlantı kurulamadı'}`);
      }
    } catch (e) {
      this.appendOutputLine(paneId, `ssh: connect to host ${ip}: Network is unreachable.`, 'stderr');
      this.appendOutputLine(paneId, `Connection to ${ip} closed.`);
      pane.mode = 'local';
      this.updatePaneHeader(pane, hostname, ip, os, '/static/img/' + (os === 'WINDOWS' ? 'windows.png' : 'pardus.png'), 'HATA (OFFLINE)');
    }

    this.updatePanePrompt(pane);
    this.renderTabs();
    this.updateTopbarServerSwitcher(pane);
    this.renderQuickChips(pane.targetOs);
    this.scrollPaneToBottom(paneId);
  },

  updatePaneHeader(pane, hostname, ip, os, logoUrl, statusText = 'BAĞLI (ONLINE)', latency = 12) {
    if (pane.titleEl) {
      pane.titleEl.innerHTML = `
        <img src="${logoUrl}" style="width:14px;height:14px;object-fit:contain;" alt="OS">
        <span>${hostname} (${ip})</span>
      `;
    }
    if (pane.badgeEl) {
      pane.badgeEl.textContent = statusText;
      pane.badgeEl.className = `term-pane-badge ${statusText.includes('ONLINE') ? 'badge-online' : statusText.includes('BAĞLAN') ? 'badge-warning' : 'badge-offline'}`;
    }
    if (pane.latencyEl) {
      pane.latencyEl.innerHTML = `<i data-lucide="zap" style="width:10px;height:10px;"></i> ${latency}ms`;
      if (window.lucide) window.lucide.createIcons();
    }
  },

  updatePanePrompt(pane) {
    if (!pane.promptEl) return;
    const isWin = pane.targetOs === 'WINDOWS';
    if (pane.mode === 'local') {
      pane.promptEl.className = `term-active-prompt ${isWin ? 'term-prompt-windows' : 'term-prompt-linux'}`;
      pane.promptEl.textContent = isWin ? `PS ${pane.currentCwd}>` : `operator@localhost:${pane.currentCwd}$`;
    } else {
      const devItem = document.querySelector(`#termNodeMenu .zk-select-item[data-id="${pane.nodeId}"]`);
      const hostname = devItem ? devItem.dataset.hostname : 'node';
      const user = devItem ? (devItem.dataset.username || 'root') : 'root';
      pane.promptEl.className = `term-active-prompt ${isWin ? 'term-prompt-windows' : 'term-prompt-linux'}`;
      pane.promptEl.textContent = isWin ? `PS ${pane.currentCwd}>` : `${user}@${hostname}:${pane.currentCwd}#`;
    }
  },

  async submitPaneCommand(paneId, cmd) {
    const pane = this.panes[paneId];
    if (!pane) return;

    const trimmed = cmd.trim();
    if (!trimmed) return;

    pane.cmdHistory.push(trimmed);
    pane.historyIndex = -1;
    pane.input.value = '';

    // Record Event for SIEM Session Replay
    if (this.isRecording) {
      this.recordEvent({
        time: Date.now() - this.recordStartTime,
        paneId: pane.id,
        nodeId: pane.nodeId,
        type: 'command',
        command: trimmed,
        cwd: pane.currentCwd
      });
    }

    // Handle Local clear / cls
    if (trimmed === 'clear' || trimmed === 'cls') {
      this.clearPaneScreen(paneId);
      return;
    }

    // Handle exit / logout command
    if (trimmed === 'exit' || trimmed === 'logout') {
      this.appendOutputLine(paneId, `${pane.promptEl.textContent} ${trimmed}`, 'prompt');
      if (pane.mode === 'remote') {
        this.switchPaneNode(paneId, 'local');
      } else {
        this.closeTerminal(paneId);
      }
      return;
    }

    // Handle manual "ssh user@ip" or "ssh ip" command
    if (trimmed.startsWith('ssh ') || trimmed === 'ssh') {
      this.appendOutputLine(paneId, `${pane.promptEl.textContent} ${trimmed}`, 'prompt');
      const parts = trimmed.split(' ').filter(Boolean);
      if (parts.length < 2) {
        this.appendOutputLine(paneId, 'usage: ssh [user@]hostname', 'stderr');
        return;
      }

      const target = parts[1];
      let targetUser = 'root';
      let targetHost = target;
      if (target.includes('@')) {
        const up = target.split('@');
        targetUser = up[0];
        targetHost = up[1];
      }

      let matchedId = null;
      document.querySelectorAll('#termNodeMenu .zk-select-item').forEach(it => {
        if (it.dataset.ip === targetHost || (it.dataset.hostname && it.dataset.hostname.toLowerCase() === targetHost.toLowerCase())) {
          matchedId = it.dataset.id;
        }
      });

      if (matchedId) {
        this.switchPaneNode(paneId, matchedId);
      } else {
        this.appendOutputLine(paneId, `Connecting to ${targetHost}...`);
        this.appendOutputLine(paneId, `ssh: Could not resolve hostname ${targetHost}: Name or service not known.`, 'stderr');
      }
      return;
    }

    // Echo normal command into terminal pane
    this.appendOutputLine(paneId, `${pane.promptEl.textContent} ${trimmed}`, 'prompt');

    try {
      let endpoint = '';
      let payload = {};

      if (pane.mode === 'local') {
        endpoint = '/api/devices/terminal/execute/';
        payload = { command: trimmed, cwd: pane.currentCwd, target: 'local' };
      } else {
        endpoint = `/api/devices/${pane.nodeId}/execute/`;
        payload = { command: trimmed, cwd: pane.currentCwd };
      }

      const res = await API.post(endpoint, payload);

      if (res.new_cwd || res.cwd) {
        pane.currentCwd = res.new_cwd || res.cwd;
        this.updatePanePrompt(pane);
      }

      if (res.stdout) {
        this.appendOutputLine(paneId, res.stdout, 'stdout');
      } else if (res.output && !res.stderr && res.success !== false) {
        this.appendOutputLine(paneId, res.output, 'stdout');
      }

      if (res.stderr) {
        this.appendOutputLine(paneId, res.stderr, 'stderr');
      } else if (res.output && res.success === false) {
        this.appendOutputLine(paneId, res.output, 'stderr');
      }

      if (!res.stdout && !res.stderr && !res.output && res.error) {
        this.appendOutputLine(paneId, res.error, 'stderr');
      }
    } catch (err) {
      this.appendOutputLine(paneId, `İletişim Hatası: ${err.message}`, 'stderr');
    }

    this.scrollPaneToBottom(paneId);
  },

  appendOutputLine(paneId, text, type = 'stdout') {
    const pane = this.panes[paneId];
    if (!pane || !pane.historyEl) return;

    const line = document.createElement('div');
    if (type === 'prompt') {
      line.className = `term-prompt-line ${pane.targetOs === 'WINDOWS' ? 'term-prompt-windows' : 'term-prompt-linux'}`;
      line.textContent = text;
    } else if (type === 'stderr') {
      line.className = 'term-stdout-block';
      line.style.color = '#EF4444';
      line.textContent = text;
    } else {
      line.className = 'term-stdout-block';
      line.textContent = text;
    }

    // Apply current font size
    line.style.fontSize = `${this.fontSize}px`;

    pane.historyEl.appendChild(line);
    this.scrollPaneToBottom(paneId);
  },

  clearPaneScreen(paneId) {
    const pane = this.panes[paneId];
    if (pane && pane.historyEl) {
      pane.historyEl.innerHTML = '';
    }
  },

  scrollPaneToBottom(paneId) {
    const pane = this.panes[paneId];
    if (pane && pane.body) {
      pane.body.scrollTop = pane.body.scrollHeight;
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 5. OS-Aware Fast Chips Bar
  // ═════════════════════════════════════════════════════════════════════════
  renderQuickChips(targetOs = 'LINUX') {
    const container = document.getElementById('termChipsList');
    if (!container) return;

    const isWin = targetOs === 'WINDOWS';

    const linuxChips = [
      { label: 'uptime', cmd: 'uptime' },
      { label: 'free -m', cmd: 'free -m' },
      { label: 'df -h', cmd: 'df -h' },
      { label: 'ss -tulpn', cmd: 'ss -tulpn' },
      { label: 'ip a', cmd: 'ip a' },
      { label: 'systemctl status nginx', cmd: 'systemctl status nginx' },
      { label: 'journalctl -xe -n 20', cmd: 'journalctl -xe -n 20' },
      { label: 'docker ps', cmd: 'docker ps' },
      { label: 'top (özet)', cmd: 'top -b -n 1 | head -n 12' }
    ];

    const winChips = [
      { label: 'Get-Service', cmd: 'Get-Service | Select -First 15' },
      { label: 'Get-Process (Top RAM)', cmd: 'Get-Process | Sort WorkingSet64 -Desc | Select -First 8' },
      { label: 'ipconfig /all', cmd: 'ipconfig /all' },
      { label: 'systeminfo', cmd: 'systeminfo' },
      { label: 'Get-EventLog (Hatalar)', cmd: 'Get-EventLog -LogName System -EntryType Error -Newest 5' },
      { label: 'netstat -ano', cmd: 'netstat -ano | Select -First 15' },
      { label: 'tasklist', cmd: 'tasklist | Select -First 15' },
      { label: 'Get-ComputerInfo', cmd: 'Get-ComputerInfo | Select WindowsProductName, OsVersion' }
    ];

    const chips = isWin ? winChips : linuxChips;

    container.style.opacity = '0';
    container.style.transform = 'translateY(4px)';

    setTimeout(() => {
      let html = '';
      chips.forEach(c => {
        html += `<button type="button" class="term-chip" onclick="TerminalApp.runChipCommand('${c.cmd.replace(/'/g, "\\'")}')">${c.label}</button>`;
      });
      container.innerHTML = html;
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
    }, 120);
  },

  runChipCommand(cmd) {
    if (this.activePaneId) {
      this.submitPaneCommand(this.activePaneId, cmd);
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 6. Multi-Exec Broadcast Terminal
  // ═════════════════════════════════════════════════════════════════════════
  openBroadcastModal() {
    this.populateBroadcastTargets();
    if (window.Modal) Modal.open('broadcast-terminal-modal');
  },

  populateBroadcastTargets() {
    const listEl = document.getElementById('broadcast-targets-list');
    if (!listEl) return;

    const rawItems = document.querySelectorAll('#termNodeMenu .zk-select-item');
    let html = '';

    rawItems.forEach(it => {
      const id = it.dataset.id;
      const hostname = it.dataset.hostname || 'Host';
      const ip = it.dataset.ip || '127.0.0.1';
      const os = it.dataset.os || 'LINUX';
      const isWin = os === 'WINDOWS';
      const logo = isWin ? '/static/img/windows.png' : '/static/img/pardus.png';

      html += `
        <label class="broadcast-target-card">
          <input type="checkbox" name="broadcast_node" value="${id}" checked style="accent-color: var(--zk-red, #E30613); width: 16px; height: 16px; cursor: pointer;">
          <img src="${logo}" style="width: 16px; height: 16px; object-fit: contain;" alt="OS">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${hostname}</div>
            <div style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono);">${ip} &bull; ${os}</div>
          </div>
        </label>
      `;
    });

    listEl.innerHTML = html;
  },

  toggleBroadcastCheckAll() {
    const cbs = document.querySelectorAll('input[name="broadcast_node"]');
    if (!cbs.length) return;
    const allChecked = Array.from(cbs).every(c => c.checked);
    cbs.forEach(c => c.checked = !allChecked);
  },

  async executeBroadcast(e) {
    e.preventDefault();
    const cmdInput = document.getElementById('broadcast-cmd-input');
    const cmd = cmdInput ? cmdInput.value.trim() : '';
    if (!cmd) return;

    const selectedNodes = Array.from(document.querySelectorAll('input[name="broadcast_node"]:checked')).map(c => c.value);
    if (selectedNodes.length === 0) {
      Toast.warning('Lütfen komut gönderilecek en az bir sunucu seçin.');
      return;
    }

    const matrixEl = document.getElementById('broadcast-results-matrix');
    const submitBtn = document.getElementById('broadcast-submit-btn');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width:14px;height:14px;"></i> Yayın Yapılıyor...';
      if (window.lucide) window.lucide.createIcons();
    }

    matrixEl.innerHTML = `
      <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Toplu Yayın Sonuçları (${selectedNodes.length} Düğüm):</div>
      <div class="broadcast-grid" id="broadcast-matrix-grid"></div>
    `;

    const grid = document.getElementById('broadcast-matrix-grid');

    const execPromises = selectedNodes.map(async (nodeId) => {
      const devItem = document.querySelector(`#termNodeMenu .zk-select-item[data-id="${nodeId}"]`);
      const hostname = devItem ? devItem.dataset.hostname : 'Yerel Host';
      const ip = devItem ? devItem.dataset.ip : this.hostIp;
      const os = devItem ? devItem.dataset.os : this.hostOs;
      const isWin = os === 'WINDOWS';
      const logo = isWin ? '/static/img/windows.png' : '/static/img/pardus.png';

      const card = document.createElement('div');
      card.className = 'broadcast-result-card';
      card.innerHTML = `
        <div class="broadcast-result-header">
          <div style="display:flex;align-items:center;gap:6px;">
            <img src="${logo}" style="width:14px;height:14px;object-fit:contain;" alt="OS">
            <span style="font-size:11.5px;font-weight:700;">${hostname} (${ip})</span>
          </div>
          <span class="badge blue" style="font-size:9px;">Çalıştırılıyor...</span>
        </div>
        <pre class="broadcast-result-output">Komut gönderildi...</pre>
      `;
      grid.appendChild(card);

      try {
        let endpoint = nodeId === 'local' ? '/api/devices/terminal/exec/' : `/api/devices/${nodeId}/terminal/exec/`;
        const res = await API.post(endpoint, { command: cmd });
        const badge = card.querySelector('.badge');
        const pre = card.querySelector('pre');

        if (res.success || res.stdout) {
          card.classList.add('success');
          if (badge) { badge.className = 'badge green'; badge.textContent = 'BAŞARILI'; }
          if (pre) pre.textContent = res.stdout || '(Boş çıktı döndü)';
        } else {
          card.classList.add('error');
          if (badge) { badge.className = 'badge red'; badge.textContent = 'HATA'; }
          if (pre) pre.textContent = res.stderr || res.error || 'Bilinmeyen hata';
        }
      } catch (err) {
        card.classList.add('error');
        const badge = card.querySelector('.badge');
        const pre = card.querySelector('pre');
        if (badge) { badge.className = 'badge red'; badge.textContent = 'BAĞLANTI HATASI'; }
        if (pre) pre.textContent = err.message;
      }
    });

    await Promise.all(execPromises);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i data-lucide="send" style="width: 14px; height: 14px;"></i> <span>Toplu Yayını Başlat</span>';
      if (window.lucide) window.lucide.createIcons();
    }

    Toast.success(`${selectedNodes.length} sunucuya komut eşzamanlı iletildi.`);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 7. Snippets Drawer
  // ═════════════════════════════════════════════════════════════════════════
  // 7. Snippets Drawer (OS-Aware for Windows / Linux)
  // ═════════════════════════════════════════════════════════════════════════
  toggleSnippetDrawer() {
    const drawer = document.getElementById('term-snippet-drawer');
    if (!drawer) return;
    const isShowing = drawer.classList.toggle('show');
    if (isShowing) {
      this.updateSnippetCategoriesForActivePane();
      this.renderSnippetsList('all');
    }
  },

  updateSnippetCategoriesForActivePane() {
    const pane = this.panes[this.activePaneId];
    const isWin = pane ? (pane.targetOs === 'WINDOWS') : (this.hostOs === 'WINDOWS');
    const catContainer = document.getElementById('snippet-cat-buttons');
    const titleEl = document.getElementById('snippet-drawer-title');

    if (titleEl) {
      titleEl.innerHTML = isWin 
        ? '<span style="color:#38BDF8;">🪟 Windows PowerShell</span> Snippet\'ları'
        : '<span style="color:#10B981;">🐧 Pardus / Linux</span> Snippet\'ları';
    }

    if (!catContainer) return;

    if (isWin) {
      catContainer.innerHTML = `
        <button type="button" class="snippet-cat-btn active" data-cat="all" onclick="TerminalApp.filterSnippets('all')">Tüm Windows</button>
        <button type="button" class="snippet-cat-btn" data-cat="system" onclick="TerminalApp.filterSnippets('system')">Sistem</button>
        <button type="button" class="snippet-cat-btn" data-cat="network" onclick="TerminalApp.filterSnippets('network')">Ağ & Portlar</button>
        <button type="button" class="snippet-cat-btn" data-cat="services" onclick="TerminalApp.filterSnippets('services')">Servisler</button>
        <button type="button" class="snippet-cat-btn" data-cat="security" onclick="TerminalApp.filterSnippets('security')">Güvenlik</button>
        <button type="button" class="snippet-cat-btn" data-cat="files" onclick="TerminalApp.filterSnippets('files')">Dosya & Disk</button>
      `;
    } else {
      catContainer.innerHTML = `
        <button type="button" class="snippet-cat-btn active" data-cat="all" onclick="TerminalApp.filterSnippets('all')">Tüm Linux</button>
        <button type="button" class="snippet-cat-btn" data-cat="system" onclick="TerminalApp.filterSnippets('system')">Sistem</button>
        <button type="button" class="snippet-cat-btn" data-cat="network" onclick="TerminalApp.filterSnippets('network')">Ağ & Güvenlik</button>
        <button type="button" class="snippet-cat-btn" data-cat="services" onclick="TerminalApp.filterSnippets('services')">Servisler</button>
        <button type="button" class="snippet-cat-btn" data-cat="security" onclick="TerminalApp.filterSnippets('security')">Loglar</button>
        <button type="button" class="snippet-cat-btn" data-cat="files" onclick="TerminalApp.filterSnippets('files')">Dosya & İzinler</button>
      `;
    }
  },

  filterSnippets(category) {
    document.querySelectorAll('.snippet-cat-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === category);
    });
    this.renderSnippetsList(category);
  },

  renderSnippetsList(category = 'all') {
    const listEl = document.getElementById('snippet-drawer-list');
    if (!listEl) return;

    const pane = this.panes[this.activePaneId];
    const isWin = pane ? (pane.targetOs === 'WINDOWS') : (this.hostOs === 'WINDOWS');
    const targetOs = isWin ? 'windows' : 'linux';

    const filtered = this.snippets.filter(s => s.os === targetOs && (category === 'all' || s.cat === category));
    let html = '';

    filtered.forEach(s => {
      html += `
        <div class="snippet-card" onclick="TerminalApp.runSnippetCommand('${s.cmd.replace(/'/g, "\\'")}')" title="Çalıştırmak için tıklayın">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
            <strong style="font-size:12.5px;font-weight:700;color:var(--text-primary);">${s.title}</strong>
            <span class="badge ${s.os === 'windows' ? 'blue' : 'green'}" style="font-size:8.5px;padding:1px 5px;font-weight:700;">${s.os.toUpperCase()}</span>
          </div>
          <div class="snippet-cmd-preview">${s.cmd}</div>
        </div>
      `;
    });

    if (filtered.length === 0) {
      html = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 12px;">Bu kategoride komut bulunamadı.</div>`;
    }

    listEl.innerHTML = html;
  },

  runSnippetCommand(cmd) {
    if (this.activePaneId) {
      const pane = this.panes[this.activePaneId];
      if (pane && pane.input) {
        pane.input.value = cmd;
        pane.input.focus();
      }
      this.toggleSnippetDrawer();
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 8. SIEM Session Recording & Replay
  // ═════════════════════════════════════════════════════════════════════════
  toggleSessionRecording() {
    const btn = document.getElementById('termRecBtn');
    const indicator = document.getElementById('term-rec-indicator');

    if (!this.isRecording) {
      this.isRecording = true;
      this.recordStartTime = Date.now();
      this.recordedEvents = [];

      if (btn) {
        btn.classList.add('recording');
        btn.querySelector('span').textContent = 'Kaydı Durdur';
      }
      if (indicator) indicator.style.display = 'flex';

      this.recTimerInterval = setInterval(() => {
        const sec = Math.floor((Date.now() - this.recordStartTime) / 1000);
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        const tEl = document.getElementById('recTimerText');
        if (tEl) tEl.textContent = `REC ${m}:${s}`;
      }, 1000);

      Toast.info('SIEM Terminal Oturum Kaydı Başlatıldı');
    } else {
      this.isRecording = false;
      if (this.recTimerInterval) clearInterval(this.recTimerInterval);

      if (btn) {
        btn.classList.remove('recording');
        btn.querySelector('span').textContent = 'Kayıt';
      }
      if (indicator) indicator.style.display = 'none';

      Toast.success(`Kayıt tamamlandı. (${this.recordedEvents.length} komut ve etkileşim kaydedildi)`);
      this.openSessionReplayModal();
    }
  },

  recordEvent(eventObj) {
    this.recordedEvents.push(eventObj);
  },

  openSessionReplayModal() {
    this.replayIdx = 0;
    const screen = document.getElementById('replay-screen');
    const bar = document.getElementById('replay-progress-bar');
    if (screen) screen.innerHTML = '<div style="color:#64748B;">Oynatmak için "Başlat" butonuna basın...</div>';
    if (bar) bar.style.width = '0%';

    if (window.Modal) Modal.open('session-replay-modal');
  },

  resetSessionReplay() {
    if (this.replayInterval) clearInterval(this.replayInterval);
    this.replayIdx = 0;
    const screen = document.getElementById('replay-screen');
    const bar = document.getElementById('replay-progress-bar');
    const playBtn = document.getElementById('replayPlayBtn');

    if (screen) screen.innerHTML = '';
    if (bar) bar.style.width = '0%';
    if (playBtn) playBtn.innerHTML = '<i data-lucide="play" style="width:14px;height:14px;"></i> Başlat';
    if (window.lucide) window.lucide.createIcons();
  },

  playSessionReplay() {
    const screen = document.getElementById('replay-screen');
    const playBtn = document.getElementById('replayPlayBtn');

    if (this.recordedEvents.length === 0) {
      Toast.warning('Oynatılacak oturum kaydı bulunamadı.');
      return;
    }

    if (!this.replayInterval) {
      if (playBtn) playBtn.innerHTML = '<i data-lucide="pause" style="width:14px;height:14px;"></i> Duraklat';
      if (window.lucide) window.lucide.createIcons();

      this.replayInterval = setInterval(() => {
        if (this.replayIdx >= this.recordedEvents.length) {
          clearInterval(this.replayInterval);
          this.replayInterval = null;
          if (playBtn) playBtn.innerHTML = '<i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> Tekrar Oynat';
          if (window.lucide) window.lucide.createIcons();
          Toast.info('Oturum oynatımı tamamlandı.');
          return;
        }

        const ev = this.recordedEvents[this.replayIdx];
        if (screen) {
          const line = document.createElement('div');
          line.style.marginBottom = '4px';
          line.innerHTML = `
            <span style="color:#64748B;font-size:10px;">[+${(ev.time / 1000).toFixed(1)}s]</span>
            <span style="color:#38BDF8;font-weight:700;">${ev.cwd || '/'} $</span>
            <span style="color:#F8FAFC;">${ev.command}</span>
          `;
          screen.appendChild(line);
          screen.scrollTop = screen.scrollHeight;
        }

        this.replayIdx++;
        const bar = document.getElementById('replay-progress-bar');
        if (bar) {
          const pct = Math.round((this.replayIdx / this.recordedEvents.length) * 100);
          bar.style.width = `${pct}%`;
        }
      }, 500 / this.replaySpeed);
    } else {
      if (this.replayInterval) clearInterval(this.replayInterval);
      this.replayInterval = null;
      if (playBtn) playBtn.innerHTML = '<i data-lucide="play" style="width:14px;height:14px;"></i> Devam Et';
      if (window.lucide) window.lucide.createIcons();
    }
  },

  exportSessionJSON() {
    if (this.recordedEvents.length === 0) {
      Toast.error('Dışa aktarılacak kayıt bulunmuyor.');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.recordedEvents, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `ZK_SIEM_Session_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    Toast.success('Oturum JSON denetim kaydı indirildi.');
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 9. Themes & Font Controls
  // ═════════════════════════════════════════════════════════════════════════
  openThemeModal() {
    if (window.Modal) Modal.open('terminal-theme-modal');
  },

  setTheme(themeName, save = true) {
    this.currentTheme = themeName;
    const container = document.getElementById('terminalContainer');
    if (!container) return;

    container.className = container.className.replace(/term-theme-\w+/g, '').trim();
    container.classList.add(`term-theme-${themeName}`);

    if (save) {
      try { localStorage.setItem('zk_term_theme', themeName); } catch (e) {}
      Toast.info(`Terminal Teması: ${themeName.toUpperCase()}`);
    }
  },

  setFontFamily(fontName, save = true) {
    this.currentFont = fontName;
    const container = document.getElementById('terminalContainer');
    if (!container) return;

    container.style.fontFamily = `'${fontName}', Consolas, monospace`;

    if (save) {
      try { localStorage.setItem('zk_term_font', fontName); } catch (e) {}
      Toast.info(`Font: ${fontName}`);
    }
  },

  adjustFontSize(delta) {
    this.fontSize = Math.max(9, Math.min(30, this.fontSize + delta));
    const container = document.getElementById('terminalContainer');
    if (container) {
      container.style.fontSize = `${this.fontSize}px`;
    }
    document.querySelectorAll('.term-body, .term-input, .term-stdout-block, .term-active-prompt, .term-prompt-line').forEach(el => {
      el.style.fontSize = `${this.fontSize}px`;
    });
    try { localStorage.setItem('zk_term_fontsize', this.fontSize); } catch (e) {}
    Toast.info(`Yazı Boyutu: ${this.fontSize}px`);
  },

  toggleFullscreen() {
    const container = document.getElementById('terminalContainer');
    if (!container) return;
    const isFull = container.classList.contains('fullscreen');
    if (!isFull) {
      container.classList.add('fullscreen');
      Toast.info('Tam Ekran Modu Açıldı (Çıkmak için tekrar basın)');
    } else {
      container.classList.remove('fullscreen');
      Toast.info('Normal Görünüme Dönüldü');
    }
  }
};

window.TerminalApp = TerminalApp;
