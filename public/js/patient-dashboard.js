document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('patient', 'dashboard');
  if (!user) return;

  document.getElementById('welcomeName').textContent = `Hello, ${user.name.split(' ')[0]}!`;

  try {
    const res = await API.request('/patient/stats');
    const { nextAppointment, recentAppointments } = res.data;

    const nextWrap = document.getElementById('nextAppointment');
    if (!nextAppointment) {
      nextWrap.innerHTML = `
        <div class="empty-state py-3">
          <i class="fa-regular fa-calendar"></i>
          <h6>No upcoming appointments</h6>
          <p>Find a doctor and book your next visit.</p>
          <a href="/patient/doctors.html" class="btn btn-primary btn-sm mt-2">Find a doctor</a>
        </div>`;
    } else {
      const a = nextAppointment;
      nextWrap.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between gap-3">
          <div>
            <div class="fw-semibold">${API.escapeHtml(a.doctor_name)}</div>
            <div class="text-muted small">${API.escapeHtml(a.specialization)}</div>
            <div class="small mt-2"><i class="fa-regular fa-calendar me-2 text-primary"></i>${API.fmtDate(a.appointment_datetime)}</div>
            <div class="small"><i class="fa-regular fa-clock me-2 text-primary"></i>${API.fmtTime(a.appointment_datetime)} - ${API.fmtTime(a.appointment_end_datetime)}</div>
            ${a.reason ? `<div class="small text-muted mt-2">Reason: ${API.escapeHtml(a.reason)}</div>` : ''}
          </div>
          <div class="text-end">
            ${API.statusBadge(a.status)}
            <div class="small text-muted mt-2">Fee: ${API.money(a.consultation_fee)}</div>
            <a href="/patient/appointments.html" class="btn btn-outline-primary btn-sm mt-2">Manage</a>
          </div>
        </div>`;
    }

    const tbody = document.getElementById('recentTable');
    if (!recentAppointments || !recentAppointments.length) {
      tbody.innerHTML = `<tr><td colspan="4">${API.emptyState('fa-clock-rotate-left', 'No appointment history yet', 'Your past and cancelled appointments will appear here.')}</td></tr>`;
    } else {
      tbody.innerHTML = recentAppointments
        .map(
          (a) => `<tr>
            <td class="fw-semibold">${API.escapeHtml(a.doctor_name)}</td>
            <td class="text-muted">${API.escapeHtml(a.specialization)}</td>
            <td>${API.fmtDateTime(a.appointment_datetime)}</td>
            <td>${API.statusBadge(a.status)}</td>
          </tr>`
        )
        .join('');
    }
  } catch (err) {
    API.toast(err.message, 'error');
  }
});
