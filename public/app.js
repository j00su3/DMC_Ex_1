const TASKS_URL = "/api/tasks";
const CATEGORIES_URL = "/api/categories";
const THEME_KEY = "todo-theme";

const themeToggle = document.getElementById("theme-toggle");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "light" ? "☀️" : "🌙";
}

applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

themeToggle.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

const form = document.getElementById("task-form");
const groupsContainer = document.getElementById("task-groups");
const categorySelect = document.getElementById("category_id");
const recurrenceSelect = document.getElementById("recurrence");
const statOverdue = document.getElementById("stat-overdue");
const statPending = document.getElementById("stat-pending");
const statDone = document.getElementById("stat-done");
const searchInput = document.getElementById("search-input");
const filterCategory = document.getElementById("filter-category");
const filterPriority = document.getElementById("filter-priority");

const RECURRENCE_LABELS = { daily: "Diaria", weekly: "Semanal", monthly: "Mensual" };

let categories = [];
let allTasks = [];
let filters = { search: "", category: "", priority: "" };

async function loadCategories() {
  const res = await fetch(CATEGORIES_URL);
  categories = await res.json();

  categorySelect.innerHTML =
    '<option value="">Sin categoría</option>' +
    categories
      .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
      .join("");

  filterCategory.innerHTML =
    '<option value="">Todas las categorías</option>' +
    categories
      .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
      .join("");
}

function applyFilters(tasks) {
  return tasks.filter((task) => {
    if (filters.category && String(task.category_id) !== filters.category) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.search) {
      const haystack = `${task.title} ${task.description || ""}`.toLowerCase();
      if (!haystack.includes(filters.search)) return false;
    }
    return true;
  });
}

async function fetchTasks() {
  const res = await fetch(TASKS_URL);
  allTasks = await res.json();
  render();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function decorate(task) {
  const today = todayStr();
  const isOverdue = !!task.due_date && !task.completed && task.due_date < today;
  const isToday = task.due_date === today && !task.completed;

  let dueLabel = "";
  let dueClass = "normal";
  if (task.due_date) {
    if (isOverdue) {
      const days = Math.max(1, Math.round((new Date(today) - new Date(task.due_date)) / 86400000));
      dueLabel = days === 1 ? "Venció ayer" : `Venció hace ${days} días`;
      dueClass = "overdue";
    } else if (isToday) {
      dueLabel = "Vence hoy";
      dueClass = "today";
    } else {
      dueLabel = `Vence ${task.due_date}`;
      dueClass = "normal";
    }
  }

  return { ...task, isOverdue, isToday, dueLabel, dueClass };
}

function buildGroups(tasks) {
  const decorated = tasks.map(decorate);
  const pending = decorated.filter((t) => !t.completed);
  const completed = decorated.filter((t) => t.completed);

  const overdue = pending.filter((t) => t.isOverdue);
  const today = pending.filter((t) => t.isToday);
  const upcoming = pending.filter((t) => t.due_date && !t.isOverdue && !t.isToday);
  const noDate = pending.filter((t) => !t.due_date);

  const groups = [
    { key: "overdue", label: "Vencidas", color: "#f26860", items: overdue },
    { key: "today", label: "Hoy", color: "#e3ab4f", items: today },
    { key: "upcoming", label: "Próximas", color: "#8a8d94", items: upcoming },
    { key: "nodate", label: "Sin fecha", color: "#8a8d94", items: noDate },
  ].filter((g) => g.items.length > 0);

  if (completed.length > 0) {
    groups.push({ key: "completed", label: "Completadas", color: "#8a8d94", items: completed });
  }

  return {
    stats: {
      overdueCount: decorated.filter((t) => t.isOverdue).length,
      pendingCount: pending.length,
      doneCount: completed.length,
    },
    groups,
  };
}

function render() {
  const { stats, groups } = buildGroups(applyFilters(allTasks));
  renderStats(stats);
  renderGroups(groups);
}

function renderStats(stats) {
  statOverdue.textContent = stats.overdueCount;
  statPending.textContent = stats.pendingCount;
  statDone.textContent = stats.doneCount;
}

function renderGroups(groups) {
  groupsContainer.innerHTML = "";

  if (groups.length === 0) {
    groupsContainer.innerHTML =
      '<div class="empty-state">No hay tareas todavía. ¡Agrega una!</div>';
    return;
  }

  for (const group of groups) {
    const section = document.createElement("div");
    section.className = "group";
    section.innerHTML = `
      <div class="group-header" style="color:${group.color}">${escapeHtml(group.label)} · ${group.items.length}</div>
      <div class="group-items">${group.items.map(renderTaskCard).join("")}</div>
    `;
    groupsContainer.appendChild(section);
  }
}

function renderTaskCard(task) {
  const categoryBadge = task.category_name
    ? `<span class="category-badge" style="background:${task.category_color}">${escapeHtml(task.category_name)}</span>`
    : "";

  const progress =
    task.subtasks_total > 0
      ? `
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.round((task.subtasks_done / task.subtasks_total) * 100)}%"></div></div>
        <div class="progress-label">${task.subtasks_done}/${task.subtasks_total} subtareas</div>
      `
      : "";

  const recurrenceBadge = task.recurrence
    ? `<span class="recurrence-badge">🔁 ${escapeHtml(RECURRENCE_LABELS[task.recurrence] || task.recurrence)}</span>`
    : "";

  return `
    <div class="task-card ${task.completed ? "completed" : ""}">
      <input type="checkbox" ${task.completed ? "checked" : ""} data-action="toggle" data-id="${task.id}" />
      <div class="task-body">
        <div class="task-title-row">
          <span class="priority-dot ${task.priority}"></span>
          <span class="task-title">${escapeHtml(task.title)}</span>
          ${categoryBadge}
          ${recurrenceBadge}
        </div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ""}
        ${task.dueLabel ? `<div class="due-label ${task.dueClass}">${escapeHtml(task.dueLabel)}</div>` : ""}
        ${progress}
        <ul class="subtask-list" data-task-id="${task.id}">
          ${task.subtasks.map(renderSubtaskItem).join("")}
        </ul>
        <form class="subtask-form" data-task-id="${task.id}">
          <input type="text" placeholder="Agregar subtarea..." data-role="subtask-input" />
          <button type="submit">+</button>
        </form>
      </div>
      <button class="task-delete" data-action="delete" data-id="${task.id}">Eliminar</button>
    </div>
  `;
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
  const recurrence = recurrenceSelect.value || null;

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
        recurrence,
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

groupsContainer.addEventListener("click", async (e) => {
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

groupsContainer.addEventListener("submit", async (e) => {
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

searchInput.addEventListener("input", () => {
  filters.search = searchInput.value.trim().toLowerCase();
  render();
});

filterCategory.addEventListener("change", () => {
  filters.category = filterCategory.value;
  render();
});

filterPriority.addEventListener("change", () => {
  filters.priority = filterPriority.value;
  render();
});

(async function init() {
  await loadCategories();
  await fetchTasks();
})();
