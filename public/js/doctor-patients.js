document.addEventListener('DOMContentLoaded', () => {
  const user = initLayout('doctor', 'patients');
  if (!user) return;

  const tbody = document.getElementById('patientsBody');
  const countEl = document.getElementById('resultCount');

  async function showPatient(patientId) {
    try {
      const res = await API.request(`/doctor/patients/${patientId}`);
      const { patient, appointments } = res.data;
      const rows = appointments
        .map(
          (a) => `<tr>
            <td>${API.fmtDateTime(a.appointment_datetime)}</td>
            <td>${API.statusBadge(a.status)}</td>
            <td class="text-muted">${API.escapeHtml(a.reason || '—')}</td>
          </tr>`
        )
        .join('');
      API.openModal(`
        <div class="modal fade" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Patient details</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <div class="d-flex align-items-center gap-3 mb-3">
                  <span class="avatar lg">${API.escapeHtml(API.initials(patient.name))}</span>
                  <div>
                    <div class="fw-bold" style="font-size:1.02rem;">${API.escapeHtml(patient.name)}</div>
                    <div class="text-muted small">${API.escapeHtml(patient.email)} · ${API.escapeHtml(patient.phone)}</div>
                  </div>
                </div>
                <div class="table-responsive">
                  <table class="table align-middle">
                    <thead><tr><th>Appointment</th><th>Status</th><th>Reason</th></tr></thead>
                    <tbody>${rows}</tbody>
                  </table>
                </div>
              </div>
              <div class="modal-footer"><button class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Close</button></div>
            </div>
          </div>
        </div>`);
    } catch (err) {
      API.toast(err.message, 'error');
    }
  }

  async function load() {
    try {
      const res = await API.request('/doctor/patients');
      const list = res.data.patients || [];
      countEl.textContent = `${list.length} patient${list.length === 1 ? '' : 's'}`;
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6">${API.emptyState('fa-users', 'No patients yet', 'Patients will appear here after their first appointment with you.')}</td></tr>`;
        return;
      }
      tbody.innerHTML = list
        .map(
          (p) => `<tr>
            <td>
              <div class="d-flex align-items-center gap-2">
                <span class="avatar sm">${API.escapeHtml(API.initials(p.name))}</span>
                <span class="fw-semibold">${API.escapeHtml(p.name)}</span>
              </div>
            </td>
            <td>
              <div class="small">${API.escapeHtml(p.phone)}</div>
              <div class="text-muted" style="font-size:.74rem;">${API.escapeHtml(p.email)}</div>
            </td>
            <td><span class="fw-semibold">${p.total_visits}</span> <span class="text-muted small">(${p.completed_visits} completed)</span></td>
            <td class="small">${p.last_visit ? API.fmtDateTime(p.last_visit) : '—'}</td>
            <td class="small">${p.next_visit ? API.fmtDateTime(p.next_visit) : '<span class="text-muted">—</span>'}</td>
            <td class="text-end"><button class="btn btn-sm btn-outline-primary" data-patient="${p.id}"><i class="fa-regular fa-eye me-1"></i>View</button></td>
          </tr>`
        )
        .join('');
      tbody.querySelectorAll('[data-patient]').forEach((btn) => {
        btn.addEventListener('click', () => showPatient(Number(btn.dataset.patient)));
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6">${API.emptyState('fa-triangle-exclamation', 'Could not load patients', err.message)}</td></tr>`;
    }
  }

  load();
});
