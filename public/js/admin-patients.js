document.addEventListener('DOMContentLoaded', () => {
  const user = initLayout('admin', 'patients');
  if (!user) return;

  const tbody = document.getElementById('patientsBody');
  const searchInput = document.getElementById('patientSearch');
  const countEl = document.getElementById('resultCount');
  let patients = [];

  function render() {
    countEl.textContent = `${patients.length} patient${patients.length === 1 ? '' : 's'}`;
    if (!patients.length) {
      tbody.innerHTML = `<tr><td colspan="8">${API.emptyState('fa-users', 'No patients found', searchInput.value ? 'Try a different search term.' : 'Patients appear here after registering.')}</td></tr>`;
      return;
    }
    tbody.innerHTML = patients
      .map(
        (p) => `<tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              <span class="avatar sm">${API.escapeHtml(API.initials(p.name))}</span>
              <div>
                <div class="fw-semibold">${API.escapeHtml(p.name)}</div>
                <div class="text-muted" style="font-size:.73rem;">#${p.id}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="small">${API.escapeHtml(p.phone)}</div>
            <div class="text-muted" style="font-size:.73rem;">${API.escapeHtml(p.email)}</div>
          </td>
          <td class="fw-semibold">${p.total_appointments}</td>
          <td>${p.completed_appointments}</td>
          <td class="small">${p.last_appointment ? API.fmtDateTime(p.last_appointment) : '—'}</td>
          <td class="small">${API.fmtDate(p.created_at)}</td>
          <td>${Number(p.is_active) ? '<span class="badge-status badge-completed">Active</span>' : '<span class="badge-status badge-cancelled">Inactive</span>'}</td>
          <td class="text-end">
            <button class="btn btn-sm ${Number(p.is_active) ? 'btn-outline-danger' : 'btn-outline-success'}" data-toggle="${p.id}">
              ${Number(p.is_active) ? 'Deactivate' : 'Activate'}
            </button>
          </td>
        </tr>`
      )
      .join('');

    tbody.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const patient = patients.find((p) => p.id === Number(btn.dataset.toggle));
        if (!patient) return;
        const deactivating = Number(patient.is_active) === 1;
        const ok = await API.confirmDialog({
          title: deactivating ? 'Deactivate patient' : 'Activate patient',
          message: deactivating
            ? `Deactivate ${patient.name}? They will not be able to log in or book appointments. Existing records are preserved.`
            : `Activate ${patient.name}? They will be able to log in and book appointments again.`,
          confirmText: deactivating ? 'Deactivate' : 'Activate',
          danger: deactivating
        });
        if (!ok) return;
        try {
          const res = await API.request(`/admin/patients/${patient.id}/status`, {
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
      const q = searchInput.value.trim();
      const res = await API.request(`/admin/patients${API.qs({ q })}`);
      patients = res.data.patients || [];
      render();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8">${API.emptyState('fa-triangle-exclamation', 'Could not load patients', err.message)}</td></tr>`;
    }
  }

  searchInput.addEventListener('input', API.debounce(load, 350));
  load();
});
