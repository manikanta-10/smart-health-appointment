document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('doctor', 'cancellations');
  if (!user) return;

  const tbody = document.getElementById('cancelBody');
  const countEl = document.getElementById('resultCount');

  try {
    const res = await API.request('/doctor/cancellations');
    const list = res.data.cancellations || [];
    countEl.textContent = `${list.length} cancellation${list.length === 1 ? '' : 's'}`;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6">${API.emptyState('fa-ban', 'No cancellations', 'Cancelled appointments will be recorded here for your records.')}</td></tr>`;
      return;
    }
    tbody.innerHTML = list
      .map(
        (c) => `<tr>
          <td class="fw-semibold">${API.escapeHtml(c.patient_name)}</td>
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
    tbody.innerHTML = `<tr><td colspan="6">${API.emptyState('fa-triangle-exclamation', 'Could not load cancellations', err.message)}</td></tr>`;
  }
});
