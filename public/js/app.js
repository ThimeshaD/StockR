// app.js — main application logic for the Stockroom SPA.

const state = {
  user: null,
  items: [],          // items for current device view
  allItems: [],       // all items (for dashboard)
  currentView: 'dashboard',
  editingItem: null,
  pendingDelete: null,
};

const CATEGORY_LABELS = {
  table_unit: 'Table Unit',
  counter_unit: 'Counter Unit',
};

// ---------- small helpers ----------

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatQty(n) {
  const num = Number(n);
  return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, '');
}

let toastTimer = null;
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  
  const baseClasses = 'fixed bottom-6 right-6 px-5 py-3.5 rounded-lg text-[14px] font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.15)] z-[100] transform transition-transform duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]';
  
  if (isError) {
    toast.className = `${baseClasses} bg-red text-white translate-y-0`;
  } else {
    toast.className = `${baseClasses} bg-graphite text-white translate-y-0`;
  }
  
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { 
    toast.className = toast.className.replace('translate-y-0', 'translate-y-[150%]');
  }, 3500);
}

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = '/login.html';
    throw new Error('Not signed in');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }
  return data;
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
});
document.querySelectorAll('.overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

// ---------- auth / session ----------

async function loadSession() {
  try {
    const user = await api('/auth/me');
    state.user = user;
    document.getElementById('sidebarUser').textContent = user.displayName || user.username;
    document.getElementById('sidebarRole').textContent = user.role;
  } catch (err) {
    // api() already redirects on 401
  }
}

document.getElementById('signOutBtn').addEventListener('click', async () => {
  await api('/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

// ---------- navigation ----------

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function switchView(view) {
  state.currentView = view;
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((v) => { v.style.display = 'none'; });
  document.getElementById('view-' + view).style.display = 'block';

  if (view === 'dashboard') loadDashboard();
  if (view === 'table_unit') loadDeviceView('table_unit');
  if (view === 'counter_unit') loadDeviceView('counter_unit');
}

// ---------- shared rendering helpers ----------

function orderBadgeHtml(qtyToOrder) {
  if (qtyToOrder > 0) {
    return `<span class="bg-amber-bg text-amber px-2.5 py-[3px] rounded-md text-[12.5px] font-bold">${formatQty(qtyToOrder)}</span>`;
  }
  return `<span class="bg-green-bg text-green px-2.5 py-[3px] rounded-md text-[12.5px] font-bold">None</span>`;
}

function linkHtml(url) {
  if (!url) return '<span class="text-muted">—</span>';
  
  let href = url.trim();
  const isWebLink = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('www.');
  
  if (isWebLink) {
    if (href.startsWith('www.')) href = 'https://' + href;
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener" class="text-teal-dark font-semibold hover:underline" title="${escapeHtml(url)}">Open ↗</a>`;
  }
  
  return `<span title="${escapeHtml(url)}" class="text-[11.5px] text-muted max-w-[140px] inline-block whitespace-nowrap overflow-hidden text-ellipsis align-middle">${escapeHtml(url)}</span>`;
}

function renderItemRows(items, includeActions = false) {
  let prevSub = null;
  return items.map((item) => {
    const isNewGroup = prevSub !== null && prevSub !== item.subcategory;
    prevSub = item.subcategory;
    
    let html = '';
    if (isNewGroup) {
      html += `<tr style="background: #e2e8f0;"><td colspan="8" style="height: 4px; padding: 0; border: none;"></td></tr>`;
    }
    
    html += `
    <tr class="hover:bg-[#FAFAF8] group">
      <td class="py-[14px] px-4 border-b border-border text-muted text-[13px] font-semibold">${escapeHtml(item.subcategory)}</td>
      <td class="py-[14px] px-4 border-b border-border font-medium text-ink">${escapeHtml(item.name)}</td>
      <td class="py-[14px] px-4 border-b border-border text-[13.5px] font-mono">${formatQty(item.qty_per_device)}</td>
      <td class="py-[14px] px-4 border-b border-border text-[13.5px] font-mono">${formatQty(item.availability)}</td>
      <td class="py-[14px] px-4 border-b border-border text-[13.5px] font-mono">${formatQty(item.devices)}</td>
      <td class="py-[14px] px-4 border-b border-border">${orderBadgeHtml(item.qty_to_order)}</td>
      <td class="py-[14px] px-4 border-b border-border">${linkHtml(item.link)}</td>
      ${includeActions ? `
      <td class="py-[14px] px-4 border-b border-border text-right w-[140px]">
        <div class="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="bg-surface border border-border text-ink px-2.5 py-1.5 rounded-md text-[12.5px] font-semibold hover:bg-[#EFEFEC] cursor-pointer" data-action="edit" data-id="${item.id}">Edit</button>
          <button class="bg-surface border border-red text-red px-2.5 py-1.5 rounded-md text-[12.5px] font-semibold hover:bg-red-bg cursor-pointer" data-action="delete" data-id="${item.id}">Delete</button>
        </div>
      </td>` : ''}
    </tr>`;
    return html;
  }).join('');
}

// ---------- dashboard ----------

async function loadDashboard() {
  const summary = await api('/dashboard/summary');
  const all = summary.all;

  // Overall stats
  document.getElementById('statTotal').textContent = all.totalItems;
  document.getElementById('statAvailable').textContent = all.totalAvailability;
  document.getElementById('statNeedOrder').textContent = all.itemsNeedingOrder;
  document.getElementById('statTotalOrder').textContent = all.totalToOrder;

  // Per-device stats in header
  document.getElementById('dashTableItems').textContent = summary.table_unit.totalItems;
  document.getElementById('dashTableOrder').textContent = summary.table_unit.totalToOrder;
  document.getElementById('dashCounterItems').textContent = summary.counter_unit.totalItems;
  document.getElementById('dashCounterOrder').textContent = summary.counter_unit.totalToOrder;

  // Update sidebar badges
  document.getElementById('badgeTable').textContent = summary.table_unit.totalItems;
  document.getElementById('badgeTable').className = summary.table_unit.totalItems === 0 
    ? 'nav-badge bg-graphite-3 text-[#8A909B] font-bold rounded-full px-[7px] py-[1px] min-w-[18px] text-center text-[12px]'
    : 'nav-badge bg-teal text-white font-bold rounded-full px-[7px] py-[1px] min-w-[18px] text-center text-[12px]';

  document.getElementById('badgeCounter').textContent = summary.counter_unit.totalItems;
  document.getElementById('badgeCounter').className = summary.counter_unit.totalItems === 0 
    ? 'nav-badge bg-graphite-3 text-[#8A909B] font-bold rounded-full px-[7px] py-[1px] min-w-[18px] text-center text-[12px]'
    : 'nav-badge bg-teal text-white font-bold rounded-full px-[7px] py-[1px] min-w-[18px] text-center text-[12px]';

  // Load all items for dashboard tables
  state.allItems = await api('/items');

  const tableItems = state.allItems.filter(i => i.category === 'table_unit');
  const counterItems = state.allItems.filter(i => i.category === 'counter_unit');

  renderDashSection('dashTableBody', 'dashTableEmpty', tableItems);
  renderDashSection('dashCounterBody', 'dashCounterEmpty', counterItems);
}

function renderDashSection(tbodyId, emptyId, items) {
  const tbody = document.getElementById(tbodyId);
  const empty = document.getElementById(emptyId);
  if (items.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = renderItemRows(items, false);
  }
}

// ---------- device views (Table Unit / Counter Unit) ----------

async function loadDeviceView(category) {
  const search = document.getElementById(category === 'table_unit' ? 'searchTable' : 'searchCounter').value.trim();
  const params = new URLSearchParams();
  params.set('category', category);
  if (search) params.set('search', search);

  state.items = await api('/items?' + params.toString());
  renderDeviceTable(category);
  loadDeviceStats(category);
}

async function loadDeviceStats(category) {
  const summary = await api('/dashboard/summary');
  const stats = summary[category];
  const prefix = category === 'table_unit' ? 'Table' : 'Counter';

  document.getElementById(`stat${prefix}Items`).textContent = stats.totalItems;
  document.getElementById(`stat${prefix}Available`).textContent = stats.totalAvailability;
  document.getElementById(`stat${prefix}Order`).textContent = stats.totalToOrder;
}

function renderDeviceTable(category) {
  const tbodyId = category === 'table_unit' ? 'tableUnitBody' : 'counterUnitBody';
  const emptyId = category === 'table_unit' ? 'tableUnitEmpty' : 'counterUnitEmpty';
  const tbody = document.getElementById(tbodyId);
  const empty = document.getElementById(emptyId);

  if (state.items.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  tbody.innerHTML = renderItemRows(state.items, true);
}

// Search handlers
document.getElementById('searchTable').addEventListener('input', debounce(() => loadDeviceView('table_unit'), 250));
document.getElementById('searchCounter').addEventListener('input', debounce(() => loadDeviceView('counter_unit'), 250));

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Row action delegation
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;

  if (action === 'edit') openEditModal(id);
  if (action === 'delete') openDeleteConfirm(id);
});

// ---------- add / edit item modal ----------

// Add buttons with pre-selected category
document.querySelectorAll('[data-add-category]').forEach((btn) => {
  btn.addEventListener('click', () => openAddModal(btn.dataset.addCategory));
});

function openAddModal(category = 'table_unit') {
  state.editingItem = null;
  document.getElementById('itemModalTitle').textContent = 'Add item';
  document.getElementById('itemFormSubmit').textContent = 'Add item';
  document.getElementById('itemFormError').style.display = 'none';
  document.getElementById('itemForm').reset();
  document.getElementById('itemCategory').value = category;
  openModal('itemModalOverlay');
  document.getElementById('itemName').focus();
}

function openEditModal(id) {
  const item = state.items.find((i) => i.id === id) || state.allItems.find((i) => i.id === id);
  if (!item) return;
  state.editingItem = item;

  document.getElementById('itemModalTitle').textContent = 'Edit item';
  document.getElementById('itemFormSubmit').textContent = 'Save changes';
  document.getElementById('itemFormError').style.display = 'none';

  document.getElementById('itemName').value = item.name;
  document.getElementById('itemCategory').value = item.category;
  document.getElementById('itemSubcategory').value = item.subcategory || '';
  document.getElementById('itemQtyPerDevice').value = item.qty_per_device;
  document.getElementById('itemAvailability').value = item.availability;
  document.getElementById('itemDevices').value = item.devices;
  document.getElementById('itemLink').value = item.link || '';

  openModal('itemModalOverlay');
}

document.getElementById('itemForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorBox = document.getElementById('itemFormError');
  errorBox.style.display = 'none';

  const payload = {
    name: document.getElementById('itemName').value.trim(),
    category: document.getElementById('itemCategory').value,
    subcategory: document.getElementById('itemSubcategory').value.trim(),
    qty_per_device: document.getElementById('itemQtyPerDevice').value,
    availability: document.getElementById('itemAvailability').value,
    devices: document.getElementById('itemDevices').value,
    link: document.getElementById('itemLink').value.trim(),
  };

  try {
    if (state.editingItem) {
      await api(`/items/${state.editingItem.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Item updated.');
    } else {
      await api('/items', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Item added.');
    }
    closeModal('itemModalOverlay');
    refreshCurrentView();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  }
});

// ---------- delete confirm ----------

function openDeleteConfirm(id) {
  const item = state.items.find((i) => i.id === id) || state.allItems.find((i) => i.id === id);
  if (!item) return;
  state.pendingDelete = item;
  document.getElementById('confirmModalText').textContent =
    `Remove "${item.name}"? This can't be undone.`;
  openModal('confirmModalOverlay');
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!state.pendingDelete) return;
  try {
    await api(`/items/${state.pendingDelete.id}`, { method: 'DELETE' });
    showToast('Item removed.');
    closeModal('confirmModalOverlay');
    refreshCurrentView();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ---------- refresh helper ----------

function refreshCurrentView() {
  switchView(state.currentView);
}

// ---------- dashboard tabs ----------

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    if (btn.dataset.dashTab === 'table') {
      document.getElementById('dashTabTable').style.display = 'block';
      document.getElementById('dashTabCounter').style.display = 'none';
    } else {
      document.getElementById('dashTabTable').style.display = 'none';
      document.getElementById('dashTabCounter').style.display = 'block';
    }
  });
});

// ---------- boot ----------

(async function init() {
  await loadSession();
  await loadDashboard();
})();
