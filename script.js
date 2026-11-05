
/* =====================================
   STUDYMATE - STUDENT STUDY PLANNER
   Main JavaScript
===================================== */

// STORAGE

const STORAGE_KEY = "studymate_planner_data";

const defaultData = {
    tasks: [],
    exams: [],
    notes: [],
    schedules: [],
    profile: {
        name: "Student",
        course: ""
    },
    darkMode: false
};

let data;

try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    data = {
        ...defaultData,
        ...(saved && typeof saved === "object" ? saved : {}),
        profile: {
            ...defaultData.profile,
            ...(saved?.profile || {})
        }
    };

    ["tasks", "exams", "notes", "schedules"].forEach(key => {
        if (!Array.isArray(data[key])) data[key] = [];
    });
} catch {
    data = structuredClone(defaultData);
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function createId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function formatDate(date) {
    if (!date) return "No date";

    return new Date(date + "T00:00:00").toLocaleDateString(
        "en-IN",
        { day: "numeric", month: "short", year: "numeric" }
    );
}

function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function showMessage(message) {
    alert(message);
}


// =====================================
// NAVIGATION
// =====================================

const navLinks = document.querySelectorAll(".nav-link[data-page]");
const pages = document.querySelectorAll(".page");

function openPage(pageName) {
    const target = document.getElementById(pageName);

    if (!target) return;

    pages.forEach(page => page.classList.remove("active"));
    target.classList.add("active");

    navLinks.forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.page === pageName
        );
    });

    const titles = {
        dashboard: "Dashboard",
        tasks: "My Tasks",
        timetable: "Timetable",
        exams: "Exam Planner",
        notes: "Digital Notes",
        focus: "Focus Timer",
        settings: "Settings"
    };

    document.getElementById("pageTitle").textContent =
        titles[pageName] || "StudyMate";

    document.getElementById("sidebar").classList.remove("open");

    if (pageName === "dashboard") renderDashboard();
    if (pageName === "tasks") renderTasks();
    if (pageName === "timetable") renderSchedules();
    if (pageName === "exams") renderExams();
    if (pageName === "notes") renderNotes();
}

navLinks.forEach(link => {
    link.addEventListener("click", () => {
        openPage(link.dataset.page);
    });
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.go);
    });
});

document.getElementById("mobileMenu").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
});


// =====================================
// DATE AND PROFILE
// =====================================

function updateProfile() {
    const name = data.profile.name || "Student";
    const firstLetter = name.charAt(0).toUpperCase();

    document.getElementById("profileName").textContent = name;
    document.getElementById("welcomeName").textContent = name;
    document.getElementById("avatar").textContent = firstLetter;
    document.getElementById("topAvatar").textContent = firstLetter;

    document.getElementById("studentName").value = data.profile.name || "";
    document.getElementById("studentCourse").value = data.profile.course || "";
}

document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

document.getElementById("profileForm").addEventListener("submit", event => {
    event.preventDefault();

    data.profile.name =
        document.getElementById("studentName").value.trim();

    data.profile.course =
        document.getElementById("studentCourse").value.trim();

    if (!data.profile.name) {
        showMessage("Please enter your name.");
        return;
    }

    saveData();
    updateProfile();
    showMessage("Profile updated successfully!");
});


// =====================================
// TASK MANAGEMENT
// =====================================

const taskModal = document.getElementById("taskModal");
const taskForm = document.getElementById("taskForm");

function openTaskModal(task = null) {
    taskForm.reset();

    document.getElementById("editTaskId").value = task?.id || "";
    document.getElementById("taskTitle").value = task?.title || "";
    document.getElementById("taskSubject").value = task?.subject || "";
    document.getElementById("taskPriority").value =
        task?.priority || "Medium";

    document.getElementById("taskDate").value =
        task?.date || getToday();

    document.getElementById("modalTitle").textContent =
        task ? "Edit Study Task" : "Add New Task";

    taskModal.classList.add("show");
}

function closeTaskModal() {
    taskModal.classList.remove("show");
}

document.getElementById("addTaskBtn").addEventListener("click", () => {
    openTaskModal();
});

document.getElementById("closeModal").addEventListener("click", closeTaskModal);
document.getElementById("cancelModal").addEventListener("click", closeTaskModal);

taskModal.addEventListener("click", event => {
    if (event.target === taskModal) closeTaskModal();
});

taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const id = document.getElementById("editTaskId").value;

    const task = {
        id: id || createId(),
        title: document.getElementById("taskTitle").value.trim(),
        subject: document.getElementById("taskSubject").value.trim(),
        priority: document.getElementById("taskPriority").value,
        date: document.getElementById("taskDate").value,
        completed: false
    };

    if (!task.title || !task.subject || !task.date) {
        showMessage("Please fill in all task details.");
        return;
    }

    if (id) {
        const index = data.tasks.findIndex(item => item.id === id);

        if (index !== -1) {
            task.completed = data.tasks[index].completed;
            data.tasks[index] = task;
        }
    } else {
        data.tasks.unshift(task);
    }

    saveData();
    closeTaskModal();
    renderAll();

    showMessage(id ? "Task updated successfully!" : "Task added successfully!");
});

function renderTasks() {
    const list = document.getElementById("taskList");

    const search = document.getElementById("taskSearch")
        .value.toLowerCase().trim();

    const filter = document.getElementById("taskFilter").value;
    const priority = document.getElementById("priorityFilter").value;

    const filtered = data.tasks.filter(task => {
        const matchesSearch =
            task.title.toLowerCase().includes(search) ||
            task.subject.toLowerCase().includes(search);

        const matchesStatus =
            filter === "all" ||
            (filter === "completed" && task.completed) ||
            (filter === "pending" && !task.completed);

        const matchesPriority =
            priority === "all" || task.priority === priority;

        return matchesSearch && matchesStatus && matchesPriority;
    });

    if (!filtered.length) {
        list.innerHTML = '<p class="empty">No tasks found. Add a new study task!</p>';
        return;
    }

    list.innerHTML = filtered.map(task => `
        <div class="task-item ${task.completed ? "done" : ""}">
            <input
                class="task-check"
                type="checkbox"
                data-action="toggle-task"
                data-id="${escapeHTML(task.id)}"
                ${task.completed ? "checked" : ""}
                aria-label="Mark task completed"
            >

            <div class="task-details">
                <h4>${escapeHTML(task.title)}</h4>
                <p>${escapeHTML(task.subject)} · Due: ${formatDate(task.date)}</p>
            </div>

            <div class="task-meta">
                <span class="priority ${escapeHTML(task.priority)}">
                    ${escapeHTML(task.priority)}
                </span>
            </div>

            <div class="task-actions">
                <button class="icon-btn"
                    data-action="edit-task"
                    data-id="${escapeHTML(task.id)}"
                    title="Edit">✎</button>

                <button class="icon-btn"
                    data-action="delete-task"
                    data-id="${escapeHTML(task.id)}"
                    title="Delete">✕</button>
            </div>
        </div>
    `).join("");
}

document.getElementById("taskList").addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "edit-task") {
        const task = data.tasks.find(item => item.id === id);
        if (task) openTaskModal(task);
    }

    if (action === "delete-task") {
        if (!confirm("Are you sure you want to delete this task?")) return;

        data.tasks = data.tasks.filter(item => item.id !== id);
        saveData();
        renderAll();
    }
});

document.getElementById("taskList").addEventListener("change", event => {
    if (event.target.dataset.action !== "toggle-task") return;

    const task = data.tasks.find(item =>
        item.id === event.target.dataset.id
    );

    if (task) {
        task.completed = event.target.checked;
        saveData();
        renderAll();
    }
});

document.getElementById("taskSearch").addEventListener("input", renderTasks);
document.getElementById("taskFilter").addEventListener("change", renderTasks);
document.getElementById("priorityFilter").addEventListener("change", renderTasks);


// =====================================
// DASHBOARD AND STATISTICS
// =====================================

function renderDashboard() {
    const total = data.tasks.length;
    const completed = data.tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const percentage = total ? Math.round((completed / total) * 100) : 0;

    document.getElementById("totalTasks").textContent = total;
    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("pendingTasks").textContent = pending;
    document.getElementById("progressPercent").textContent = percentage + "%";

    document.getElementById("progressText").textContent =
        percentage + "% Completed";

    document.getElementById("progressCount").textContent =
        `${completed} / ${total} tasks`;

    document.getElementById("progressBar").style.width =
        percentage + "%";

    renderSubjectChart();
    renderDashboardExams();
    renderRecentTasks();
}

function renderSubjectChart() {
    const chart = document.getElementById("subjectChart");

    const subjects = {};

    data.tasks.forEach(task => {
        if (!subjects[task.subject]) {
            subjects[task.subject] = {
                total: 0,
                completed: 0
            };
        }

        subjects[task.subject].total++;

        if (task.completed) {
            subjects[task.subject].completed++;
        }
    });

    const entries = Object.entries(subjects);

    if (!entries.length) {
        chart.innerHTML =
            '<p class="empty">Add tasks to see subject-wise progress.</p>';
        return;
    }

    chart.innerHTML = entries.map(([subject, stats]) => {
        const percent = Math.round(
            (stats.completed / stats.total) * 100
        );

        return `
            <div class="chart-row">
                <div class="chart-label">
                    <span>${escapeHTML(subject)}</span>
                    <span>${percent}%</span>
                </div>
                <div class="chart-track">
                    <div class="chart-fill" style="width:${percent}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

function renderDashboardExams() {
    const container = document.getElementById("dashboardExams");

    const upcoming = data.exams
        .filter(exam => exam.date >= getToday())
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3);

    if (!upcoming.length) {
        container.innerHTML = '<p class="empty">No upcoming exams added.</p>';
        return;
    }

    container.innerHTML = upcoming.map(exam => `
        <div class="schedule-item">
            <div>
                <h4>${escapeHTML(exam.name)}</h4>
                <p>${escapeHTML(exam.subject)} · ${formatDate(exam.date)}</p>
            </div>
            <strong style="color:var(--primary);font-size:11px">
                ${getDaysRemaining(exam.date)}
            </strong>
        </div>
    `).join("");
}

function renderRecentTasks() {
    const container = document.getElementById("recentTasks");

    const recent = data.tasks.slice(0, 5);

    if (!recent.length) {
        container.innerHTML =
            '<p class="empty">No tasks available. Start by adding a task.</p>';
        return;
    }

    container.innerHTML = recent.map(task => `
        <div class="task-item ${task.completed ? "done" : ""}">
            <input type="checkbox"
                class="task-check"
                data-action="toggle-task"
                data-id="${escapeHTML(task.id)}"
                ${task.completed ? "checked" : ""}
                aria-label="Mark task completed">

            <div class="task-details">
                <h4>${escapeHTML(task.title)}</h4>
                <p>${escapeHTML(task.subject)} · ${formatDate(task.date)}</p>
            </div>

            <span class="priority ${escapeHTML(task.priority)}">
                ${escapeHTML(task.priority)}
            </span>
        </div>
    `).join("");
}

// Dashboard task checkbox support
document.getElementById("recentTasks").addEventListener("change", event => {
    if (event.target.dataset.action !== "toggle-task") return;

    const task = data.tasks.find(item =>
        item.id === event.target.dataset.id
    );

    if (task) {
        task.completed = event.target.checked;
        saveData();
        renderAll();
    }
});


// =====================================
// TIMETABLE
// =====================================

document.getElementById("scheduleForm").addEventListener("submit", event => {
    event.preventDefault();

    const start = document.getElementById("scheduleStart").value;
    const end = document.getElementById("scheduleEnd").value;

    if (start >= end) {
        showMessage("End time must be later than start time.");
        return;
    }

    const schedule = {
        id: createId(),
        subject: document.getElementById("scheduleSubject").value.trim(),
        day: document.getElementById("scheduleDay").value,
        start,
        end
    };

    data.schedules.push(schedule);
    saveData();

    event.target.reset();
    renderSchedules();

    showMessage("Study schedule added!");
});

function renderSchedules() {
    const container = document.getElementById("scheduleList");

    const days = [
        "Monday", "Tuesday", "Wednesday", "Thursday",
        "Friday", "Saturday", "Sunday"
    ];

    if (!data.schedules.length) {
        container.innerHTML =
            '<p class="empty">Your weekly timetable is empty.</p>';
        return;
    }

    container.innerHTML = days.map(day => {
        const schedules = data.schedules
            .filter(item => item.day === day)
            .sort((a, b) => a.start.localeCompare(b.start));

        if (!schedules.length) return "";

        return `
            <h3 class="day-heading">${day}</h3>
            ${schedules.map(item => `
                <div class="schedule-item">
                    <div>
                        <h4>${escapeHTML(item.subject)}</h4>
                        <p>${escapeHTML(item.start)} – ${escapeHTML(item.end)}</p>
                    </div>
                    <button class="delete-btn"
                        data-action="delete-schedule"
                        data-id="${escapeHTML(item.id)}">Delete</button>
                </div>
            `).join("")}
        `;
    }).join("");
}

document.getElementById("scheduleList").addEventListener("click", event => {
    const button = event.target.closest("[data-action='delete-schedule']");
    if (!button) return;

    data.schedules = data.schedules.filter(
        item => item.id !== button.dataset.id
    );

    saveData();
    renderSchedules();
});


// =====================================
// EXAM PLANNER
// =====================================

function getDaysRemaining(date) {
    const today = new Date(getToday() + "T00:00:00");
    const examDay = new Date(date + "T00:00:00");

    const difference = Math.round(
        (examDay - today) / (1000 * 60 * 60 * 24)
    );

    if (difference < 0) return "Completed";
    if (difference === 0) return "Today!";

    return difference + " days left";
}

document.getElementById("examForm").addEventListener("submit", event => {
    event.preventDefault();

    const exam = {
        id: createId(),
        name: document.getElementById("examName").value.trim(),
        date: document.getElementById("examDate").value,
        subject: document.getElementById("examSubject").value.trim()
    };

    if (!exam.name || !exam.subject || !exam.date) return;

    if (exam.date < getToday()) {
        showMessage("Please select today or a future date.");
        return;
    }

    data.exams.push(exam);
    saveData();

    event.target.reset();
    renderExams();
    renderDashboard();

    showMessage("Exam added successfully!");
});

function renderExams() {
    const container = document.getElementById("examList");

    const exams = [...data.exams].sort(
        (a, b) => a.date.localeCompare(b.date)
    );

    if (!exams.length) {
        container.innerHTML =
            '<p class="empty">No examinations added yet.</p>';
        return;
    }

    container.innerHTML = exams.map(exam => `
        <div class="exam-card">
            <p>EXAMINATION</p>
            <h3>${escapeHTML(exam.name)}</h3>
            <p>Subject: ${escapeHTML(exam.subject)}</p>
            <p>Date: ${formatDate(exam.date)}</p>

            <div class="exam-countdown">
                ${getDaysRemaining(exam.date)}
            </div>

            <button class="delete-btn"
                data-action="delete-exam"
                data-id="${escapeHTML(exam.id)}">Delete Exam</button>
        </div>
    `).join("");
}

document.getElementById("examList").addEventListener("click", event => {
    const button = event.target.closest("[data-action='delete-exam']");
    if (!button) return;

    data.exams = data.exams.filter(
        exam => exam.id !== button.dataset.id
    );

    saveData();
    renderExams();
    renderDashboard();
});


// =====================================
// DIGITAL NOTES
// =====================================

document.getElementById("noteForm").addEventListener("submit", event => {
    event.preventDefault();

    const note = {
        id: createId(),
        title: document.getElementById("noteTitle").value.trim(),
        content: document.getElementById("noteContent").value.trim(),
        date: new Date().toLocaleDateString("en-IN")
    };

    if (!note.title || !note.content) return;

    data.notes.unshift(note);
    saveData();

    event.target.reset();
    renderNotes();

    showMessage("Note saved successfully!");
});

function renderNotes() {
    const container = document.getElementById("notesList");

    if (!data.notes.length) {
        container.innerHTML =
            '<p class="empty">No notes saved. Create your first note!</p>';
        return;
    }

    container.innerHTML = data.notes.map(note => `
        <div class="note-card">
            <p class="note-date">SAVED ON ${escapeHTML(note.date)}</p>
            <h3>${escapeHTML(note.title)}</h3>
            <p>${escapeHTML(note.content)}</p>

            <button class="delete-btn"
                data-action="delete-note"
                data-id="${escapeHTML(note.id)}">Delete Note</button>
        </div>
    `).join("");
}

document.getElementById("notesList").addEventListener("click", event => {
    const button = event.target.closest("[data-action='delete-note']");
    if (!button) return;

    data.notes = data.notes.filter(
        note => note.id !== button.dataset.id
    );

    saveData();
    renderNotes();
});


// =====================================
// POMODORO FOCUS TIMER
// =====================================

let timerSeconds = 25 * 60;
let timerInterval = null;
let timerRunning = false;

const timerDisplay = document.getElementById("timerDisplay");
const timerStart = document.getElementById("timerStart");
const timerLabel = document.getElementById("timerLabel");

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;

    timerDisplay.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerStart.textContent = "Start";
}

function startTimer() {
    if (timerRunning) {
        stopTimer();
        return;
    }

    if (timerSeconds <= 0) return;

    timerRunning = true;
    timerStart.textContent = "Pause";

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();

        if (timerSeconds <= 0) {
            stopTimer();
            timerLabel.textContent = "Session completed!";
            showMessage("Great job! Your focus session is complete.");
        }
    }, 1000);
}

timerStart.addEventListener("click", startTimer);

document.getElementById("timerReset").addEventListener("click", () => {
    stopTimer();
    timerSeconds = 25 * 60;
    timerLabel.textContent = "Time to focus!";
    updateTimerDisplay();
});

document.querySelectorAll(".timer-tab").forEach(button => {
    button.addEventListener("click", () => {
        stopTimer();

        document.querySelectorAll(".timer-tab").forEach(tab => {
            tab.classList.remove("active");
        });

        button.classList.add("active");

        const minutes = Number(button.dataset.minutes);

        timerSeconds = minutes * 60;

        timerLabel.textContent =
            minutes === 25 ? "Time to focus!" : "Take a relaxing break!";

        updateTimerDisplay();
    });
});


// =====================================
// DARK MODE
// =====================================

function applyTheme() {
    document.body.classList.toggle("dark", data.darkMode);

    document.getElementById("themeToggle").textContent =
        data.darkMode ? "☀" : "☾";
}

document.getElementById("themeToggle").addEventListener("click", () => {
    data.darkMode = !data.darkMode;
    saveData();
    applyTheme();
});


// =====================================
// CLEAR ALL DATA
// =====================================

document.getElementById("clearData").addEventListener("click", () => {
    const confirmed = confirm(
        "Are you sure? This will permanently clear all your planner data from this browser."
    );

    if (!confirmed) return;

    const keepTheme = data.darkMode;

    data = {
        ...defaultData,
        profile: { ...defaultData.profile },
        darkMode: keepTheme
    };

    saveData();
    updateProfile();
    renderAll();

    showMessage("Planner data cleared successfully.");
});


// =====================================
// RENDER ALL
// =====================================

function renderAll() {
    renderDashboard();
    renderTasks();
    renderSchedules();
    renderExams();
    renderNotes();
}

function initializeApp() {
    updateProfile();
    applyTheme();
    renderAll();
    updateTimerDisplay();
}

initializeApp();
