const form = document.querySelector('#add-form');
const nameInput = document.querySelector('#item-name');
const quantityInput = document.querySelector('#item-quantity');
const listContent = document.querySelector('#list-content');
const listSubtitle = document.querySelector('#list-subtitle');
const totalBadge = document.querySelector('#total-badge');
const completedTotal = document.querySelector('#completed-total');
const dialog = document.querySelector('#edit-dialog');
const editForm = document.querySelector('#edit-form');
const editName = document.querySelector('#edit-name');
const editQuantity = document.querySelector('#edit-quantity');
const toast = document.querySelector('#toast');
const themeToggle = document.querySelector('#theme-toggle');
let items = [];
let editingId = null;
let toastTimer;

const icons = {
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4.5-1 10-10a2.12 2.12 0 0 0-3-3l-10 10L4 20Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
  basket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 2 10h12l2-10M2 10h20M9 10l3-6 3 6"/></svg>'
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  if (!response.ok) {
    let message = 'Não foi possível concluir a ação.';
    try { message = (await response.json()).error || message; } catch {}
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}

function render() {
  listContent.setAttribute('aria-busy', 'false');
  const completed = items.filter((item) => item.completed).length;
  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  const boughtUnits = items.reduce((sum, item) => sum + (item.completed ? item.quantity : 0), 0);
  totalBadge.textContent = `${units} ${units === 1 ? 'item' : 'itens'}`;
  listSubtitle.textContent = items.length === 0 ? 'Sua próxima ida ao mercado começa aqui.' : `${items.length} ${items.length === 1 ? 'produto' : 'produtos'} na sua lista`;
  completedTotal.innerHTML = `${boughtUnits} <small>/ ${units}</small>`;

  if (!items.length) {
    listContent.innerHTML = `<div class="empty-state"><div class="empty-illustration">${icons.basket}</div><strong>Sua lista está vazia</strong><span>Adicione seu primeiro item acima.</span></div>`;
    return;
  }

  listContent.replaceChildren(...items.map((item) => {
    const row = document.createElement('div');
    row.className = `shopping-item${item.completed ? ' completed' : ''}`;
    row.dataset.id = item.id;
    const state = document.createElement('span');
    state.className = 'item-state';
    state.setAttribute('aria-hidden', 'true');
    state.textContent = item.completed ? '✓' : '';
    const description = document.createElement('div');
    description.className = 'item-description';
    const name = document.createElement('span');
    name.className = 'item-name'; name.textContent = item.name;
    const quantity = document.createElement('span');
    quantity.className = 'item-quantity'; quantity.textContent = `× ${item.quantity}`;
    description.append(name, quantity);
    const actions = document.createElement('div'); actions.className = 'item-actions';
    actions.append(
      makeAction('delete-button', 'Excluir item', icons.trash, 'delete'),
      makeAction('edit-button', 'Editar item', icons.edit, 'edit'),
      makeAction('complete-button', item.completed ? 'Marcar como não comprado' : 'Marcar como comprado', icons.check, 'toggle')
    );
    row.append(state, description, actions);
    return row;
  }));
}

function makeAction(className, label, icon, action) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = `icon-button ${className}`;
  button.setAttribute('aria-label', label); button.title = label; button.dataset.action = action;
  button.innerHTML = icon;
  return button;
}

async function loadItems() {
  try { items = await request('/api/items'); render(); }
  catch (error) { listContent.setAttribute('aria-busy', 'false'); listContent.innerHTML = '<div class="empty-state"><strong>Não foi possível carregar sua lista</strong><span>Verifique sua conexão e atualize a página.</span></div>'; showToast(error.message); }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const quantity = Number(quantityInput.value);
  if (!name) { nameInput.focus(); return; }
  try {
    const item = await request('/api/items', { method: 'POST', body: JSON.stringify({ name, quantity }) });
    items.push(item); render(); form.reset(); quantityInput.value = '1'; nameInput.focus();
  } catch (error) { showToast(error.message); }
});

listContent.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const row = button.closest('.shopping-item');
  const item = items.find((entry) => entry.id === row.dataset.id);
  if (!item) return;
  try {
    if (button.dataset.action === 'delete') {
      await request(`/api/items/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      items = items.filter((entry) => entry.id !== item.id); render(); showToast('Item removido da lista.');
    } else if (button.dataset.action === 'edit') {
      editingId = item.id; editName.value = item.name; editQuantity.value = item.quantity;
      dialog.showModal(); editName.focus();
    } else {
      const updated = await request(`/api/items/${encodeURIComponent(item.id)}`, { method: 'PUT', body: JSON.stringify({ completed: !item.completed }) });
      items = items.map((entry) => entry.id === updated.id ? updated : entry); render();
    }
  } catch (error) { showToast(error.message); }
});

editForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = editName.value.trim();
  const quantity = Number(editQuantity.value);
  if (!name) { editName.focus(); return; }
  try {
    const updated = await request(`/api/items/${encodeURIComponent(editingId)}`, { method: 'PUT', body: JSON.stringify({ name, quantity }) });
    items = items.map((entry) => entry.id === updated.id ? updated : entry); render(); dialog.close(); showToast('Item atualizado.');
  } catch (error) { showToast(error.message); }
});

function closeDialog() { dialog.close(); }
document.querySelector('#close-dialog').addEventListener('click', closeDialog);
document.querySelector('#cancel-edit').addEventListener('click', closeDialog);
dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
dialog.addEventListener('close', () => { editingId = null; });

function setTheme(theme) {
  const dark = theme === 'dark';
  document.body.classList.toggle('dark', dark);
  themeToggle.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
  document.querySelector('meta[name="theme-color"]').content = dark ? '#151c18' : '#f4f7f4';
  localStorage.setItem('shopping-theme', theme);
}
themeToggle.addEventListener('click', () => setTheme(document.body.classList.contains('dark') ? 'light' : 'dark'));
setTheme(localStorage.getItem('shopping-theme') || 'light');
loadItems();
