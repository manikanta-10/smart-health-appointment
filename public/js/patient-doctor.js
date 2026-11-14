document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('patient', 'doctors');
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const doctorId = Number(params.get('id'));
  const profileCard = document.getElementById('profileCard');
  const dateInput = document.getElementById('dateInput');
  const slotArea = document.getElementById('slotArea');
  const bookingPanel = document.getElementById('bookingPanel');
  const selectedSlotText = document.getElementById('selectedSlotText');
  const reasonInput = document.getElementById('reasonInput');
  const bookBtn = document.getElementById('bookBtn');

  let doctor = null;
  let selectedSlot = null;
  const today = API.todayIso();
  const maxDate = API.addDaysIso(today, 60);

  if (!doctorId) {
    profileCard.innerHTML = API.emptyState('fa-triangle-exclamation', 'Invalid doctor', 'No doctor was selected.');
    slotArea.innerHTML = API.emptyState('fa-calendar-xmark', 'Nothing to book', 'Go back and choose a doctor.');
    return;
  }

  dateInput.min = today;
  dateInput.max = maxDate;
  dateInput.value = today;

  function setSelected(slot) {
    selectedSlot = slot;
    document.querySelectorAll('.slot-btn').forEach((b) => b.classList.remove('selected'));
    if (!slot) {
      bookingPanel.classList.add('d-none');
      return;
    }
    const btn = document.querySelector(`.slot-btn[data-datetime="${slot.datetime}"]`);
    if (btn) btn.classList.add('selected');
    selectedSlotText.innerHTML = `<strong>${API.fmtDate(slot.datetime)}</strong> · ${API.fmtTime(slot.datetime)} - ${API.fmtTime(slot.end ? `${slot.datetime.slice(0, 11)}${slot.end}` : slot.datetime)} with <strong>${API.escapeHtml(doctor.name)}</strong>`;
    bookingPanel.classList.remove('d-none');
    reasonInput.focus();
  }

  async function loadSlots(date) {
    selectedSlot = null;
    bookingPanel.classList.add('d-none');
    API.setLoading(slotArea, 'Loading available slots...');
    try {
      const res = await API.request(`/doctors/${doctorId}/slots?date=${encodeURIComponent(date)}`);
      const slots = res.data.slots || [];
      if (!slots.length) {
        slotArea.innerHTML = `
          <div class="empty-state">
            <i class="fa-regular fa-calendar-xmark"></i>
            <h6>No free slots on ${API.fmtDate(date)}</h6>
            <p>Try another date or use “Next available”.</p>
          </div>`;
        return;
      }
      slotArea.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div class="small fw-semibold text-muted">${slots.length} free slot${slots.length === 1 ? '' : 's'} on ${API.fmtDate(date)}</div>
          <div class="small text-muted"><span class="legend-dot" style="background:#0f9b8e;"></span>Available</div>
        </div>
        <div class="slot-grid">
          ${slots.map((s) => `<button type="button" class="slot-btn" data-datetime="${s.datetime}">${s.start}</button>`).join('')}
        </div>`;
      slotArea.querySelectorAll('.slot-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const slot = slots.find((s) => s.datetime === btn.dataset.datetime);
          setSelected(slot);
        });
      });
    } catch (err) {
      slotArea.innerHTML = API.emptyState('fa-triangle-exclamation', 'Could not load slots', err.message);
    }
  }

  document.getElementById('prevDay').addEventListener('click', () => {
    const next = API.addDaysIso(dateInput.value || today, -1);
    if (next < today) return;
    dateInput.value = next;
    loadSlots(next);
  });
  document.getElementById('nextDay').addEventListener('click', () => {
    const next = API.addDaysIso(dateInput.value || today, 1);
    if (next > maxDate) return;
    dateInput.value = next;
    loadSlots(next);
  });
  dateInput.addEventListener('change', () => loadSlots(dateInput.value));
  document.getElementById('findNext').addEventListener('click', async () => {
    const btn = document.getElementById('findNext');
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Searching...';
    try {
      let found = null;
      for (let i = 0; i <= 21; i += 1) {
        const date = API.addDaysIso(today, i);
        const res = await API.request(`/doctors/${doctorId}/slots?date=${encodeURIComponent(date)}`);
        if ((res.data.slots || []).length) {
          found = date;
          break;
        }
      }
      if (found) {
        dateInput.value = found;
        await loadSlots(found);
        API.toast(`Next available date: ${API.fmtDate(found)}`, 'success');
      } else {
        API.toast('No free slots found in the next 3 weeks. Please try another doctor.', 'warning');
      }
    } catch (err) {
      API.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });

  bookBtn.addEventListener('click', async () => {
    if (!selectedSlot) return;
    const ok = await API.confirmDialog({
      title: 'Confirm appointment',
      message: `Book ${API.fmtDate(selectedSlot.datetime)} at ${API.fmtTime(selectedSlot.datetime)} with ${doctor.name}? Consultation fee: ${API.money(doctor.consultation_fee)}.`,
      confirmText: 'Book appointment'
    });
    if (!ok) return;

    bookBtn.disabled = true;
    const original = bookBtn.innerHTML;
    bookBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Booking...';
    try {
      const res = await API.request('/appointments', {
        method: 'POST',
        body: {
          doctor_id: doctorId,
          appointment_datetime: selectedSlot.datetime,
          reason: reasonInput.value.trim()
        }
      });
      API.toast(res.message, res.data.sms && res.data.sms.status === 'simulated' ? 'warning' : 'success', 6000);
      setTimeout(() => { window.location.href = '/patient/appointments.html'; }, 1200);
    } catch (err) {
      API.toast(err.message, 'error', 6000);
      bookBtn.disabled = false;
      bookBtn.innerHTML = original;
      if (err.status === 409) loadSlots(dateInput.value);
    }
  });

  try {
    const res = await API.request(`/doctors/${doctorId}`, { auth: false });
    doctor = res.data.doctor;
    document.title = `${doctor.name} · Smart Health`;
    profileCard.innerHTML = `
      <div class="card-body">
        <div class="d-flex align-items-center gap-3 mb-3">
          <div class="doctor-avatar" style="width:64px;height:64px;font-size:1.35rem;border-radius:18px;">${API.escapeHtml(API.initials(doctor.name))}</div>
          <div>
            <h3 class="h5 mb-1">${API.escapeHtml(doctor.name)}</h3>
            <span class="spec-tag">${API.escapeHtml(doctor.specialization)}</span>
          </div>
        </div>
        <p class="text-muted" style="font-size:.85rem;">${API.escapeHtml(doctor.bio || 'Experienced specialist committed to patient-centred care.')}</p>
        <ul class="info-list">
          <li><i class="fa-solid fa-graduation-cap"></i><div><strong>Qualification</strong><br>${API.escapeHtml(doctor.qualification || '—')}</div></li>
          <li><i class="fa-solid fa-briefcase"></i><div><strong>Experience</strong><br>${doctor.experience} years</div></li>
          <li><i class="fa-solid fa-clock"></i><div><strong>Consultation duration</strong><br>${doctor.appointment_duration} minutes</div></li>
          <li><i class="fa-solid fa-indian-rupee-sign"></i><div><strong>Consultation fee</strong><br>${API.money(doctor.consultation_fee)}</div></li>
          <li><i class="fa-solid fa-phone"></i><div><strong>Clinic phone</strong><br>${API.escapeHtml(doctor.phone)}</div></li>
          <li><i class="fa-regular fa-envelope"></i><div><strong>Email</strong><br>${API.escapeHtml(doctor.email)}</div></li>
        </ul>
        <div class="alert alert-success mt-3 mb-0 py-2" style="font-size:.78rem;">
          <i class="fa-solid fa-comment-sms me-1"></i>Demo mode: SMS confirmation is simulated and not delivered.
        </div>
      </div>`;
    loadSlots(today);
  } catch (err) {
    profileCard.innerHTML = API.emptyState('fa-triangle-exclamation', 'Doctor not found', err.message);
    slotArea.innerHTML = API.emptyState('fa-calendar-xmark', 'Booking unavailable', 'Please choose another doctor.');
  }
});
