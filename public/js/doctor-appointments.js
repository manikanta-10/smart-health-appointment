document.addEventListener('DOMContentLoaded', () => {
  const user = initLayout('doctor', 'appointments');
  if (!user) return;

  const fromInput = document.getElementById('fromDate');
  const toInput = document.getElementById('toDate');
  const statusFilter = document.getElementById('statusFilter');
  const tbody = document.getElementById('appointmentsBody');
  const countEl = document.getElementById('resultCount');

  fromInput.value = API.addDaysIso(API.todayIso(), -30);
  toInput.value = API.addDaysIso(API.todayIso(), 60);

  async function load() {
    tbody.innerHTML = `<tr><td colspan="6"><div class="loading-box"><span class="spinner-border spinner-border-sm text-primary"></span> Loading appointments...</div></td></tr>`;
    try {
      const res = await API.request(
        `/doctor/appointments${API.qs({ from: fromInput.value, to: toInput.value, status: statusFilter.value })}`
      );
      const list = res.data.appointments || [];
      countEl.textContent = `${list.length} appointment${list.length === 1 ? '' : 's'}`;
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6">${API.emptyState('fa-calendar-xmark', 'No appointments found', 'Adjust the filters to see more results.')}</td></tr>`;
        return;
      }
      tbody.innerHTML = list
        .map(
          (a) => `<tr>
            <td>
              <div class="fw-semibold">${API.escapeHtml(a.patient_name)}</div>
              <div class="text-muted" style="font-size:.74rem;">${API.escapeHtml(a.patient_phone)}</div>
            </td>
            <td>
              <div>${API.fmtDate(a.appointment_datetime)}</div>
              <div class="text-muted" style="font-size:.78rem;">${API.fmtTime(a.appointment_datetime)} - ${API.fmtTime(a.appointment_end_datetime)}</div>
            </td>
            <td class="text-muted" style="max-width:220px;">${API.escapeHtml(a.reason || '—')}</td>
            <td>${API.money(a.consultation_fee)}</td>
            <td>${API.statusBadge(a.status)}</td>
            <td class="text-end"><button class="btn btn-sm btn-outline-primary" data-view="${a.id}"><i class="fa-regular fa-eye me-1"></i>Details</button></td>
          </tr>`
        )
        .join('');
      tbody.querySelectorAll('[data-view]').forEach((btn) => {
        btn.addEventListener('click', () => openDoctorAppointment(Number(btn.dataset.view), load));
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6">${API.emptyState('fa-triangle-exclamation', 'Could not load appointments', err.message)}</td></tr>`;
    }
  }

  document.getElementById('applyFilters').addEventListener('click', load);
  document.getElementById('resetFilters').addEventListener('click', () => {
    fromInput.value = API.addDaysIso(API.todayIso(), -30);
    toInput.value = API.addDaysIso(API.todayIso(), 60);
    statusFilter.value = '';
    load();
  });

  load();
});
