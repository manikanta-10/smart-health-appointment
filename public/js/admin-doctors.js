document.addEventListener('DOMContentLoaded', () => {
  const user = initLayout('admin', 'doctors');
  if (!user) return;

  const tbody = document.getElementById('doctorsBody');
  const searchInput = document.getElementById('doctorSearch');
  let doctors = [];

  const DURATIONS = [10, 15, 20, 30, 45, 60, 90, 120];

  function doctorModal(doctor) {
    const isEdit = Boolean(doctor);
    const d = doctor || {};
    const durationOptions = DURATIONS.map(
      (m) => `<option value="${m}" ${Number(d.appointment_duration) === m ? 'selected' : ''}>${m} minutes</option>`
    ).join('');

    const { el } = API.openModal(`
      <div class="modal fade" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${isEdit ? 'Edit doctor' : 'Add doctor'}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="doctorForm" novalidate>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Full name</label>
                    <input type="text" class="form-control" id="dName" value="${API.escapeHtml(d.name || '')}" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Email ${isEdit ? '(read only)' : ''}</label>
                    <input type="email" class="form-control" id="dEmail" value="${API.escapeHtml(d.email || '')}" ${isEdit ? 'disabled' : 'required'}>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Phone</label>
                    <input type="tel" class="form-control" id="dPhone" value="${API.escapeHtml(d.phone || '')}" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">${isEdit ? 'New password (optional)' : 'Password'}</label>
                    <input type="password" class="form-control" id="dPassword" ${isEdit ? '' : 'required'} autocomplete="new-password" placeholder="${isEdit ? 'Leave blank to keep current' : 'Min 8 chars, letter + number'}">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Specialisation</label>
                    <input type="text" class="form-control" id="dSpecialization" value="${API.escapeHtml(d.specialization || '')}" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Qualification</label>
                    <input type="text" class="form-control" id="dQualification" value="${API.escapeHtml(d.qualification || '')}">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Experience (years)</label>
                    <input type="number" class="form-control" id="dExperience" min="0" max="70" value="${d.experience ?? 0}">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Consultation fee (₹)</label>
                    <input type="number" class="form-control" id="dFee" min="0" step="1" value="${d.consultation_fee ?? 500}">
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Slot duration</label>
                    <select class="form-select" id="dDuration">${durationOptions}</select>
                  </div>
                  <div class="col-12">
                    <label class="form-label">Bio</label>
                    <textarea class="form-control" id="dBio" rows="3" maxlength="2000">${API.escapeHtml(d.bio || '')}</textarea>
                  </div>
                </div>
              </form>
              <div class="alert alert-info mt-3 mb-0" style="font-size:.78rem;">
                <i class="fa-solid fa-circle-info me-1"></i>${isEdit ? 'Changing slot duration affects future bookable slots. Email cannot be changed here.' : 'New doctors get default working hours Mon-Fri 09:00-17:00 and can adjust them from their availability page.'}
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
              <button class="btn btn-primary" id="saveDoctorBtn"><i class="fa-solid fa-floppy-disk me-2"></i>${isEdit ? 'Save changes' : 'Create doctor'}</button>
            </div>
          </div>
        </div>
      </div>`);

    el.querySelector('#saveDoctorBtn').addEventListener('click', async () => {
      const name = el.querySelector('#dName').value.trim();
      const email = el.querySelector('#dEmail').value.trim();
      const phone = el.querySelector('#dPhone').value.trim();
      const password = el.querySelector('#dPassword').value;
      const specialization = el.querySelector('#dSpecialization').value.trim();
      const experience = Number(el.querySelector('#dExperience').value);
      const fee = Number(el.querySelector('#dFee').value);

      if (name.length < 2) return API.toast('Enter the doctor name.', 'error');
      if (!isEdit && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return API.toast('Enter a valid email.', 'error');
      if (!/^[0-9+\-\s]{10,15}$/.test(phone)) return API.toast('Enter a valid phone number.', 'error');
      if (!isEdit && (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password))) {
        return API.toast('Password must be at least 8 characters with a letter and a number.', 'error');
      }
      if (isEdit && password && (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password))) {
        return API.toast('New password must be at least 8 characters with a letter and a number.', 'error');
      }
      if (specialization.length < 2) return API.toast('Enter the specialisation.', 'error');
      if (!Number.isFinite(experience) || experience < 0 || experience > 70) return API.toast('Experience must be 0-70 years.', 'error');
      if (!Number.isFinite(fee) || fee < 0) return API.toast('Fee must be a positive number.', 'error');

      const payload = {
        name,
        phone,
        specialization,
        qualification: el.querySelector('#dQualification').value.trim(),
        experience,
        consultation_fee: fee,
        appointment_duration: Number(el.querySelector('#dDuration').value),
        bio: el.querySelector('#dBio').value.trim()
      };
      if (isEdit && password) payload.password = password;

      const btn = el.querySelector('#saveDoctorBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
      try {
        let res;
        if (isEdit) {
          res = await API.request(`/admin/doctors/${doctor.id}`, { method: 'PUT', body: payload });
        } else {
          res = await API.request('/admin/doctors', { method: 'POST', body: { ...payload, email, password } });
        }
        API.toast(res.message, 'success', 6000);
        bootstrap.Modal.getInstance(el).hide();
        load();
      } catch (err) {
        API.toast(err.message, 'error', 6000);
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-floppy-disk me-2"></i>${isEdit ? 'Save changes' : 'Create doctor'}`;
      }
    });
  }

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const list = doctors.filter(
      (d) =>
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q)
    );
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7">${API.emptyState('fa-user-doctor', 'No doctors found', q ? 'Try a different search term.' : 'Add your first doctor to get started.')}</td></tr>`;
      return;
    }
    tbody.innerHTML = list
      .map(
        (d) => `<tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              <span class="avatar sm">${API.escapeHtml(API.initials(d.name))}</span>
              <div>
                <div class="fw-semibold">${API.escapeHtml(d.name)}</div>
                <div class="text-muted" style="font-size:.73rem;">${API.escapeHtml(d.email)}</div>
              </div>
            </div>
          </td>
          <td>
            <div>${API.escapeHtml(d.specialization)}</div>
            <div class="text-muted" style="font-size:.73rem;">${API.escapeHtml(d.qualification || '—')}</div>
          </td>
          <td>${d.experience} yr${Number(d.experience) === 1 ? '' : 's'}</td>
          <td>${API.money(d.consultation_fee)}</td>
          <td>${d.appointment_duration} min</td>
          <td>${Number(d.is_active) ? '<span class="badge-status badge-completed">Active</span>' : '<span class="badge-status badge-cancelled">Inactive</span>'}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary" data-edit="${d.id}"><i class="fa-solid fa-pen me-1"></i>Edit</button>
            <button class="btn btn-sm ${Number(d.is_active) ? 'btn-outline-danger' : 'btn-outline-success'}" data-toggle="${d.id}">
              ${Number(d.is_active) ? 'Deactivate' : 'Activate'}
            </button>
          </td>
        </tr>`
      )
      .join('');

    tbody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const doctor = doctors.find((d) => d.id === Number(btn.dataset.edit));
        if (doctor) doctorModal(doctor);
      });
    });
    tbody.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const doctor = doctors.find((d) => d.id === Number(btn.dataset.toggle));
        if (!doctor) return;
        const deactivating = Number(doctor.is_active) === 1;
        const ok = await API.confirmDialog({
          title: deactivating ? 'Deactivate doctor' : 'Activate doctor',
          message: deactivating
            ? `Deactivate ${doctor.name}? They will not be able to log in or accept new bookings. Existing appointments are preserved.`
            : `Activate ${doctor.name}? They will be able to log in and receive bookings again.`,
          confirmText: deactivating ? 'Deactivate' : 'Activate',
          danger: deactivating
        });
        if (!ok) return;
        try {
          const res = await API.request(`/admin/doctors/${doctor.id}/status`, {
            method: 'PUT',
            body: { is_active: !deactivating }
          });
          API.toast(res.message, 'success');
          load();
        } catch (err) {
          API.toast(err.message, 'error');
        }
      });
    });
  }

  async function load() {
    try {
      const res = await API.request('/admin/doctors');
      doctors = res.data.doctors || [];
      render();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7">${API.emptyState('fa-triangle-exclamation', 'Could not load doctors', err.message)}</td></tr>`;
    }
  }

  searchInput.addEventListener('input', render);
  document.getElementById('addDoctorBtn').addEventListener('click', () => doctorModal(null));
  load();
});
