document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('patient', 'appointments');
  if (!user) return;

  const tbody = document.getElementById('appointmentsBody');
  let scope = 'upcoming';

  function canCancel(appointment) {
    return ['booked', 'confirmed'].includes(appointment.status) && API.hoursUntil(appointment.appointment_datetime) >= 6;
  }

  function actionCell(a) {
    if (!['booked', 'confirmed'].includes(a.status)) {
      return `<span class="text-muted small">—</span>`;
    }
    if (canCancel(a)) {
      return `<button class="btn btn-sm btn-outline-danger" data-cancel="${a.id}" data-doctor="${API.escapeHtml(a.doctor_name)}" data-datetime="${a.appointment_datetime}">
        <i class="fa-solid fa-ban me-1"></i>Cancel
      </button>`;
    }
    const hours = API.hoursUntil(a.appointment_datetime);
    const note = hours > 0 ? 'Less than 6h left' : 'Appointment started';
    return `<button class="btn btn-sm btn-outline-secondary" disabled title="${note}"><i class="fa-solid fa-lock me-1"></i>${note}</button>`;
  }

  async function load() {
    API.setLoading(tbody, 'Loading appointments...');
    tbody.innerHTML = `<tr><td colspan="6"><div class="loading-box"><span class="spinner-border spinner-border-sm text-primary"></span> Loading appointments...</div></td></tr>`;
    try {
      const res = await API.request(`/patient/appointments?scope=${scope}`);
      const list = res.data.appointments || [];
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6">${API.emptyState(
          scope === 'upcoming' ? 'fa-calendar-xmark' : 'fa-clock-rotate-left',
          scope === 'upcoming' ? 'No upcoming appointments' : 'No appointment history yet',
          scope === 'upcoming' ? 'Book a visit with one of our specialists.' : 'Completed and cancelled visits will appear here.'
        )}</td></tr>`;
        return;
      }
      tbody.innerHTML = list
        .map(
          (a) => `<tr>
            <td>
              <div class="fw-semibold">${API.escapeHtml(a.doctor_name)}</div>
              <div class="text-muted" style="font-size:.75rem;">${API.escapeHtml(a.specialization)}</div>
            </td>
            <td>
              <div>${API.fmtDate(a.appointment_datetime)}</div>
              <div class="text-muted" style="font-size:.78rem;">${API.fmtTime(a.appointment_datetime)} - ${API.fmtTime(a.appointment_end_datetime)}</div>
            </td>
            <td class="text-muted" style="max-width:220px;">${API.escapeHtml(a.reason || '—')}</td>
            <td>${API.money(a.consultation_fee)}</td>
            <td>${API.statusBadge(a.status)}</td>
            <td class="text-end">${actionCell(a)}</td>
          </tr>`
        )
        .join('');

      tbody.querySelectorAll('[data-cancel]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const reason = await API.promptDialog({
            title: 'Cancel appointment',
            message: `Cancel your appointment with ${btn.dataset.doctor} on ${API.fmtDateTime(btn.dataset.datetime)}? The slot will become available to other patients.`,
            placeholder: 'Reason for cancellation (optional)',
            confirmText: 'Yes, cancel appointment',
            danger: true
          });
          if (reason === null) return;
          btn.disabled = true;
          btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
          try {
            const res = await API.request(`/appointments/${btn.dataset.cancel}/cancel`, {
              method: 'POST',
              body: { reason }
            });
            API.toast(res.message, 'success');
            load();
          } catch (err) {
            API.toast(err.message, 'error', 6000);
            load();
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6">${API.emptyState('fa-triangle-exclamation', 'Could not load appointments', err.message)}</td></tr>`;
    }
  }

  document.querySelectorAll('#apptTabs .nav-link').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#apptTabs .nav-link').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      scope = tab.dataset.scope;
      load();
    });
  });

  load();
});
