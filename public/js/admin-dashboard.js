document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('admin', 'dashboard');
  if (!user) return;

  try {
    const res = await API.request('/admin/stats');
    const { stats, statusBreakdown, upcoming } = res.data;

    document.querySelectorAll('[data-stat]').forEach((el) => {
      el.textContent = stats[el.dataset.stat] ?? 0;
    });

    new Chart(document.getElementById('statusChart'), {
      type: 'bar',
      data: {
        labels: ['Booked', 'Confirmed', 'Completed', 'Cancelled'],
        datasets: [{
          label: 'Appointments',
          data: [
            statusBreakdown.booked,
            statusBreakdown.confirmed,
            statusBreakdown.completed,
            statusBreakdown.cancelled
          ],
          backgroundColor: ['#2563eb', '#16a34a', '#64748b', '#dc2626'],
          borderRadius: 4,
          maxBarThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } }, grid: { color: '#eef2f7' } }
        }
      }
    });

    const tbody = document.getElementById('upcomingBody');
    if (!upcoming.length) {
      tbody.innerHTML = `<tr><td colspan="4">${API.emptyState('fa-calendar-xmark', 'No upcoming appointments', 'New bookings will appear here.')}</td></tr>`;
    } else {
      tbody.innerHTML = upcoming
        .map(
          (a) => `<tr>
            <td class="fw-semibold">${API.escapeHtml(a.patient_name)}</td>
            <td>
              <div>${API.escapeHtml(a.doctor_name)}</div>
              <div class="text-muted" style="font-size:.73rem;">${API.escapeHtml(a.specialization)}</div>
            </td>
            <td>
              <div>${API.fmtDate(a.appointment_datetime)}</div>
              <div class="text-muted" style="font-size:.75rem;">${API.fmtTime(a.appointment_datetime)}</div>
            </td>
            <td>${API.statusBadge(a.status)}</td>
          </tr>`
        )
        .join('');
    }
  } catch (err) {
    API.toast(err.message, 'error');
  }
});
