// Ziraat Katılım — Remote Operations Center Enterprise UI Engine
// Theme Toggle + Collapsible Tree Sidebar + Glassmorphism Micro-interactions

document.addEventListener("DOMContentLoaded", function () {
  var topbarToggleBtn = document.getElementById("sidebarToggleBtn");
  var globalPortal = document.getElementById("globalMiniFlyoutPortal");
  var searchInput = document.getElementById("topbarGlobalSearch");
  var searchDropdown = document.getElementById("globalSearchDropdown");

  // =========================================================================
  // 1. Sidebar State from LocalStorage
  // =========================================================================
  try {
    var savedState = localStorage.getItem("zk_sidebar_collapsed");
    if (savedState === "true") {
      document.body.classList.add("sidebar-collapsed");
      document.documentElement.classList.add("sidebar-collapsed");
    } else if (savedState === "false") {
      document.body.classList.remove("sidebar-collapsed");
      document.documentElement.classList.remove("sidebar-collapsed");
    }
  } catch (e) { }

  // =========================================================================
  // 2. Sidebar Collapse/Expand Toggle
  // =========================================================================
  function toggleSidebarRail() {
    var isCollapsed = document.body.classList.toggle("sidebar-collapsed");
    document.documentElement.classList.toggle("sidebar-collapsed", isCollapsed);
    if (globalPortal) hideGlobalPortal();
    try {
      localStorage.setItem("zk_sidebar_collapsed", isCollapsed ? "true" : "false");
    } catch (e) { }
  }

  if (topbarToggleBtn) {
    topbarToggleBtn.addEventListener("click", toggleSidebarRail);
  }

  // In-menu filter search
  var menuFilterInput = document.getElementById("sidebarMenuFilter");
  if (menuFilterInput) {
    menuFilterInput.addEventListener("input", function (e) {
      var q = e.target.value.toLowerCase().trim();
      var singleItems = document.querySelectorAll(".tree-single-wrap");
      var groups = document.querySelectorAll(".tree-group");

      if (!q) {
        singleItems.forEach(function (el) { el.style.display = ""; });
        groups.forEach(function (el) {
          el.style.display = "";
          el.querySelectorAll(".tree-sub-item").forEach(function (sub) { sub.style.display = ""; });
        });
        return;
      }

      singleItems.forEach(function (el) {
        var text = el.textContent.toLowerCase();
        el.style.display = text.includes(q) ? "" : "none";
      });

      groups.forEach(function (group) {
        var subItems = group.querySelectorAll(".tree-sub-item");
        var groupHeader = group.querySelector(".tree-group-header");
        var headerText = groupHeader ? groupHeader.textContent.toLowerCase() : "";
        var matchCount = 0;

        subItems.forEach(function (sub) {
          var subText = sub.textContent.toLowerCase();
          if (subText.includes(q) || headerText.includes(q)) {
            sub.style.display = "";
            matchCount++;
          } else {
            sub.style.display = "none";
          }
        });

        if (matchCount > 0 || headerText.includes(q)) {
          group.style.display = "";
          group.classList.add("open");
        } else {
          group.style.display = "none";
        }
      });
    });
  }

  // =========================================================================
  // 3. User Dropdown Menu & Theme Toggle
  // =========================================================================
  var userDropdownTrigger = document.getElementById("userDropdownTrigger");
  var userDropdownMenu = document.getElementById("userDropdownMenu");
  var dropdownThemeToggle = document.getElementById("dropdownThemeToggle");

  if (userDropdownTrigger && userDropdownMenu) {
    userDropdownTrigger.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = userDropdownMenu.classList.toggle("show");
      userDropdownTrigger.classList.toggle("active", isOpen);
    });

    document.addEventListener("click", function (e) {
      if (!userDropdownMenu.contains(e.target) && !userDropdownTrigger.contains(e.target)) {
        userDropdownMenu.classList.remove("show");
        userDropdownTrigger.classList.remove("active");
      }
    });
  }

  function getCurrentTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  var transitionTimeout = null;

  function setTheme(theme, animate) {
    if (animate) {
      if (transitionTimeout) clearTimeout(transitionTimeout);
      document.documentElement.classList.add("theme-transitioning");
    }

    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("zk_theme", theme); } catch (e) { }

    // Update dropdown theme icon & label
    var themeIconSlot = document.getElementById("themeIconSlot");
    var themeLabelText = document.getElementById("themeLabelText");
    var miniThemeSwitch = document.getElementById("miniThemeSwitch");

    if (miniThemeSwitch) {
      miniThemeSwitch.classList.toggle("active", theme === "light");
    }

    if (themeIconSlot) {
      if (theme === "dark") {
        themeIconSlot.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        if (themeLabelText) themeLabelText.textContent = "Koyu Tema";
      } else {
        themeIconSlot.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
        if (themeLabelText) themeLabelText.textContent = "Açık Tema";
      }
    }

    // Update sidebar theme label
    var sidebarThemeLabel = document.getElementById("sidebarThemeLabel");
    if (sidebarThemeLabel) {
      sidebarThemeLabel.textContent = theme === "dark" ? "Koyu Mod" : "Açık Mod";
    }

    // Inform backend if logged in
    try {
      var csrfMeta = document.querySelector('meta[name="csrf-token"]');
      var csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : null;
      if (csrfToken && csrfToken.length >= 32) {
        fetch('/set-theme/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
          },
          body: JSON.stringify({ theme: theme })
        }).catch(function() {});
      }
    } catch(e) {}

    window.dispatchEvent(new Event("themeChanged"));

    if (animate) {
      transitionTimeout = setTimeout(function () {
        document.documentElement.classList.remove("theme-transitioning");
      }, 400);
    }
  }

  function toggleThemeWithWave(e, targetTheme) {
    var current = getCurrentTheme();
    var next = targetTheme || (current === "dark" ? "light" : "dark");

    // Check if View Transition API with circular clip-path is supported
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(next, true);
      return;
    }

    var x = (e && typeof e.clientX === 'number') ? e.clientX : (window.innerWidth - 120);
    var y = (e && typeof e.clientY === 'number') ? e.clientY : 30;
    
    // Calculate max radius to furthest corner with +25% margin to guarantee full screen coverage well before animation finish
    var maxDist = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    var endRadius = Math.ceil(maxDist * 1.25);

    // Clean up any lingering transition classes before screenshot
    if (transitionTimeout) clearTimeout(transitionTimeout);
    document.documentElement.classList.remove("theme-transitioning");

    var transition = document.startViewTransition(function () {
      setTheme(next, false);
    });

    transition.ready.then(function () {
      document.documentElement.animate(
        {
          clipPath: [
            "circle(0px at " + x + "px " + y + "px)",
            "circle(" + endRadius + "px at " + x + "px " + y + "px)"
          ]
        },
        {
          duration: 620,
          easing: "cubic-bezier(0.2, 0.9, 0.3, 1)",
          pseudoElement: "::view-transition-new(root)",
          fill: "forwards"
        }
      );
    });
  }

  if (dropdownThemeToggle) {
    dropdownThemeToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleThemeWithWave(e);
    });
  }

  var sidebarThemeSwitch = document.getElementById("sidebarThemeSwitch");
  if (sidebarThemeSwitch) {
    sidebarThemeSwitch.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleThemeWithWave(e);
    });
  }

  window.setTheme = setTheme;
  window.toggleTheme = toggleThemeWithWave;

  // Initialize theme on load without transition stutter
  setTheme(getCurrentTheme(), false);

  // =========================================================================
  // 4. Global Floating Popover (Collapsed Sidebar)
  // =========================================================================
  var portalHideTimeout = null;

  function showGlobalPortal(triggerEl) {
    if (!document.body.classList.contains("sidebar-collapsed") || !globalPortal) return;
    if (portalHideTimeout) {
      clearTimeout(portalHideTimeout);
      portalHideTimeout = null;
    }

    var rect = triggerEl.getBoundingClientRect();
    var html = "";

    if (triggerEl.hasAttribute("data-portal-title")) {
      var title = triggerEl.getAttribute("data-portal-title");
      var url = triggerEl.getAttribute("data-portal-url");
      var isActive = triggerEl.getAttribute("data-portal-active") === "true";
      html = '<a href="' + url + '" class="global-flyout-item ' + (isActive ? "active" : "") + '">' + title + '</a>';
    } else if (triggerEl.hasAttribute("data-portal-group")) {
      var groupTitle = triggerEl.getAttribute("data-portal-group");
      var subItems = triggerEl.querySelectorAll(".tree-sub-item");
      html = '<div class="global-flyout-title">' + groupTitle + '</div>';
      subItems.forEach(function (sub) {
        var subHref = sub.getAttribute("href");
        var subText = sub.textContent.trim();
        var subActive = sub.classList.contains("active") ? "active" : "";
        html += '<a href="' + subHref + '" class="global-flyout-item ' + subActive + '">' + subText + '</a>';
      });
    }

    if (!html) return;

    globalPortal.innerHTML = html;
    globalPortal.style.left = (rect.right + 10) + "px";
    globalPortal.style.top = Math.max(10, Math.min(window.innerHeight - 200, rect.top)) + "px";
    globalPortal.classList.add("visible");
  }

  function scheduleHideGlobalPortal() {
    if (portalHideTimeout) clearTimeout(portalHideTimeout);
    portalHideTimeout = setTimeout(function () {
      hideGlobalPortal();
    }, 180);
  }

  function hideGlobalPortal() {
    if (globalPortal) {
      globalPortal.classList.remove("visible");
      globalPortal.innerHTML = "";
    }
  }

  if (globalPortal) {
    globalPortal.addEventListener("mouseenter", function () {
      if (portalHideTimeout) clearTimeout(portalHideTimeout);
    });
    globalPortal.addEventListener("mouseleave", scheduleHideGlobalPortal);
  }

  var portalTriggers = document.querySelectorAll("[data-portal-title], [data-portal-group]");
  portalTriggers.forEach(function (el) {
    el.addEventListener("mouseenter", function () { showGlobalPortal(el); });
    el.addEventListener("mouseleave", scheduleHideGlobalPortal);
    el.addEventListener("focus", function () { showGlobalPortal(el); });
    el.addEventListener("blur", scheduleHideGlobalPortal);
  });

  // =========================================================================
  // 5. Tree Accordion & Category Navigation
  // =========================================================================
  document.addEventListener("click", function (e) {
    if (document.body.classList.contains("sidebar-collapsed")) return;

    var chevron = e.target.closest(".tree-chevron, .tree-chevron-btn");
    if (chevron) {
      e.preventDefault();
      e.stopPropagation();
      var group = chevron.closest(".tree-group");
      if (!group) return;

      var isOpen = group.classList.contains("open");
      document.querySelectorAll(".tree-group").forEach(function (g) {
        if (g !== group) g.classList.remove("open");
      });
      group.classList.toggle("open", !isOpen);
    }
  });

  // =========================================================================
  // 6. Drawer Overlay & Modals
  // =========================================================================
  var overlay = document.getElementById("drawer-overlay");
  if (overlay) {
    overlay.addEventListener("click", function() {
      var drawer = document.getElementById("drawer");
      if (drawer) drawer.classList.remove("open");
      overlay.classList.remove("open");
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var drawer = document.getElementById("drawer");
      if (drawer) drawer.classList.remove("open");
      if (overlay) overlay.classList.remove("open");
      if (searchDropdown) searchDropdown.style.display = "none";
    }
  });
});

// Global drawer close helper
window.closeDrawer = function() {
  var drawer = document.getElementById("drawer");
  var overlay = document.getElementById("drawer-overlay");
  if (drawer) drawer.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
};

// Global Toast System
window.showToast = function(message, type = 'info', duration = 3500) {
  var container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerHTML = '<span>' + message + '</span>';
  container.appendChild(toast);
  setTimeout(function() {
    toast.classList.add('hide');
    setTimeout(function() { toast.remove(); }, 300);
  }, duration);
};
