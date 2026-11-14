document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('admin', 'calendar');
  if (!user) return;

  const doctorSelect = document.getElementById('doctorSelect');

  function addIstOffset(isoLocal) {
    if (!isoLocal) return isoLocal;
    if (/[Zz]|[+-]\d{2}:\d{2}$/.test(isoLocal)) return isoLocal;
    return `${isoLocal}+05:30`;
  }

  try {
    const res = await API.request('/admin/doctors');
    (res.data.doctors || []).forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.name} · ${d.specialization}${Number(d.is_active) ? '' : ' (inactive)'}`;
      doctorSelect.appendChild(opt);
    });
  } catch (_) {
    /* non-fatal */
  }

  function showDetails(info) {
    const p = info.event.extendedProps;
    API.openModal(`
      <div class="modal fade" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Appointment details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <div class="text-muted small text-uppercase fw-semibold">Patient</div>
                  <div class="fw-bold">${API.escapeHtml(p.patient_name)}</div>
                  <div class="text-muted small">${API.escapeHtml(p.patient_phone)}</div>
                </div>
                ${API.statusBadge(p.status)}
              </div>
              <div class="mb-3">
                <div class="text-muted small text-uppercase fw-semibold">Doctor</div>
                <div>${API.escapeHtml(p.doctor_name)}</div>
                <div class="text-muted small">${API.escapeHtml(p.specialization)}</div>
              </div>
              <div class="mb-3">
                <div class="text-muted small text-uppercase fw-semibold">When</div>
                <div>${API.fmtDateTime(info.event.extendedProps.startWall || info.event.startStr)}</div>
              </div>
              <div>
                <div class="text-muted small text-uppercase fw-semibold">Reason</div>
                <div class="text-muted">${API.escapeHtml(p.reason || 'No reason provided')}</div>
              </div>
            </div>
            <div class="modal-footer">
              <a class="btn btn-outline-primary btn-sm" href="/admin/appointments.html">Manage appointments</a>
              <button class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>`);
  }

  const calendar = new FullCalendar.Calendar(document.getElementById('adminCalendar'), {
    initialView: 'dayGridMonth',
    height: 'auto',
    timeZone: 'Asia/Kolkata',
    nowIndicator: true,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    buttonText: { today: 'Today', month: 'Month', week: 'Week', day: 'Day' },
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: true },
    events: async (info, success, failure) => {
      const start = info.startStr.slice(0, 10);
      const end = API.addDaysIso(info.endStr.slice(0, 10), -1);
      try {
        const qs = API.qs({ start, end, doctor_id: doctorSelect.value });
        const res = await API.request(`/admin/calendar${qs}`);
        const events = (res.data.events || []).map((ev) => ({
          ...ev,
          start: addIstOffset(ev.start),
          end: addIstOffset(ev.end),
          extendedProps: { ...ev.extendedProps, startWall: ev.start }
        }));
        success(events);
      } catch (err) {
        API.toast(err.message, 'error');
        failure(err);
      }
    },
    eventClick: (info) => {
      info.jsEvent.preventDefault();
      showDetails(info);
    }
  });

  calendar.render();
  doctorSelect.addEventListener('change', () => calendar.refetchEvents());
});
