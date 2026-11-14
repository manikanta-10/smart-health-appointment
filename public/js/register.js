document.addEventListener('DOMContentLoaded', () => {
  if (Auth.getUser() && Auth.getToken()) {
    Auth.redirectByRole(Auth.getUser());
    return;
  }

  const form = document.getElementById('registerForm');
  const alertBox = document.getElementById('registerAlert');
  const btn = document.getElementById('registerBtn');
  const spinner = document.getElementById('registerSpinner');
  const btnText = document.getElementById('registerBtnText');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirmPassword');

  document.getElementById('togglePassword').addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    document.getElementById('togglePassword').innerHTML = `<i class="fa-regular ${isPassword ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
  });

  function showError(message) {
    alertBox.innerHTML = `<div class="alert alert-danger py-2"><i class="fa-solid fa-circle-exclamation me-2"></i>${API.escapeHtml(message)}</div>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    alertBox.innerHTML = '';

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    if (name.length < 2) return showError('Please enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Please enter a valid email address.');
    if (!/^[0-9+\-\s]{10,15}$/.test(phone)) return showError('Please enter a valid phone number (10-15 digits).');
    if (password.length < 8) return showError('Password must be at least 8 characters long.');
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return showError('Password must contain at least one letter and one number.');
    if (password !== confirm) return showError('Passwords do not match.');

    btn.disabled = true;
    spinner.classList.remove('d-none');
    btnText.textContent = 'Creating account...';

    try {
      const res = await API.request('/auth/register', {
        method: 'POST',
        auth: false,
        body: { name, email, phone, password }
      });
      Auth.saveSession(res.data.token, res.data.user);
      API.toast('Account created successfully!', 'success');
      setTimeout(() => { window.location.href = '/patient/dashboard.html'; }, 500);
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      spinner.classList.add('d-none');
      btnText.textContent = 'Create account';
    }
  });
});
