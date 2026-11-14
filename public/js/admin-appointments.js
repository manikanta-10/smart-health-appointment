document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('admin', 'appointments');
  if (!user) return;

  const tbody = document.getElementById('appointmentsBody');
  const doctorSelect = document.getElementById('filterDoctor');
  const dateInput = document.getElementById('filterDate');
  const statusSelect = document.getElementById('filterStatus');
  const countEl = document.getElementById('resultCount');
  let appointments = [];

  try {
    const res = await API.request('/admin/doctors');
    (res.data.doctors || []).forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.name} · ${d.specialization}`;
      doctorSelect.appendChild(opt);
    });
  } catch (_) {
    /* non-fatal */
  }

  function actionsFor(a) {
    const buttons = [];
    if (a.status === 'booked') {
      buttons.push(`<button class="btn btn-sm btn-outline-success" data-status="confirmed" data-id="${a.id}"><i class="fa-solid fa-check me-1"></i>Confirm</button>`);
    }
    if (a.status === 'booked' || a.status === 'confirmed') {
      buttons.push(`<button class="btn btn-sm btn-outline-secondary" data-status="completed" data-id="${a.id}"><i class="fa-solid fa-circle-check me-1"></i>Complete</button>`);
      buttons.push(`<button class="btn btn-sm btn-outline-danger" data-cancel="${a.id}"><i class="fa-solid fa-ban me-1"></i>Cancel</button>`);
    }
    return buttons.length ? buttons.join(' ') : '<span class="text-muted small">No actions</span>';
  }

  function render() {
    countEl.textContent = `${appointments.length} result${appointments.length === 1 ? '' : 's'}`;
    if (!appointments.length) {
      tbody.innerHTML = `<tr><td colspan="6">${API.emptyState('fa-calendar-xmark', 'No appointments found', 'Adjust the filters to see other appointments.')}</td></tr>`;
      return;
    }
    tbody.innerHTML = appointments
      .map(
        (a) => `<tr>
          <td>
            <div class="fw-semibold">${API.escapeHtml(a.patient_name)}</div>
            <div class="text-muted" style="font-size:.73rem;">${API.escapeHtml(a.patient_phone)}</div>
          </td>
          <td>
            <div>${API.escapeHtml(a.doctor_name)}</div>
            <div class="text-muted" style="font-size:.73rem;">${API.escapeHtml(a.specialization)}</div>
          </td>
          <td>
            <div>${API.fmtDate(a.appointment_datetime)}</div>
            <div class="text-muted" style="font-size:.75rem;">${API.fmtTime(a.appointment_datetime)} – ${API.fmtTime(a.appointment_end_datetime)}</div>
          </td>
          <td class="text-muted small" style="max-width:200px;">${API.escapeHtml(a.reason || '—')}</td>
          <td>${API.statusBadge(a.status)}</td>
          <td class="text-end" style="min-width:230px;">${actionsFor(a)}</td>
        </tr>`
      )
      .join('');

    tbody.querySelectorAll('[data-status]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const next = btn.dataset.status;
        const ok = await API.confirmDialog({
          title: next === 'confirmed' ? 'Confirm appointment' : 'Mark completed',
          message:
            next === 'confirmed'
              ? 'Confirm this appointment? The patient will see the updated status.'
              : 'Mark this appointment as completed? This cannot be undone.',
          confirmText: next === 'confirmed' ? 'Confirm' : 'Mark completed',
          danger: next === 'completed'
        });
        if (!ok) return;
        try {
          const res = await API.request(`/admin/appointments/${btn.dataset.id}/status`, {
            method: 'PATCH',
            body: { status: next }
          });
          API.toast(res.message, 'success');
          load();
        } catch (err) {
          API.toast(err.message, 'error', 6000);
        }
      });
    });

    tbody.querySelectorAll('[data-cancel]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const reason = await API.promptDialog({
          title: 'Cancel appointment',
          message: 'Admin cancellation bypasses the 6-hour patient rule. The cancellation is recorded in the audit log.',
          placeholder: 'Reason for cancellation (optional)',
          confirmText: 'Cancel appointment',
          danger: true
        });
        if (reason === null) return;
        try {
          const res = await API.request(`/admin/appointments/${btn.dataset.cancel}/cancel`, {
            method: 'POST',
            body: { reason }
          });
          API.toast(res.message, 'success');
          load();
        } catch (err) {
          API.toast(err.message, 'error', 6000);
        }
      });
    });
  }

  async function load() {
    API.setLoading(tbody, 'Loading appointments...');
    try {
      const qs = API.qs({
        doctor_id: doctorSelect.value,
        date: dateInput.value,
        status: statusSelect.value
      });
      const res = await API.request(`/admin/appointments${qs}`);
      appointments = res.data.appointments || [];
      render();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6">${API.emptyState('fa-triangle-exclamation', 'Could not load appointments', err.message)}</td></tr>`;
    }
  }

  document.getElementById('applyFilters').addEventListener('click', load);
  document.getElementById('resetFilters').addEventListener('click', () => {
    doctorSelect.value = '';
    dateInput.value = '';
    statusSelect.value = '';
    load();
  });
  doctorSelect.addEventListener('change', load);
  statusSelect.addEventListener('change', load);

  load();
});
