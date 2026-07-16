export async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  
  if (res.status === 401) {
    window.location.href = '/login.html'; // Fallback to vanilla login if not migrating auth yet
    throw new Error('Not signed in');
  }
  
  const data = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }
  
  return data;
}
