document.addEventListener('DOMContentLoaded', () => {
  const user = Auth.getUser();
  if (user && Auth.getToken()) {
    Auth.redirectByRole(user);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('expired')) {
    document.getElementById('loginAlert').innerHTML =
      `<div class="alert alert-warning py-2"><i class="fa-solid fa-triangle-exclamation me-2"></i>Your session expired. Please sign in again.</div>`;
  }

  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const btn = document.getElementById('loginBtn');
  const spinner = document.getElementById('loginSpinner');
  const btnText = document.getElementById('loginBtnText');
  const alertBox = document.getElementById('loginAlert');

  document.getElementById('togglePassword').addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    document.getElementById('togglePassword').innerHTML = `<i class="fa-regular ${isPassword ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
  });

  document.querySelectorAll('.demo-fill').forEach((button) => {
    button.addEventListener('click', () => {
      emailInput.value = button.dataset.email;
      passwordInput.value = button.dataset.password;
      emailInput.focus();
    });
  });

  function showError(message) {
    alertBox.innerHTML = `<div class="alert alert-danger py-2"><i class="fa-solid fa-circle-exclamation me-2"></i>${API.escapeHtml(message)}</div>`;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    alertBox.innerHTML = '';
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError('Please enter both email and password.');
      return;
    }

    btn.disabled = true;
    spinner.classList.remove('d-none');
    btnText.textContent = 'Signing in...';

    try {
      const res = await API.request('/auth/login', {
        method: 'POST',
        auth: false,
        body: { email, password }
      });
      Auth.saveSession(res.data.token, res.data.user);
      API.toast(`Welcome back, ${res.data.user.name.split(' ')[0]}!`, 'success', 1500);
      setTimeout(() => Auth.redirectByRole(res.data.user), 450);
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      spinner.classList.add('d-none');
      btnText.textContent = 'Sign in';
    }
  });
});
