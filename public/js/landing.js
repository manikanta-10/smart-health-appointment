document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const user = Auth.getUser();
  if (user && Auth.getToken()) {
    document.getElementById('navActions').innerHTML =
      `<a href="/${user.role}/dashboard.html" class="btn btn-primary btn-sm">Go to dashboard</a>`;
  }

  const wrap = document.getElementById('featuredDoctors');

  try {
    const res = await API.request('/doctors', { auth: false });
    const doctors = res.data.doctors || [];

    if (!doctors.length) {
      wrap.innerHTML = `<div class="col-12">${API.emptyState('fa-user-doctor', 'No doctors available', 'Doctor accounts are added by the administrator.')}</div>`;
      return;
    }

    wrap.innerHTML = doctors
      .map(
        (d) => `
        <div class="col-md-6 col-lg-4">
          <div class="doctor-card">
            <div class="d-flex align-items-center gap-2 mb-2">
              <div class="doctor-avatar">${API.escapeHtml(API.initials(d.name))}</div>
              <div>
                <div class="fw-semibold">${API.escapeHtml(d.name)}</div>
                <span class="spec-tag">${API.escapeHtml(d.specialization)}</span>
              </div>
            </div>
            <div class="meta-row"><i class="fa-solid fa-graduation-cap"></i>${API.escapeHtml(d.qualification || 'Qualified specialist')}</div>
            <div class="meta-row"><i class="fa-solid fa-briefcase"></i>${d.experience} years experience</div>
            <div class="meta-row"><i class="fa-solid fa-indian-rupee-sign"></i>${API.money(d.consultation_fee)} consultation fee</div>
            <a href="/login.html" class="btn btn-outline-primary btn-sm mt-2 w-100">Login to book</a>
          </div>
        </div>`
      )
      .join('');
  } catch (err) {
    wrap.innerHTML = `<div class="col-12">${API.emptyState('fa-triangle-exclamation', 'Unable to load doctors', err.message)}</div>`;
  }
});
