document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('patient', 'doctors');
  if (!user) return;

  const grid = document.getElementById('doctorsGrid');
  const countEl = document.getElementById('resultCount');
  const searchInput = document.getElementById('searchInput');
  const specFilter = document.getElementById('specFilter');

  try {
    const res = await API.request('/doctors/specializations', { auth: false });
    const specs = res.data.specializations || [];
    specs.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      specFilter.appendChild(opt);
    });
  } catch (_) {
    /* specialisations are optional */
  }

  async function loadDoctors() {
    API.setLoading(grid, 'Loading doctors...');
    countEl.textContent = 'Loading doctors...';
    try {
      const res = await API.request(
        `/doctors${API.qs({ q: searchInput.value.trim(), specialization: specFilter.value })}`,
        { auth: false }
      );
      const doctors = res.data.doctors || [];
      countEl.textContent = `${doctors.length} doctor${doctors.length === 1 ? '' : 's'} found`;

      if (!doctors.length) {
        grid.innerHTML = `<div class="col-12">${API.emptyState('fa-user-doctor', 'No doctors matched your search', 'Try a different name or specialisation.')}</div>`;
        return;
      }

      grid.innerHTML = doctors
        .map(
          (d) => `
          <div class="col-md-6 col-xl-4">
            <div class="doctor-card">
              <div class="d-flex align-items-center gap-3 mb-3">
                <div class="doctor-avatar">${API.escapeHtml(API.initials(d.name))}</div>
                <div>
                  <div class="fw-bold">${API.escapeHtml(d.name)}</div>
                  <span class="spec-tag mt-1">${API.escapeHtml(d.specialization)}</span>
                </div>
              </div>
              <div class="meta-row"><i class="fa-solid fa-graduation-cap"></i>${API.escapeHtml(d.qualification || 'Qualified specialist')}</div>
              <div class="meta-row"><i class="fa-solid fa-briefcase"></i>${d.experience} years experience</div>
              <div class="meta-row"><i class="fa-solid fa-clock"></i>${d.appointment_duration} minute consultation</div>
              <div class="meta-row"><i class="fa-solid fa-indian-rupee-sign"></i>${API.money(d.consultation_fee)} consultation fee</div>
              <p class="text-muted small mt-2 mb-3" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${API.escapeHtml(d.bio || '')}</p>
              <div class="d-flex gap-2 mt-auto">
                <a href="/patient/doctor.html?id=${d.id}" class="btn btn-primary btn-sm flex-grow-1"><i class="fa-regular fa-calendar-check me-1"></i>View &amp; Book</a>
                <a href="/patient/calendar.html?doctor=${d.id}" class="btn btn-outline-primary btn-sm" title="Open calendar"><i class="fa-regular fa-calendar-days"></i></a>
              </div>
            </div>
          </div>`
        )
        .join('');
    } catch (err) {
      grid.innerHTML = `<div class="col-12">${API.emptyState('fa-triangle-exclamation', 'Unable to load doctors', err.message)}</div>`;
      countEl.textContent = 'Could not load doctors';
    }
  }

  document.getElementById('applyFilter').addEventListener('click', loadDoctors);
  document.getElementById('resetFilter').addEventListener('click', () => {
    searchInput.value = '';
    specFilter.value = '';
    loadDoctors();
  });
  searchInput.addEventListener('input', API.debounce(loadDoctors, 400));
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadDoctors(); });
  specFilter.addEventListener('change', loadDoctors);

  loadDoctors();
});
