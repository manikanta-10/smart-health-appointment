document.addEventListener('DOMContentLoaded', () => {
  const user = initLayout('admin', 'sms');
  if (!user) return;

  const tbody = document.getElementById('logsBody');
  const statusSelect = document.getElementById('filterStatus');
  const typeSelect = document.getElementById('filterType');
  const banner = document.getElementById('modeBanner');

  async function load() {
    API.setLoading(tbody, 'Loading logs...');
    try {
      const qs = API.qs({ status: statusSelect.value, message_type: typeSelect.value });
      const res = await API.request(`/admin/sms-logs${qs}`);
      const { logs, stats, mode } = res.data;

      document.getElementById('statSent').textContent = stats.sent;
      document.getElementById('statSimulated').textContent = stats.simulated;
      document.getElementById('statFailed').textContent = stats.failed;
      document.getElementById('statTotal').textContent = stats.total;

      banner.innerHTML = mode === 'twilio'
        ? `<div class="alert alert-success mb-0"><i class="fa-solid fa-circle-check me-2"></i><strong>Twilio is configured.</strong> Rows marked <em>sent</em> were accepted by Twilio; simulated rows were never delivered.</div>`
        : `<div class="alert alert-warning mb-0"><i class="fa-solid fa-triangle-exclamation me-2"></i><strong>Demo mode (Twilio not configured).</strong> All messages are simulated for demonstration and are <strong>NOT delivered</strong>. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER to .env to send real SMS.</div>`;

      if (!logs.length) {
        tbody.innerHTML = `<tr><td colspan="8">${API.emptyState('fa-comment-slash', 'No SMS logs', 'Messages are logged when appointments are booked or reminders run.')}</td></tr>`;
        return;
      }
      tbody.innerHTML = logs
        .map(
          (l) => `<tr>
            <td class="fw-semibold">${API.escapeHtml(l.patient_name)}</td>
            <td>${API.escapeHtml(l.doctor_name)}</td>
            <td class="small">${API.fmtDateTime(l.appointment_datetime)}</td>
            <td><span class="badge bg-light text-dark border text-capitalize">${API.escapeHtml(l.message_type)}</span></td>
            <td>${API.smsBadge(l.status)}</td>
            <td class="small text-nowrap">${API.escapeHtml(l.phone_number)}</td>
            <td style="max-width:320px;">
              <div class="text-truncate" style="max-width:320px;" title="${API.escapeHtml(l.message)}">${API.escapeHtml(l.message)}</div>
              ${l.error_message ? `<div class="text-danger" style="font-size:.72rem;">${API.escapeHtml(l.error_message)}</div>` : ''}
            </td>
            <td class="small text-nowrap">${API.fmtDateTime(l.sent_at)}</td>
          </tr>`
        )
        .join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8">${API.emptyState('fa-triangle-exclamation', 'Could not load SMS logs', err.message)}</td></tr>`;
    }
  }

  statusSelect.addEventListener('change', load);
  typeSelect.addEventListener('change', load);
  load();
});
