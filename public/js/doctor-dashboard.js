document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('doctor', 'dashboard');
  if (!user) return;

  document.getElementById('doctorName').textContent = `Welcome, ${user.name}`;

  async function load() {
    try {
      const [dashRes, profileRes] = await Promise.all([
        API.request('/doctor/dashboard'),
        API.request('/doctor/profile')
      ]);
      const { today, todayAppointments, upcoming } = dashRes.data;
      const doctor = profileRes.data.doctor;

      document.getElementById('doctorSpeciality').textContent = `${doctor.specialization} · ${doctor.experience} years experience`;
      document.getElementById('todayLabel').textContent = `· ${API.fmtDate(today)}`;

      const tbody = document.getElementById('todayTable');
      if (!todayAppointments.length) {
        tbody.innerHTML = `<tr><td colspan="4">${API.emptyState('fa-mug-hot', 'No appointments today', 'Enjoy the break or check your upcoming schedule.')}</td></tr>`;
      } else {
        tbody.innerHTML = todayAppointments
          .map(
            (a) => `<tr>
              <td class="fw-semibold">${API.fmtTime(a.appointment_datetime)}</td>
              <td>
                <div class="fw-semibold">${API.escapeHtml(a.patient_name)}</div>
                <div class="text-muted" style="font-size:.74rem;">${API.escapeHtml(a.patient_phone)}</div>
              </td>
              <td>${API.statusBadge(a.status)}</td>
              <td class="text-end"><button class="btn btn-sm btn-outline-primary" data-view="${a.id}"><i class="fa-regular fa-eye me-1"></i>Details</button></td>
            </tr>`
          )
          .join('');
        tbody.querySelectorAll('[data-view]').forEach((btn) => {
          btn.addEventListener('click', () => openDoctorAppointment(Number(btn.dataset.view), load));
        });
      }

      const upcomingWrap = document.getElementById('upcomingList');
      if (!upcoming.length) {
        upcomingWrap.innerHTML = API.emptyState('fa-calendar-xmark', 'Nothing upcoming', 'New bookings will appear here.');
      } else {
        upcomingWrap.innerHTML = upcoming
          .map(
            (a) => `<div class="d-flex justify-content-between align-items-start gap-2 py-2 border-bottom">
              <div class="d-flex gap-2">
                <span class="avatar sm">${API.escapeHtml(API.initials(a.patient_name))}</span>
                <div>
                  <div class="fw-semibold" style="font-size:.85rem;">${API.escapeHtml(a.patient_name)}</div>
                  <div class="text-muted" style="font-size:.74rem;">${API.fmtDate(a.appointment_datetime)} · ${API.fmtTime(a.appointment_datetime)}</div>
                </div>
              </div>
              <button class="btn btn-sm btn-outline-secondary" data-view="${a.id}" title="View details"><i class="fa-regular fa-eye"></i></button>
            </div>`
          )
          .join('');
        upcomingWrap.querySelectorAll('[data-view]').forEach((btn) => {
          btn.addEventListener('click', () => openDoctorAppointment(Number(btn.dataset.view), load));
        });
      }
    } catch (err) {
      API.toast(err.message, 'error');
    }
  }

  load();
});
