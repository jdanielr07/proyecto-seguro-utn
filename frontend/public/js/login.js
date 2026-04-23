'use strict';

document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errBox = document.getElementById('login-error');
  errBox.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Ingresando...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      window.location.reload();
    } else {
      errBox.textContent = data.error || 'Credenciales inválidas.';
      errBox.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Iniciar Sesión';
    }
  } catch {
    errBox.textContent = 'No se pudo conectar al servidor.';
    errBox.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Iniciar Sesión';
  }
});
