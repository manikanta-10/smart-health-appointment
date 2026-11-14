document.addEventListener('DOMContentLoaded', async () => {
  const user = initLayout('admin', 'profile');
  if (!user) return;

  try {
    const res = await API.request('/auth/me');
    const u = res.data.user;
    document.getElementById('adminName').value = u.name;
    document.getElementById('adminEmail').value = u.email;
    document.getElementById('adminPhone').value = u.phone;
    document.getElementById('profileName').textContent = u.name;
    document.getElementById('profileAvatar').textContent = API.initials(u.name);
  } catch (err) {
    API.toast(err.message, 'error');
  }

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
