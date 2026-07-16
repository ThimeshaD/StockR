const form = document.getElementById('loginForm');
const errorBox = document.getElementById('loginError');
const successBox = document.getElementById('loginSuccess');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.style.display = 'none';
  successBox.style.display = 'none';

  const email = document.getElementById('email').value.trim().toLowerCase();

  if (!/^[^\s@]+@attune-integrations\.com$/.test(email)) {
    errorBox.textContent = 'Please use your @attune-integrations.com email address.';
    errorBox.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  try {
    const res = await fetch('/api/auth/request-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.error || 'Could not send the sign-in link.';
      errorBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Email me a sign-in link';
      return;
    }

    successBox.innerHTML = '<strong>Check your inbox.</strong><br>' +
      (data.message || 'A sign-in link is on its way. It expires in 15 minutes.');
    successBox.style.display = 'block';
    form.style.display = 'none';
  } catch (err) {
    errorBox.textContent = 'Could not reach the server. Check your connection and try again.';
    errorBox.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Email me a sign-in link';
  }
});
