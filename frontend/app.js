const form = document.querySelector('#task-form');
const input = document.querySelector('#task-title');
const list = document.querySelector('#task-list');
const message = document.querySelector('#message');

async function request(path, options) {
  const response = await fetch(`/api${path}`, options);
  if (!response.ok) throw new Error('La solicitud no pudo completarse');
  return response.status === 204 ? null : response.json();
}

function render(tasks) {
  list.innerHTML = tasks.map((task) => `
    <li class="${task.completed ? 'done' : ''}">
      <input type="checkbox" ${task.completed ? 'checked' : ''} data-toggle="${task.id}">
      <span class="title">${escapeHtml(task.title)}</span>
      <button class="delete" data-delete="${task.id}">Eliminar</button>
    </li>
  `).join('');
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

async function loadTasks() {
  try { render(await request('/tasks')); }
  catch (error) { message.textContent = error.message; }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await request('/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: input.value }) });
    input.value = '';
    message.textContent = '';
    await loadTasks();
  } catch (error) { message.textContent = error.message; }
});

list.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-delete]');
  if (!button) return;
  try { await request(`/tasks/${button.dataset.delete}`, { method: 'DELETE' }); await loadTasks(); }
  catch (error) { message.textContent = error.message; }
});

list.addEventListener('change', async (event) => {
  const checkbox = event.target.closest('[data-toggle]');
  if (!checkbox) return;
  try { await request(`/tasks/${checkbox.dataset.toggle}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: checkbox.checked }) }); await loadTasks(); }
  catch (error) { message.textContent = error.message; }
});

loadTasks();
