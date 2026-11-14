/* Shared doctor appointment detail modal + status actions */
(function () {
  async function openAppointment(appointmentId, onChange) {
    let appointment;
    try {
      const res = await API.request(`/doctor/appointments/${appointmentId}`);
      appointment = res.data.appointment;
    } catch (err) {
      API.toast(err.message, 'error');
      return;
    }

    const a = appointment;
    const actionButtons = [];
    if (a.status === 'booked') {
      actionButtons.push(`<button class="btn btn-teal btn-sm" data-action="confirmed"><i class="fa-solid fa-check me-1"></i>Confirm</button>`);
      actionButtons.push(`<button class="btn btn-outline-danger btn-sm" data-action="cancelled"><i class="fa-solid fa-ban me-1"></i>Cancel</button>`);
    } else if (a.status === 'confirmed') {
      actionButtons.push(`<button class="btn btn-primary btn-sm" data-action="completed"><i class="fa-solid fa-circle-check me-1"></i>Mark completed</button>`);
      actionButtons.push(`<button class="btn btn-outline-danger btn-sm" data-action="cancelled"><i class="fa-solid fa-ban me-1"></i>Cancel</button>`);
    }

    const { modal, el } = API.openModal(`
      <div class="modal fade" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Appointment details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                <div>
                  <div class="fw-bold" style="font-size:1.02rem;">${API.escapeHtml(a.patient_name)}</div>
                  <div class="text-muted small">${API.escapeHtml(a.patient_phone)} · ${API.escapeHtml(a.patient_email)}</div>
                </div>
                ${API.statusBadge(a.status)}
              </div>
              <div class="row g-3">
                <div class="col-md-6">
                  <div class="p-3 rounded-3 h-100" style="background:#f8fbff;border:1px solid #e2ecf7;">
                    <div class="small text-muted fw-semibold text-uppercase mb-2" style="letter-spacing:.06em;">Schedule</div>
                    <div class="small mb-1"><i class="fa-regular fa-calendar me-2 text-primary"></i>${API.fmtDate(a.appointment_datetime)}</div>
                    <div class="small mb-1"><i class="fa-regular fa-clock me-2 text-primary"></i>${API.fmtTime(a.appointment_datetime)} - ${API.fmtTime(a.appointment_end_datetime)}</div>
                    <div class="small"><i class="fa-solid fa-indian-rupee-sign me-2 text-primary"></i>${API.money(a.consultation_fee)} consultation fee</div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="p-3 rounded-3 h-100" style="background:#f8fbff;border:1px solid #e2ecf7;">
                    <div class="small text-muted fw-semibold text-uppercase mb-2" style="letter-spacing:.06em;">Reason for visit</div>
                    <div class="small">${API.escapeHtml(a.reason || 'No reason provided')}</div>
                    <div class="small text-muted mt-2">Booked on ${API.fmtDate(a.created_at)}</div>
                  </div>
                </div>
              </div>
              <div class="alert alert-info mt-3 mb-0 py-2" style="font-size:.78rem;">
                <i class="fa-solid fa-circle-info me-1"></i>Only you can view this appointment. Patient contact details are shared for consultation purposes only.
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Close</button>
              ${actionButtons.join('')}
            </div>
          </div>
        </div>
      </div>`);

    el.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const status = btn.dataset.action;
        let reason;
        if (status === 'cancelled') {
          reason = await API.promptDialog({
            title: 'Cancel appointment',
            message: `Cancel the appointment with ${a.patient_name} on ${API.fmtDateTime(a.appointment_datetime)}?`,
            placeholder: 'Reason for cancellation (optional)',
            confirmText: 'Cancel appointment',
            danger: true
          });
          if (reason === null) return;
        } else {
          const labels = { confirmed: 'Confirm this appointment?', completed: 'Mark this appointment as completed?' };
          const ok = await API.confirmDialog({ title: 'Update appointment', message: labels[status], confirmText: 'Yes, continue' });
          if (!ok) return;
        }

        btn.disabled = true;
        try {
          const res = await API.request(`/doctor/appointments/${a.id}/status`, {
            method: 'PATCH',
            body: { status, reason }
          });
          API.toast(res.message, 'success');
          modal.hide();
          if (onChange) onChange();
        } catch (err) {
          API.toast(err.message, 'error', 6000);
          btn.disabled = false;
        }
      });
    });
  }

  window.openDoctorAppointment = openAppointment;
})();
