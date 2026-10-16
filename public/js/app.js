/**
 * Secure Notes - Frontend Application Logic
 */

const API_BASE = '/api';

// Application State
let authToken = localStorage.getItem('notes_auth_token') || null;
let currentUser = null;
let notesList = [];
let activeFilter = 'all'; // 'all' or 'pinned'
let activeTag = null;
let searchDebounceTimer = null;

// ==========================================
// Toast Notification Utility
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? 'fa-circle-check' :
               type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// Authenticated Fetch Helper
// ==========================================
async function authFetch(endpoint, options = {}) {
  const headers = options.headers || {};
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));

    // If unauthorized or token expired, auto-logout
    if (res.status === 401) {
      if (authToken) {
        showToast(data.message || 'Session expired. Please log in again.', 'error');
        handleLogout();
      }
      return { ok: false, status: 401, data };
    }

    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    showToast('Network error or server unreachable', 'error');
    return { ok: false, status: 500, error };
  }
}

// ==========================================
// App Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  setupUserMenu();

  if (authToken) {
    await verifyAndLoadUser();
  } else {
    showAuthView();
  }
});

async function verifyAndLoadUser() {
  const { ok, data } = await authFetch('/auth/me');
  if (ok && data && data.data && data.data.user) {
    currentUser = data.data.user;
    updateNavUser(currentUser);
    showDashboardView();
    loadNotes();
  } else {
    handleLogout();
  }
}

// ==========================================
// View Switching & Navigation
// ==========================================
function showAuthView() {
  document.getElementById('auth-view').classList.remove('hidden');
  document.getElementById('dashboard-view').classList.add('hidden');
  document.getElementById('nav-guest').classList.remove('hidden');
  document.getElementById('nav-auth').classList.add('hidden');
}

function showDashboardView() {
  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
  document.getElementById('nav-guest').classList.add('hidden');
  document.getElementById('nav-auth').classList.remove('hidden');
}

function updateNavUser(user) {
  const nameEl = document.getElementById('nav-user-name');
  const emailEl = document.getElementById('nav-user-email');
  const avatarEl = document.getElementById('nav-avatar');

  nameEl.textContent = user.name;
  emailEl.textContent = user.email;
  avatarEl.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
}

function setupUserMenu() {
  const btn = document.getElementById('user-menu-btn');
  const dropdown = document.getElementById('user-dropdown');
  const btnLogout = document.getElementById('btn-logout');
  const btnOpenChangePwd = document.getElementById('btn-open-change-pwd');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    if (!dropdown.classList.contains('hidden')) {
      dropdown.classList.add('hidden');
    }
  });

  btnLogout.addEventListener('click', handleLogout);
  btnOpenChangePwd.addEventListener('click', () => {
    dropdown.classList.add('hidden');
    openPwdModal();
  });
}

// ==========================================
// Authentication Handlers
// ==========================================
function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
  } else {
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
    formLogin.classList.add('hidden');
    formRegister.classList.remove('hidden');
  }
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('btn-login-submit');

  setButtonLoading(btn, true);

  const { ok, data } = await authFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  setButtonLoading(btn, false);

  if (ok && data.data && data.data.token) {
    authToken = data.data.token;
    localStorage.setItem('notes_auth_token', authToken);
    currentUser = data.data.user;
    updateNavUser(currentUser);
    showToast(`Welcome back, ${currentUser.name}!`, 'success');
    showDashboardView();
    loadNotes();
  } else {
    const errorMsg = data.message || (data.errors ? data.errors[0].message : 'Login failed');
    showToast(errorMsg, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const btn = document.getElementById('btn-reg-submit');

  setButtonLoading(btn, true);

  const { ok, data } = await authFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });

  setButtonLoading(btn, false);

  if (ok && data.data && data.data.token) {
    authToken = data.data.token;
    localStorage.setItem('notes_auth_token', authToken);
    currentUser = data.data.user;
    updateNavUser(currentUser);
    showToast(`Account created! Welcome, ${currentUser.name}!`, 'success');
    showDashboardView();
    loadNotes();
  } else {
    const errorMsg = data.message || (data.errors ? data.errors[0].message : 'Registration failed');
    showToast(errorMsg, 'error');
  }
}

function handleLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('notes_auth_token');
  showToast('Logged out successfully', 'info');
  showAuthView();
  switchAuthTab('login');
}

// ==========================================
// Notes Operations (CRUD)
// ==========================================
async function loadNotes() {
  const statsEl = document.getElementById('notes-count-text');
  statsEl.textContent = 'Loading encrypted notes...';

  const queryParams = new URLSearchParams();
  const searchInput = document.getElementById('search-input');
  if (searchInput && searchInput.value.trim()) {
    queryParams.append('search', searchInput.value.trim());
  }

  if (activeFilter === 'pinned') {
    queryParams.append('isPinned', 'true');
  }

  if (activeTag) {
    queryParams.append('tag', activeTag);
  }

  const { ok, data } = await authFetch(`/notes?${queryParams.toString()}`);

  if (ok && data && Array.isArray(data.data)) {
    notesList = data.data;
    renderNotesGrid(notesList);
  } else {
    statsEl.textContent = 'Failed to load notes';
    showToast(data.message || 'Error loading notes', 'error');
  }
}

function renderNotesGrid(notes) {
  const grid = document.getElementById('notes-grid');
  const emptyState = document.getElementById('empty-state');
  const statsEl = document.getElementById('notes-count-text');

  grid.innerHTML = '';

  if (!notes || notes.length === 0) {
    grid.classList.add('hidden');
    emptyState.classList.remove('hidden');
    statsEl.textContent = '0 notes';
    return;
  }

  grid.classList.remove('hidden');
  emptyState.classList.add('hidden');
  statsEl.textContent = `${notes.length} note${notes.length === 1 ? '' : 's'}`;

  notes.forEach((note) => {
    const card = document.createElement('div');
    card.className = `note-card ${note.isPinned ? 'pinned' : ''}`;

    const formattedDate = new Date(note.updatedAt || note.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Escape text to prevent XSS
    const safeTitle = escapeHTML(note.title);
    const safeContent = escapeHTML(note.content || '');

    const tagsHTML = (note.tags || [])
      .map((t) => `<span class="tag-chip" onclick="filterByTag('${escapeHTML(t)}')">#${escapeHTML(t)}</span>`)
      .join('');

    card.innerHTML = `
      <div>
        <div class="note-header">
          <h3 class="note-title">${safeTitle}</h3>
          <button class="btn-pin ${note.isPinned ? 'pinned' : ''}" title="${note.isPinned ? 'Unpin note' : 'Pin note'}" onclick="togglePin('${note._id}', ${note.isPinned})">
            <i class="fa-solid fa-thumbtack"></i>
          </button>
        </div>
        ${safeContent ? `<div class="note-content">${safeContent}</div>` : ''}
        ${tagsHTML ? `<div class="note-tags">${tagsHTML}</div>` : ''}
      </div>
      <div class="note-footer">
        <span>${formattedDate}</span>
        <div class="note-card-actions">
          <button class="btn-card-action" title="Edit note" onclick="openEditNote('${note._id}')">
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
          <button class="btn-card-action delete" title="Delete note" onclick="deleteNote('${note._id}')">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Search and Filter Handlers
function handleSearch() {
  const clearBtn = document.getElementById('search-clear');
  const input = document.getElementById('search-input');
  
  if (input.value.trim()) {
    clearBtn.classList.remove('hidden');
  } else {
    clearBtn.classList.add('hidden');
  }

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    loadNotes();
  }, 300);
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').classList.add('hidden');
  loadNotes();
}

function setFilter(filter) {
  activeFilter = filter;
  document.getElementById('filter-all').classList.toggle('active', filter === 'all');
  document.getElementById('filter-pinned').classList.toggle('active', filter === 'pinned');
  loadNotes();
}

function filterByTag(tag) {
  activeTag = tag;
  const badge = document.getElementById('active-tag-badge');
  const tagName = document.getElementById('current-tag-name');
  tagName.textContent = `#${tag}`;
  badge.classList.remove('hidden');
  loadNotes();
}

function clearTagFilter() {
  activeTag = null;
  document.getElementById('active-tag-badge').classList.add('hidden');
  loadNotes();
}

// Pin / Unpin Note
async function togglePin(noteId, currentPin) {
  const { ok, data } = await authFetch(`/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify({ isPinned: !currentPin })
  });

  if (ok) {
    showToast(!currentPin ? 'Note pinned to top' : 'Note unpinned', 'info');
    loadNotes();
  } else {
    showToast(data.message || 'Failed to update pin state', 'error');
  }
}

// Delete Note
async function deleteNote(noteId) {
  if (!confirm('Are you sure you want to permanently delete this note?')) {
    return;
  }

  const { ok, data } = await authFetch(`/notes/${noteId}`, {
    method: 'DELETE'
  });

  if (ok) {
    showToast('Note deleted successfully', 'success');
    loadNotes();
  } else {
    showToast(data.message || 'Failed to delete note', 'error');
  }
}

// ==========================================
// Modal: Create / Edit Note
// ==========================================
function openNoteModal(isEdit = false) {
  const modal = document.getElementById('note-modal');
  const title = document.getElementById('note-modal-title');
  const form = document.getElementById('note-form');

  if (!isEdit) {
    form.reset();
    document.getElementById('note-id').value = '';
    title.innerHTML = '<i class="fa-solid fa-plus"></i> New Note';
  } else {
    title.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Note';
  }

  modal.classList.remove('hidden');
  document.getElementById('note-title').focus();
}

function closeNoteModal() {
  document.getElementById('note-modal').classList.add('hidden');
}

function openEditNote(noteId) {
  const note = notesList.find((n) => n._id === noteId);
  if (!note) return;

  document.getElementById('note-id').value = note._id;
  document.getElementById('note-title').value = note.title;
  document.getElementById('note-content').value = note.content || '';
  document.getElementById('note-tags').value = (note.tags || []).join(', ');
  document.getElementById('note-pinned').checked = Boolean(note.isPinned);

  openNoteModal(true);
}

async function handleSaveNote(e) {
  e.preventDefault();
  const id = document.getElementById('note-id').value;
  const title = document.getElementById('note-title').value.trim();
  const content = document.getElementById('note-content').value.trim();
  const tagsStr = document.getElementById('note-tags').value.trim();
  const isPinned = document.getElementById('note-pinned').checked;
  const btn = document.getElementById('btn-save-note');

  const tags = tagsStr
    ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  setButtonLoading(btn, true);

  const endpoint = id ? `/notes/${id}` : '/notes';
  const method = id ? 'PUT' : 'POST';

  const { ok, data } = await authFetch(endpoint, {
    method,
    body: JSON.stringify({ title, content, tags, isPinned })
  });

  setButtonLoading(btn, false);

  if (ok) {
    showToast(id ? 'Note updated successfully' : 'Note created successfully', 'success');
    closeNoteModal();
    loadNotes();
  } else {
    showToast(data.message || (data.errors ? data.errors[0].message : 'Failed to save note'), 'error');
  }
}

// ==========================================
// Modal: Change Password
// ==========================================
function openPwdModal() {
  document.getElementById('pwd-form').reset();
  document.getElementById('pwd-modal').classList.remove('hidden');
}

function closePwdModal() {
  document.getElementById('pwd-modal').classList.add('hidden');
}

async function handleChangePassword(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('curr-pwd').value;
  const newPassword = document.getElementById('new-pwd').value;
  const confirmPassword = document.getElementById('confirm-pwd').value;
  const btn = document.getElementById('btn-save-pwd');

  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match', 'error');
    return;
  }

  setButtonLoading(btn, true);

  const { ok, data } = await authFetch('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword })
  });

  setButtonLoading(btn, false);

  if (ok) {
    showToast('Password changed successfully! Please log in again.', 'success');
    closePwdModal();
    handleLogout();
  } else {
    showToast(data.message || 'Failed to update password', 'error');
  }
}

// ==========================================
// UI Helpers
// ==========================================
function setButtonLoading(btn, isLoading) {
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.spinner');
  btn.disabled = isLoading;
  if (isLoading) {
    text.classList.add('hidden');
    spinner.classList.remove('hidden');
  } else {
    text.classList.remove('hidden');
    spinner.classList.add('hidden');
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
