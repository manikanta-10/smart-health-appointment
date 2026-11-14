document.addEventListener('DOMContentLoaded', () => {
  const user = initLayout('doctor', 'calendar');
  if (!user) return;

  function addIstOffset(isoLocal) {
    if (!isoLocal) return isoLocal;
    if (/[Zz]|[+-]\d{2}:\d{2}$/.test(isoLocal)) return isoLocal;
    return `${isoLocal}+05:30`;
  }

  const calendar = new FullCalendar.Calendar(document.getElementById('doctorCalendar'), {
    initialView: 'timeGridWeek',
    height: 'auto',
    timeZone: 'Asia/Kolkata',
    nowIndicator: true,
    slotMinTime: '07:00:00',
    slotMaxTime: '20:00:00',
    allDaySlot: false,
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
        const res = await API.request(`/doctor/calendar?start=${start}&end=${end}&include_slots=1`);
        const events = (res.data.events || []).map((ev) => ({
          ...ev,
          start: addIstOffset(ev.start),
          end: addIstOffset(ev.end)
        }));
        success(events);
      } catch (err) {
        API.toast(err.message, 'error');
        failure(err);
      }
    },
    eventClick: (info) => {
      info.jsEvent.preventDefault();
      const props = info.event.extendedProps;
      if (props.type === 'appointment') {
        openDoctorAppointment(Number(props.appointment_id), () => calendar.refetchEvents());
      } else if (props.type === 'available') {
        API.openModal(`
          <div class="modal fade" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Free slot</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                  <p class="mb-1 fw-semibold">${API.fmtDate(props.datetime)} · ${API.fmtTime(props.datetime)}</p>
                  <p class="text-muted small mb-0">This slot is currently available. Patients can book it from their portal.</p>
                </div>
                <div class="modal-footer"><button class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Close</button></div>
              </div>
            </div>
          </div>`);
      }
    },
    eventDidMount: (info) => {
      const props = info.event.extendedProps;
      if (props.type === 'available') info.el.title = 'Free slot';
      if (props.type === 'appointment') info.el.title = `${props.patient_name} · ${props.status}`;
    }
  });

  calendar.render();
});
