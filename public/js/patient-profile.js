document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('patient', 'profile');
  if (!user) return;

  const nameInput = document.getElementById('name');
  const phoneInput = document.getElementById('phone');
  const emailInput = document.getElementById('email');
  const createdAt = document.getElementById('createdAt');

  function renderHeader(name, email) {
    document.getElementById('profileAvatar').textContent = API.initials(name);
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileMeta').textContent = email;
  }

  try {
    const res = await API.request('/patient/profile');
    const u = res.data.user;
    nameInput.value = u.name;
    phoneInput.value = u.phone;
    emailInput.value = u.email;
    createdAt.value = u.created_at ? API.fmtDate(u.created_at) : '—';
    renderHeader(u.name, `${u.email} · Patient account`);
  } catch (err) {
    API.toast(err.message, 'error');
  }

  document.getElementById('profileForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    if (name.length < 2) return API.toast('Please enter your full name.', 'error');
    if (!/^[0-9+\-\s]{10,15}$/.test(phone)) return API.toast('Please enter a valid phone number.', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return API.toast('Please enter a valid email address.', 'error');

    const btn = document.getElementById('saveProfile');
    const spinner = document.getElementById('saveSpinner');
    btn.disabled = true;
    spinner.classList.remove('d-none');
    try {
      const res = await API.request('/patient/profile', { method: 'PUT', body: { name, phone, email } });
      const u = res.data.user;
      Auth.saveSession(Auth.getToken(), { ...Auth.getUser(), name: u.name, email: u.email, phone: u.phone });
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
