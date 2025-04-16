// --- DOM Elements ---
const columns = document.querySelectorAll('.kanban-column');
const addTaskButton = document.getElementById('add-task-button');
const newTaskInput = document.getElementById('new-task-input');
const taskError = document.getElementById('task-error');
const todoColumn = document.getElementById('todo');
const doneColumn = document.getElementById('done');
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');

// --- State ---
let draggedItem = null; // Stores the element being dragged
let tasks = {}; // Object to store tasks { id: { text: 'Task text', column: 'todo' } }
let confettiParticles = []; // Array to store confetti particles
let confettiActive = false; // Flag to control confetti animation loop
let firstLoad = true; // Flag to track if this is the first load of the app

// --- Confetti Settings ---
const CONFETTI_COLORS = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
const CONFETTI_COUNT = 150; // Number of confetti particles
const CONFETTI_DURATION = 3000; // Duration in milliseconds

// --- Functions ---

/**
 * Generates a unique ID for tasks.
 * @returns {string} A unique ID string.
 */
function generateId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Creates a task card element.
 * @param {string} id - The unique ID of the task.
 * @param {string} text - The text content of the task.
 * @returns {HTMLElement} The created task card element.
 */
function createTaskCard(id, text) {
    const card = document.createElement('div');
    card.classList.add('task-card');
    card.classList.add('new-task'); // Add animation class
    card.setAttribute('draggable', 'true');
    card.setAttribute('id', id);
    card.textContent = text;

    // Add drag event listeners to the card
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    // Remove animation class after animation completes
    setTimeout(() => {
        card.classList.remove('new-task');
    }, 500);

    return card;
}

/**
 * Adds a new task to the 'To Do' column and saves it.
 */
function addTask() {
    const taskText = newTaskInput.value.trim();
    if (taskText === '') {
        taskError.classList.remove('hidden'); // Show error message
        return; // Don't add empty tasks
    }
    taskError.classList.add('hidden'); // Hide error message

    const taskId = generateId();
    const newTaskCard = createTaskCard(taskId, taskText);
    todoColumn.appendChild(newTaskCard);

    // Save task to state and localStorage
    tasks[taskId] = { text: taskText, column: 'todo' };
    saveTasks();

    newTaskInput.value = ''; // Clear the input field
    
    // Remove the empty state message if it exists
    const emptyState = todoColumn.querySelector('.empty-state');
    if (emptyState) {
        emptyState.style.display = 'none';
    }
}

/**
 * Saves the current state of tasks to localStorage.
 */
function saveTasks() {
    localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
}

/**
 * Loads tasks from localStorage and renders them on the board.
 * If this is the first time or no tasks exist, keeps the board empty.
 */
function loadTasks() {
    const savedTasks = localStorage.getItem('kanbanTasks');
    
    // Check if there are any saved tasks
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        
        // If we want to start with an empty board (user's request), clear any saved tasks
        if (firstLoad) {
            tasks = {};
            saveTasks();
            firstLoad = false;
            return;
        }
        
        // Clear existing columns before loading
        columns.forEach(col => {
            // Keep the heading, remove task cards
            const taskCards = col.querySelectorAll('.task-card');
            taskCards.forEach(card => card.remove());
        });

        // Render tasks into their respective columns
        Object.keys(tasks).forEach(taskId => {
            const task = tasks[taskId];
            const columnElement = document.getElementById(task.column);
            if (columnElement) {
                const taskCard = createTaskCard(taskId, task.text);
                columnElement.appendChild(taskCard);
            } else {
                // Handle case where column might not exist (e.g., data corruption)
                tasks[taskId].column = 'todo'; // Reset to 'todo'
                const taskCard = createTaskCard(taskId, task.text);
                todoColumn.appendChild(taskCard);
            }
        });
        
        // Hide empty states for columns with tasks
        columns.forEach(column => {
            const hasCards = column.querySelectorAll('.task-card').length > 0;
            const emptyState = column.querySelector('.empty-state');
            if (emptyState) {
                emptyState.style.display = hasCards ? 'none' : 'block';
            }
        });
    }
    
    firstLoad = false; // Mark that we've done the first load
}

// --- Drag and Drop Event Handlers ---

/**
 * Handles the start of a drag operation.
 * @param {DragEvent} event - The drag event object.
 */
function handleDragStart(event) {
    draggedItem = event.target;
    event.dataTransfer.setData('text/plain', event.target.id); // Necessary for Firefox
    setTimeout(() => {
        event.target.classList.add('dragging'); // Add styling for visual feedback
    }, 0);
}

/**
 * Handles the end of a drag operation.
 * @param {DragEvent} event - The drag event object.
 */
function handleDragEnd(event) {
    if (draggedItem) {
        draggedItem.classList.remove('dragging'); // Remove dragging style
    }
    draggedItem = null;
    // Remove highlight from all columns
    columns.forEach(column => column.classList.remove('drag-over'));
}

/**
 * Handles when a draggable item is dragged over a column.
 * @param {DragEvent} event - The drag event object.
 */
function handleDragOver(event) {
    event.preventDefault(); // Allow dropping
    const column = event.currentTarget;
    if (column.classList.contains('kanban-column')) {
        column.classList.add('drag-over'); // Add highlight style
    }
}

/**
 * Handles when a draggable item leaves a column's area.
 * @param {DragEvent} event - The drag event object.
 */
function handleDragLeave(event) {
    const column = event.currentTarget;
    if (column.classList.contains('kanban-column')) {
        column.classList.remove('drag-over'); // Remove highlight style
    }
}

/**
 * Handles dropping a draggable item onto a column.
 * @param {DragEvent} event - The drag event object.
 */
function handleDrop(event) {
    event.preventDefault();
    const column = event.currentTarget;
    column.classList.remove('drag-over'); // Remove highlight

    if (column.classList.contains('kanban-column') && draggedItem) {
        const taskId = draggedItem.id;
        const targetColumnId = column.id;
        const sourceColumnId = tasks[taskId].column;

        // Append the dragged item to the new column
        column.appendChild(draggedItem);

        // Update task state and save
        if (tasks[taskId]) {
            tasks[taskId].column = targetColumnId;
            saveTasks();

            // Check empty states
            updateColumnEmptyStates(sourceColumnId, targetColumnId);

            // Trigger confetti if dropped in the 'Done' column
            if (targetColumnId === 'done') {
                triggerConfetti();
                
                // Add a small celebration animation to the card
                draggedItem.classList.add('new-task');
                setTimeout(() => {
                    draggedItem.classList.remove('new-task');
                }, 500);
            }
        } else {
            console.error("Could not find task data for ID:", taskId);
        }
    }
    
    // Clean up in case dragend didn't fire correctly
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
    }
    draggedItem = null;
}

/**
 * Updates the empty state visibility for columns involved in a task move
 */
function updateColumnEmptyStates(sourceColumnId, targetColumnId) {
    // Check source column for emptiness
    if (sourceColumnId) {
        const sourceColumn = document.getElementById(sourceColumnId);
        const sourceEmpty = sourceColumn.querySelectorAll('.task-card').length === 0;
        const sourceEmptyState = sourceColumn.querySelector('.empty-state');
        if (sourceEmptyState) {
            sourceEmptyState.style.display = sourceEmpty ? 'block' : 'none';
        }
    }

    // Check target column for emptiness
    const targetColumn = document.getElementById(targetColumnId);
    const targetEmptyState = targetColumn.querySelector('.empty-state');
    if (targetEmptyState) {
        targetEmptyState.style.display = 'none'; // Always hide since we just added a card
    }
}

// --- Confetti Animation ---

/**
 * Represents a single confetti particle.
 */
class ConfettiParticle {
    constructor() {
        this.x = Math.random() * confettiCanvas.width;
        this.y = Math.random() * confettiCanvas.height - confettiCanvas.height;
        this.size = Math.random() * 10 + 5;
        this.weight = Math.random() * 0.4 + 0.1;
        this.angle = Math.random() * 360;
        this.rotationSpeed = Math.random() * 4 - 2;
        this.color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        this.shape = Math.random() > 0.5 ? 'rect' : 'circle'; // Add different shapes
    }

    update() {
        this.y += this.weight * 5;
        this.x += Math.sin(this.y * 0.05) * 2;
        this.angle += this.rotationSpeed;
        if (this.y > confettiCanvas.height) {
            this.y = -this.size;
            this.x = Math.random() * confettiCanvas.width;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        ctx.rotate(this.angle * Math.PI / 180);
        ctx.fillStyle = this.color;
        
        // Draw different shapes for variety
        if (this.shape === 'rect') {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

/**
 * Initializes and triggers the confetti animation.
 */
function triggerConfetti() {
    if (confettiActive) return;

    confettiCanvas.style.display = 'block';
    resizeConfettiCanvas();
    confettiParticles = [];
    for (let i = 0; i < CONFETTI_COUNT; i++) {
        confettiParticles.push(new ConfettiParticle());
    }

    confettiActive = true;
    animateConfetti();

    setTimeout(() => {
        confettiActive = false;
        let fadeOut = setInterval(() => {
            ctx.fillStyle = 'rgba(245, 247, 250, 0.1)';
            ctx.fillRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            if (!confettiActive && confettiParticles.every(p => p.y > confettiCanvas.height)) {
                clearInterval(fadeOut);
                confettiCanvas.style.display = 'none';
            }
        }, 50);

        setTimeout(() => {
            clearInterval(fadeOut);
            confettiCanvas.style.display = 'none';
        }, CONFETTI_DURATION + 1000);
    }, CONFETTI_DURATION);
}

/**
 * The main animation loop for the confetti.
 */
function animateConfetti() {
    if (!confettiActive && confettiParticles.every(p => p.y > confettiCanvas.height)) {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        return;
    }

    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiParticles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    requestAnimationFrame(animateConfetti);
}

/**
 * Resizes the confetti canvas to match the window size.
 */
function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}

// --- Event Listeners ---
addTaskButton.addEventListener('click', addTask);

// Allow adding task by pressing Enter in the input field
newTaskInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        addTask();
    }
});

// Resize confetti canvas on window resize
window.addEventListener('resize', resizeConfettiCanvas);

// --- Initialization ---
loadTasks(); // Load tasks when the page loads
resizeConfettiCanvas(); // Set initial canvas size
