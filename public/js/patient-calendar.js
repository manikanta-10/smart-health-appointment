document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('patient', 'calendar');
  if (!user) return;

  const doctorSelect = document.getElementById('doctorSelect');
  const params = new URLSearchParams(window.location.search);
  const preferredDoctor = params.get('doctor');
  let calendar = null;
  let doctors = [];

  function addIstOffset(isoLocal) {
    if (!isoLocal) return isoLocal;
    if (/[Zz]|[+-]\d{2}:\d{2}$/.test(isoLocal)) return isoLocal;
    return `${isoLocal}+05:30`;
  }

  async function bookSlot(ev) {
    const props = ev.event.extendedProps;
    const doctor = doctors.find((d) => d.id === Number(props.doctor_id));
    if (!doctor) return;
    const ok = await API.confirmDialog({
      title: 'Confirm appointment',
      message: `Book ${API.fmtDate(props.datetime)} at ${API.fmtTime(props.datetime)} with ${doctor.name}? Consultation fee: ${API.money(doctor.consultation_fee)}.`,
      confirmText: 'Book appointment'
    });
    if (!ok) return;

    const reason = await API.promptDialog({
      title: 'Reason for visit',
      message: 'Optionally add a short reason for your appointment.',
      placeholder: 'e.g. Chest pain follow-up',
      confirmText: 'Book now'
    });
    if (reason === null) return;

    try {
      const res = await API.request('/appointments', {
        method: 'POST',
        body: { doctor_id: doctor.id, appointment_datetime: props.datetime, reason }
      });
      API.toast(res.message, res.data.sms && res.data.sms.status === 'simulated' ? 'warning' : 'success', 6000);
      calendar.refetchEvents();
    } catch (err) {
      API.toast(err.message, 'error', 6000);
      calendar.refetchEvents();
    }
  }

  try {
    const res = await API.request('/doctors', { auth: false });
    doctors = res.data.doctors || [];
    if (!doctors.length) {
      doctorSelect.innerHTML = '<option value="">No doctors available</option>';
      return;
    }
    doctorSelect.innerHTML = doctors
      .map((d) => `<option value="${d.id}">${API.escapeHtml(d.name)} · ${API.escapeHtml(d.specialization)}</option>`)
      .join('');
    if (preferredDoctor && doctors.some((d) => d.id === Number(preferredDoctor))) {
      doctorSelect.value = preferredDoctor;
    }
  } catch (err) {
    doctorSelect.innerHTML = '<option value="">Could not load doctors</option>';
    API.toast(err.message, 'error');
    return;
  }

  calendar = new FullCalendar.Calendar(document.getElementById('patientCalendar'), {
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
      const doctorId = doctorSelect.value;
      if (!doctorId) return success([]);
      const start = info.startStr.slice(0, 10);
      const end = API.addDaysIso(info.endStr.slice(0, 10), -1);
      try {
        const res = await API.request(`/doctors/${doctorId}/calendar?start=${start}&end=${end}`);
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
    eventClick: async (info) => {
      info.jsEvent.preventDefault();
      if (info.event.extendedProps.type === 'available') {
        await bookSlot(info);
      }
    },
    dateClick: (info) => {
      if (info.allDay) return;
      API.toast('Please click a highlighted available slot to book.', 'info');
    },
    eventDidMount: (info) => {
      if (info.event.extendedProps.type === 'available') {
        info.el.title = `Available ${API.fmtTime(info.event.extendedProps.datetime)} — click to book`;
      }
    }
  });

  calendar.render();

  doctorSelect.addEventListener('change', () => calendar.refetchEvents());
});
