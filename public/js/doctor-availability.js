document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('doctor', 'availability');
  if (!user) return;

  const DAYS = [
    { idx: 1, name: 'Monday' },
    { idx: 2, name: 'Tuesday' },
    { idx: 3, name: 'Wednesday' },
    { idx: 4, name: 'Thursday' },
    { idx: 5, name: 'Friday' },
    { idx: 6, name: 'Saturday' },
    { idx: 0, name: 'Sunday' }
  ];

  const scheduleEl = document.getElementById('schedule');
  const durationSelect = document.getElementById('durationSelect');
  const state = {};
  DAYS.forEach((d) => { state[d.idx] = { enabled: false, ranges: [] }; });

  function buildState(availability, duration) {
    DAYS.forEach((d) => { state[d.idx] = { enabled: false, ranges: [] }; });
    availability.forEach((row) => {
      const day = Number(row.day_of_week);
      if (!state[day]) return;
      state[day].enabled = Number(row.is_available) === 1;
      state[day].ranges.push({
        start: String(row.start_time).slice(0, 5),
        end: String(row.end_time).slice(0, 5)
      });
    });
    durationSelect.value = String(duration || 30);
  }

  function render() {
    scheduleEl.innerHTML = DAYS.map((d) => {
      const day = state[d.idx];
      const rangeRows = day.ranges
        .map(
          (r, i) => `
          <div class="d-flex align-items-center gap-2 mb-2 range-row">
            <input type="time" class="form-control form-control-sm range-start" value="${r.start}" style="max-width:130px;" ${day.enabled ? '' : 'disabled'}>
            <span class="text-muted small">to</span>
            <input type="time" class="form-control form-control-sm range-end" value="${r.end}" style="max-width:130px;" ${day.enabled ? '' : 'disabled'}>
            <button type="button" class="btn btn-sm btn-outline-danger remove-range" data-range="${i}" ${day.enabled ? '' : 'disabled'} title="Remove range"><i class="fa-solid fa-xmark"></i></button>
          </div>`
        )
        .join('');
      return `
        <div class="day-row flex-column align-items-stretch" data-day="${d.idx}">
          <div class="d-flex flex-wrap align-items-center gap-3">
            <div class="day-name">${d.name}</div>
            <div class="form-check form-switch mb-0">
              <input class="form-check-input day-toggle" type="checkbox" ${day.enabled ? 'checked' : ''}>
              <label class="form-check-label small text-muted">${day.enabled ? 'Working' : 'Off'}</label>
            </div>
            <button type="button" class="btn btn-sm btn-outline-primary add-range" ${day.enabled ? '' : 'disabled'}>
              <i class="fa-solid fa-plus me-1"></i>Add time range
            </button>
            <span class="small text-muted ms-auto">${day.enabled ? `${day.ranges.length} range${day.ranges.length === 1 ? '' : 's'}` : ''}</span>
          </div>
          <div class="ms-0 ms-md-5 mt-2">
            ${day.enabled && day.ranges.length ? rangeRows : `<div class="small text-muted">${day.enabled ? 'No time ranges — add one to make this day bookable.' : 'Not available for appointments.'}</div>`}
          </div>
        </div>`;
    }).join('');
  }

  function syncFromDom() {
    scheduleEl.querySelectorAll('.day-row').forEach((row) => {
      const day = Number(row.dataset.day);
      const enabled = row.querySelector('.day-toggle').checked;
      const ranges = [];
      row.querySelectorAll('.range-row').forEach((r) => {
        ranges.push({
          start: r.querySelector('.range-start').value,
          end: r.querySelector('.range-end').value
        });
      });
      state[day].enabled = enabled;
      state[day].ranges = ranges;
    });
  }

  async function load() {
    API.setLoading(scheduleEl, 'Loading schedule...');
    try {
      const res = await API.request('/doctor/profile');
      buildState(res.data.availability, res.data.doctor.appointment_duration);
      render();
    } catch (err) {
      scheduleEl.innerHTML = API.emptyState('fa-triangle-exclamation', 'Could not load availability', err.message);
    }
  }

  scheduleEl.addEventListener('change', (event) => {
    if (event.target.classList.contains('day-toggle')) {
      syncFromDom();
      render();
    }
  });

  scheduleEl.addEventListener('click', (event) => {
    const addBtn = event.target.closest('.add-range');
    const removeBtn = event.target.closest('.remove-range');
    if (addBtn) {
      syncFromDom();
      const day = Number(addBtn.closest('.day-row').dataset.day);
      state[day].ranges.push({ start: '09:00', end: '13:00' });
      render();
    } else if (removeBtn) {
      syncFromDom();
      const day = Number(removeBtn.closest('.day-row').dataset.day);
      state[day].ranges.splice(Number(removeBtn.dataset.range), 1);
      render();
    }
  });

  document.getElementById('copyMonday').addEventListener('click', () => {
    syncFromDom();
    const monday = state[1];
    if (!monday.enabled || !monday.ranges.length) {
      API.toast('Set Monday working hours first.', 'warning');
      return;
    }
    [2, 3, 4, 5].forEach((day) => {
      state[day] = { enabled: true, ranges: monday.ranges.map((r) => ({ ...r })) };
    });
    render();
    API.toast('Monday hours copied to Tuesday-Friday.', 'success');
  });

  document.getElementById('clearAll').addEventListener('click', async () => {
    const ok = await API.confirmDialog({
      title: 'Clear working hours',
      message: 'This will disable all working days. Patients will not be able to book any slots until you set availability again.',
      confirmText: 'Clear all',
      danger: true
    });
    if (!ok) return;
    DAYS.forEach((d) => { state[d.idx] = { enabled: false, ranges: [] }; });
    render();
  });

  document.getElementById('saveAvailability').addEventListener('click', async () => {
    syncFromDom();
    const ranges = [];
    let error = null;

    DAYS.forEach((d) => {
      const day = state[d.idx];
      if (!day.enabled) return;
      day.ranges.forEach((r) => {
        if (!r.start || !r.end) {
          error = `Please provide both start and end time for ${d.name}.`;
          return;
        }
        if (r.start >= r.end) {
          error = `End time must be after start time for ${d.name}.`;
          return;
        }
        ranges.push({ day_of_week: d.idx, start_time: `${r.start}:00`, end_time: `${r.end}:00`, is_available: true });
      });
    });

    if (error) {
      API.toast(error, 'error');
      return;
    }
    if (!ranges.length) {
      const ok = await API.confirmDialog({
        title: 'No working hours',
        message: 'You have not set any working hours. Save anyway? Patients will not be able to book appointments.',
        confirmText: 'Save anyway',
        danger: true
      });
      if (!ok) return;
    }

    const btn = document.getElementById('saveAvailability');
    const spinner = document.getElementById('saveSpinner');
    btn.disabled = true;
    spinner.classList.remove('d-none');
    try {
      const res = await API.request('/doctor/availability', {
        method: 'PUT',
        body: { ranges, appointment_duration: Number(durationSelect.value) }
      });
      API.toast(res.message, 'success');
      buildState(res.data.availability, durationSelect.value);
      render();
    } catch (err) {
      API.toast(err.message, 'error', 6000);
    } finally {
      btn.disabled = false;
      spinner.classList.add('d-none');
    }
  });

  load();
});
