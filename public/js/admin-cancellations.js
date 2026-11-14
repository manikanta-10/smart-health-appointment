document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('admin', 'cancellations');
  if (!user) return;

  const tbody = document.getElementById('cancelBody');
  const doctorSelect = document.getElementById('filterDoctor');
  const countEl = document.getElementById('resultCount');

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

  async function load() {
    API.setLoading(tbody, 'Loading cancellations...');
    try {
      const res = await API.request(`/admin/cancellations${API.qs({ doctor_id: doctorSelect.value })}`);
      const list = res.data.cancellations || [];
      countEl.textContent = `${list.length} record${list.length === 1 ? '' : 's'}`;
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="7">${API.emptyState('fa-ban', 'No cancellations', 'Cancelled appointments will be recorded here.')}</td></tr>`;
        return;
      }
      tbody.innerHTML = list
        .map(
          (c) => `<tr>
            <td>
              <div class="fw-semibold">${API.escapeHtml(c.patient_name)}</div>
              <div class="text-muted" style="font-size:.73rem;">#${c.appointment_id}</div>
            </td>
            <td>${API.escapeHtml(c.doctor_name)}</td>
            <td>
              <div>${API.fmtDate(c.appointment_datetime)}</div>
              <div class="text-muted" style="font-size:.75rem;">${API.fmtTime(c.appointment_datetime)}</div>
            </td>
            <td>${API.statusBadge(c.previous_status)}</td>
            <td>
              <div class="small">${API.escapeHtml(c.cancelled_by_name)}</div>
              <div class="text-muted" style="font-size:.72rem;text-transform:capitalize;">${API.escapeHtml(c.cancelled_by_role)}</div>
            </td>
            <td class="text-muted" style="max-width:240px;">${API.escapeHtml(c.cancellation_reason || '—')}</td>
            <td class="small">${API.fmtDateTime(c.cancelled_at)}</td>
          </tr>`
        )
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7">${API.emptyState('fa-triangle-exclamation', 'Could not load cancellations', err.message)}</td></tr>`;
    }
  }

  doctorSelect.addEventListener('change', load);
  load();
});
