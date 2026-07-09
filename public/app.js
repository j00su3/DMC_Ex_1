const TASKS_URL = "/api/tasks";
const CATEGORIES_URL = "/api/categories";

const form = document.getElementById("task-form");
const list = document.getElementById("task-list");
const categorySelect = document.getElementById("category_id");
const statPending = document.getElementById("stat-pending");
const statDone = document.getElementById("stat-done");

let categories = [];

async function loadCategories() {
  const res = await fetch(CATEGORIES_URL);
  categories = await res.json();

  categorySelect.innerHTML =
    '<option value="">Sin categoría</option>' +
    categories
      .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
      .join("");
}

async function fetchTasks() {
  const res = await fetch(TASKS_URL);
  const tasks = await res.json();
  renderStats(tasks);
  renderTasks(tasks);
}

function renderStats(tasks) {
  const pending = tasks.filter((t) => !t.completed).length;
  const done = tasks.length - pending;
  statPending.textContent = `${pending} pendiente${pending === 1 ? "" : "s"}`;
  statDone.textContent = `${done} completada${done === 1 ? "" : "s"}`;
}

function renderTasks(tasks) {
  list.innerHTML = "";

  if (tasks.length === 0) {
    list.innerHTML =
      '<li class="empty-state">No hay tareas todavía. ¡Agrega una!</li>';
    return;
  }

  for (const task of tasks) {
    list.appendChild(renderTaskItem(task));
  }
}

function renderTaskItem(task) {
  const li = document.createElement("li");
  li.className = `task-item priority-${task.priority} ${task.completed ? "completed" : ""}`;

  const meta = task.due_date ? `Vence: ${task.due_date}` : "";
  const categoryBadge = task.category_name
    ? `<span class="badge" style="background:${task.category_color}">${escapeHtml(task.category_name)}</span>`
    : "";

  const progressPct =
    task.subtasks_total > 0
      ? Math.round((task.subtasks_done / task.subtasks_total) * 100)
      : null;

  li.innerHTML = `
    <input type="checkbox" ${task.completed ? "checked" : ""} data-action="toggle" data-id="${task.id}" />
    <div class="task-content">
      <div class="task-title-row">
        <span class="task-title">${escapeHtml(task.title)}</span>
        ${categoryBadge}
      </div>
      ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ""}
      ${meta ? `<div class="task-meta">${escapeHtml(meta)}</div>` : ""}
      ${
        progressPct !== null
          ? `
        <div class="progress-bar"><div class="progress-fill" style="width:${progressPct}%"></div></div>
        <div class="progress-label">${task.subtasks_done}/${task.subtasks_total} subtareas</div>
      `
          : ""
      }
      <ul class="subtask-list" data-task-id="${task.id}">
        ${task.subtasks.map(renderSubtaskItem).join("")}
      </ul>
      <form class="subtask-form" data-task-id="${task.id}">
        <input type="text" placeholder="Agregar subtarea..." data-role="subtask-input" />
        <button type="submit">+</button>
      </form>
    </div>
    <div class="task-actions">
      <button class="delete" data-action="delete" data-id="${task.id}">Eliminar</button>
    </div>
  `;

  return li;
}

function renderSubtaskItem(subtask) {
  return `
    <li class="subtask-item ${subtask.completed ? "completed" : ""}">
      <input type="checkbox" ${subtask.completed ? "checked" : ""} data-action="toggle-subtask" data-task-id="${subtask.task_id}" data-subtask-id="${subtask.id}" />
      <span>${escapeHtml(subtask.title)}</span>
      <button data-action="delete-subtask" data-task-id="${subtask.task_id}" data-subtask-id="${subtask.id}">×</button>
    </li>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const submitButton = form.querySelector('button[type="submit"]');
const submitButtonDefaultText = submitButton.textContent;

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const priority = document.getElementById("priority").value;
  const due_date = document.getElementById("due_date").value || null;
  const category_id = categorySelect.value || null;

  submitButton.disabled = true;
  submitButton.classList.add("is-loading");
  submitButton.textContent = "Agregando...";

  try {
    await fetch(TASKS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        priority,
        due_date,
        category_id,
      }),
    });

    form.reset();
    await fetchTasks();
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove("is-loading");
    submitButton.textContent = submitButtonDefaultText;
  }
});

list.addEventListener("click", async (e) => {
  const { action, id, taskId, subtaskId } = e.target.dataset;
  if (!action) return;

  if (action === "toggle") {
    await fetch(`${TASKS_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: e.target.checked }),
    });
    await fetchTasks();
  }

  if (action === "delete") {
    await fetch(`${TASKS_URL}/${id}`, { method: "DELETE" });
    await fetchTasks();
  }

  if (action === "toggle-subtask") {
    await fetch(`${TASKS_URL}/${taskId}/subtasks/${subtaskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: e.target.checked }),
    });
    await fetchTasks();
  }

  if (action === "delete-subtask") {
    await fetch(`${TASKS_URL}/${taskId}/subtasks/${subtaskId}`, {
      method: "DELETE",
    });
    await fetchTasks();
  }
});

list.addEventListener("submit", async (e) => {
  if (!e.target.classList.contains("subtask-form")) return;
  e.preventDefault();

  const taskId = e.target.dataset.taskId;
  const input = e.target.querySelector('[data-role="subtask-input"]');
  const title = input.value.trim();

  if (!title) return;

  await fetch(`${TASKS_URL}/${taskId}/subtasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });

  await fetchTasks();
});

(async function init() {
  await loadCategories();
  await fetchTasks();
})();
