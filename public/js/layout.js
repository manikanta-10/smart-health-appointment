/* Shared application shell: sidebar + topbar. Requires api.js */
(function () {
  const NAV = {
    patient: {
      label: 'Patient',
      items: [
        { key: 'dashboard', href: '/patient/dashboard.html', icon: 'fa-house', label: 'Dashboard' },
        { key: 'doctors', href: '/patient/doctors.html', icon: 'fa-user-doctor', label: 'Find Doctors' },
        { key: 'appointments', href: '/patient/appointments.html', icon: 'fa-clipboard-list', label: 'My Appointments' },
        { key: 'profile', href: '/patient/profile.html', icon: 'fa-user', label: 'Manage Profile' }
      ]
    },
    doctor: {
      label: 'Doctor',
      items: [
        { key: 'dashboard', href: '/doctor/dashboard.html', icon: 'fa-house', label: 'Dashboard' },
        { key: 'appointments', href: '/doctor/appointments.html', icon: 'fa-clipboard-list', label: 'Appointments' },
        { key: 'patients', href: '/doctor/patients.html', icon: 'fa-users', label: 'My Patients' },
        { key: 'availability', href: '/doctor/availability.html', icon: 'fa-clock', label: 'Availability' },
        { key: 'profile', href: '/doctor/profile.html', icon: 'fa-user', label: 'Profile' }
      ]
    },
    admin: {
      label: 'Administrator',
      items: [
        { key: 'dashboard', href: '/admin/dashboard.html', icon: 'fa-house', label: 'Dashboard' },
        { key: 'doctors', href: '/admin/doctors.html', icon: 'fa-user-doctor', label: 'Manage Doctors' },
        { key: 'patients', href: '/admin/patients.html', icon: 'fa-users', label: 'Manage Patients' },
        { key: 'appointments', href: '/admin/appointments.html', icon: 'fa-clipboard-list', label: 'Manage Appointments' },
        { key: 'calendar', href: '/admin/calendar.html', icon: 'fa-calendar-days', label: 'Calendar' },
        { key: 'cancellations', href: '/admin/cancellations.html', icon: 'fa-ban', label: 'Cancellation Logs' },
        { key: 'sms', href: '/admin/sms-logs.html', icon: 'fa-comment-sms', label: 'SMS Logs (Demo)' },
        { key: 'profile', href: '/admin/profile.html', icon: 'fa-user', label: 'My Profile' }
      ]
    }
  };

  function nowLabel() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = new Date();
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function initLayout(role, activeKey) {
    const user = Auth.requireAuth([role]);
    if (!user) return null;
    const config = NAV[role];
    const content = document.getElementById('page-content');
    if (!content) return user;

    const title = content.dataset.title || 'Dashboard';
    const subtitle = content.dataset.subtitle || '';
    const profileHref = config.items.find((i) => i.key === 'profile').href;
    const initials = API.initials(user.name);

    const navHtml = config.items
      .map(
        (item) => `
        <a class="nav-link ${item.key === activeKey ? 'active' : ''}" href="${item.href}">
          <i class="fa-solid ${item.icon}"></i><span>${item.label}</span>
        </a>`
      )
      .join('');

    const shell = document.createElement('div');
    shell.className = 'app-shell';
    shell.innerHTML = `
      <aside class="sidebar" id="appSidebar">
        <div class="sidebar-brand">
          <a class="brand-logo" href="/">
            <span class="brand-mark"><i class="fa-solid fa-heart-pulse"></i></span>
            <span>Smart Health</span>
          </a>
          <small>Appointment System</small>
        </div>
        <nav class="sidebar-nav">
          <div class="sidebar-label">${config.label} menu</div>
          ${navHtml}
        </nav>
        <div class="sidebar-footer">
          <div class="d-flex align-items-center gap-2">
            <span class="avatar">${API.escapeHtml(initials)}</span>
            <div class="flex-grow-1 min-w-0">
              <div class="fw-bold text-truncate" style="font-size:0.82rem;">${API.escapeHtml(user.name)}</div>
              <div class="text-muted text-truncate" style="font-size:0.7rem;">${API.escapeHtml(user.email)}</div>
            </div>
            <button class="btn btn-sm btn-outline-secondary" id="sidebarLogout" title="Log out">
              <i class="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </aside>
      <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
      <div class="main-area">
        <header class="topbar">
          <button class="btn btn-sm btn-outline-secondary d-lg-none" id="sidebarToggle" aria-label="Open menu">
            <i class="fa-solid fa-bars"></i>
          </button>
          <div class="flex-grow-1">
            <h1 class="page-heading">${API.escapeHtml(title)}</h1>
            <div class="page-sub">${API.escapeHtml(subtitle || nowLabel())}</div>
          </div>
          <div class="d-none d-md-block text-end me-1">
            <div class="page-sub"><i class="fa-regular fa-calendar me-1"></i>${nowLabel()}</div>
            <div class="page-sub"><i class="fa-regular fa-clock me-1"></i>Asia/Kolkata (IST)</div>
          </div>
          <div class="dropdown">
            <button class="btn btn-light border d-flex align-items-center gap-2" data-bs-toggle="dropdown" aria-expanded="false">
              <span class="avatar sm">${API.escapeHtml(initials)}</span>
              <span class="d-none d-sm-inline fw-semibold" style="font-size:0.82rem;">${API.escapeHtml(user.name.split(' ')[0])}</span>
              <i class="fa-solid fa-chevron-down" style="font-size:0.65rem;"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm">
              <li><a class="dropdown-item" href="${profileHref}"><i class="fa-solid fa-user me-2 text-muted"></i>My Profile</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><button class="dropdown-item text-danger" id="topbarLogout"><i class="fa-solid fa-right-from-bracket me-2"></i>Log out</button></li>
            </ul>
          </div>
        </header>
        <main class="content-wrap" id="contentSlot"></main>
      </div>`;

    document.body.prepend(shell);
    const slot = document.getElementById('contentSlot');
    slot.appendChild(content);
    content.style.display = '';

    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const closeSidebar = () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('show');
    };
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('show');
    });
    backdrop.addEventListener('click', closeSidebar);
    document.getElementById('sidebarLogout').addEventListener('click', () => Auth.logout());
    document.getElementById('topbarLogout').addEventListener('click', () => Auth.logout());

    return user;
  }

  window.initLayout = initLayout;
})();
