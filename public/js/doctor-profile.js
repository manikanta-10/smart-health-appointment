document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('doctor', 'profile');
  if (!user) return;

  function renderHeader(name, spec) {
    document.getElementById('profileAvatar').textContent = API.initials(name);
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileMeta').textContent = `${spec} · Doctor account`;
  }

  try {
    const res = await API.request('/doctor/profile');
    const d = res.data.doctor;
    document.getElementById('name').value = d.name;
    document.getElementById('phone').value = d.phone;
    document.getElementById('email').value = d.email;
    document.getElementById('specialization').value = d.specialization;
    document.getElementById('qualification').value = d.qualification || '';
    document.getElementById('experience').value = d.experience;
    document.getElementById('fee').value = d.consultation_fee;
    document.getElementById('duration').value = String(d.appointment_duration);
    document.getElementById('bio').value = d.bio || '';
    renderHeader(d.name, d.specialization);
  } catch (err) {
    API.toast(err.message, 'error');
  }

  document.getElementById('profileForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const specialization = document.getElementById('specialization').value.trim();
    const experience = Number(document.getElementById('experience').value);
    const fee = Number(document.getElementById('fee').value);
    if (name.length < 2) return API.toast('Please enter your full name.', 'error');
    if (!/^[0-9+\-\s]{10,15}$/.test(phone)) return API.toast('Please enter a valid phone number.', 'error');
    if (specialization.length < 2) return API.toast('Please enter your specialisation.', 'error');
    if (!Number.isFinite(experience) || experience < 0 || experience > 70) return API.toast('Experience must be between 0 and 70 years.', 'error');
    if (!Number.isFinite(fee) || fee < 0) return API.toast('Consultation fee must be a positive number.', 'error');

    const btn = document.getElementById('saveProfile');
    const spinner = document.getElementById('saveSpinner');
    btn.disabled = true;
    spinner.classList.remove('d-none');
    try {
      const res = await API.request('/doctor/profile', {
        method: 'PUT',
        body: {
          name,
          phone,
          specialization,
          qualification: document.getElementById('qualification').value.trim(),
          experience,
          consultation_fee: fee,
          appointment_duration: Number(document.getElementById('duration').value),
          bio: document.getElementById('bio').value.trim()
        }
      });
      const d = res.data.doctor;
      Auth.saveSession(Auth.getToken(), { ...Auth.getUser(), name: d.name, phone: d.phone });
      API.toast(res.message, 'success');
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      API.toast(err.message, 'error', 6000);
      btn.disabled = false;
      spinner.classList.add('d-none');
    }
  });

  document.getElementById('passwordForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const next = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmNewPassword').value;
    if (!current) return API.toast('Enter your current password.', 'error');
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) {
      return API.toast('New password must be at least 8 characters with a letter and a number.', 'error');
    }
    if (next !== confirm) return API.toast('New passwords do not match.', 'error');

    const btn = document.getElementById('savePassword');
    const spinner = document.getElementById('passwordSpinner');
    btn.disabled = true;
    spinner.classList.remove('d-none');
    try {
      const res = await API.request('/auth/password', {
        method: 'PUT',
        body: { current_password: current, new_password: next }
      });
      API.toast(res.message, 'success');
      document.getElementById('passwordForm').reset();
    } catch (err) {
      API.toast(err.message, 'error', 6000);
    } finally {
      btn.disabled = false;
      spinner.classList.add('d-none');
    }
  });
});
