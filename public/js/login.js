const form = document.getElementById('loginForm');
const errorBox = document.getElementById('loginError');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.style.display = 'none';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.error || 'Could not sign in.';
      errorBox.style.display = 'block';
      return;
    }

    window.location.href = '/index.html';
  } catch (err) {
    errorBox.textContent = 'Could not reach the server. Check your connection and try again.';
    errorBox.style.display = 'block';
  }
});
