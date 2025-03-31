// API Configuration
const API_BASE_URL = '/api';;

class TaskManager {
  constructor() {
    // DOM Element References
    this.taskContainer = document.getElementById('tasks-container');
    this.taskModal = document.getElementById('task-modal');
    this.taskForm = document.getElementById('task-form');
    this.addTaskBtn = document.getElementById('add-task-btn');
    this.searchInput = document.getElementById('search-input');
    this.sortSelect = document.getElementById('sort-select');
    this.addProjectBtn = document.getElementById('add-project-btn');
    this.addLabelBtn = document.getElementById('add-label-btn');
    this.projectsList = document.getElementById('projects-list');
    this.labelsList = document.getElementById('labels-list');
    this.closeModalBtn = document.querySelector('.close-modal');

    // Initialize data
    this.tasks = [];
    this.projects = [];
    this.labels = [];
    this.currentView = 'all';

    // Bind event listeners
    this.bindEvents();

    // Initial fetches and renders
    this.fetchProjects();
    this.fetchLabels();
    this.fetchTasks();
  }

  // Event Binding Method
  bindEvents() {
    // Task Modal Events
    this.closeModalBtn.addEventListener('click', () => this.closeTaskModal());
    this.addTaskBtn.addEventListener('click', () => this.openTaskModal());
    this.taskForm.addEventListener('submit', (e) => this.saveTask(e));

    // View Navigation Events
    document.querySelectorAll('.sidebar a[data-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.currentView = e.target.dataset.view;
        document.getElementById('current-view-title').textContent = 
          e.target.textContent;
        this.filterTasks();
      });
    });

    // Search and Sort Events
    this.searchInput.addEventListener('input', () => this.searchTasks());
    this.sortSelect.addEventListener('change', () => this.sortTasks());

    // Project and Label Management
    this.addProjectBtn.addEventListener('click', () => this.addProject());
    this.addLabelBtn.addEventListener('click', () => this.addLabel());

    // Recurring Task Toggle
    document.getElementById('task-recurring').addEventListener('change', (e) => {
      document.getElementById('recurring-options').classList.toggle('hidden', !e.target.checked);
    });

    // Reminder and Subtask Interactions
    document.getElementById('add-reminder-btn').addEventListener('click', () => this.addReminder());
    document.querySelector('.add-subtask-btn').addEventListener('click', () => this.addSubtask());

    // Subtask Remove Delegation
    document.getElementById('subtasks-list').addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-subtask')) {
        e.target.closest('.subtask-item').remove();
      }
    });
  }

  // Filter Tasks based on current view
  filterTasks() {
    this.renderTasks();
  }

  // Fetch Tasks from Backend
  async fetchTasks() {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.tasks = await response.json();
      console.log('Fetched tasks:', this.tasks);
      this.renderTasks();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      this.showErrorMessage('Failed to load tasks. Please try again.');
    }
  }

  // Fetch Projects
  async fetchProjects() {
    try {
      const response = await fetch(`${API_BASE_URL}/projects`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.projects = Array.isArray(data) ? data : [];
      console.log('Fetched projects:', this.projects);
      this.renderProjects();
    } catch (error) {
      console.error('Error fetching projects:', error);
      this.projects = []; // Initialize as empty array if fetch fails
      this.renderProjects();
    }
  }

  // Fetch Labels
  async fetchLabels() {
    try {
      const response = await fetch(`${API_BASE_URL}/labels`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.labels = Array.isArray(data) ? data : [];
      console.log('Fetched labels:', this.labels);
      this.renderLabels();
    } catch (error) {
      console.error('Error fetching labels:', error);
      this.labels = []; // Initialize as empty array if fetch fails
      this.renderLabels();
    }
  }

  // Save Task Method
  async saveTask(e) {
    e.preventDefault();
    const taskData = this.collectTaskFormData();
    console.log('Saving task data:', taskData);
    
    try {
      const url = taskData.id 
        ? `${API_BASE_URL}/tasks/${taskData.id}` 
        : `${API_BASE_URL}/tasks`;
      
      const method = taskData.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to save task: ${errorBody}`);
      }

      this.fetchTasks();
      this.closeTaskModal();
    } catch (error) {
      console.error('Error saving task:', error);
      this.showErrorMessage(error.message);
    }
  }

  // Collect Task Form Data
  collectTaskFormData() {
    return {
      id: document.getElementById('task-id').value || null,
      title: document.getElementById('task-title').value,
      description: document.getElementById('task-description').value,
      dueDate: document.getElementById('task-due-date').value,
      priority: document.getElementById('task-priority').value,
      project: document.getElementById('task-project').value,
      section: document.getElementById('task-section').value,
      labels: document.getElementById('task-labels').value 
        ? document.getElementById('task-labels').value.split(',').map(l => l.trim())
        : [],
      recurring: document.getElementById('task-recurring').checked,
      recurringType: document.getElementById('recurring-type').value,
      customRecurringPattern: document.getElementById('custom-recurring-pattern').value,
      subtasks: Array.from(document.querySelectorAll('#subtasks-list .subtask-item'))
        .map(item => ({
          text: item.querySelector('span').textContent,
          completed: item.querySelector('input').checked
        })),
      createdAt: new Date().toISOString(),
      completed: false
    };
  }

  // Render Tasks with Filtering
  renderTasks(customTasks = null) {
    let filteredTasks = customTasks || [...this.tasks];
    console.log('Current view:', this.currentView);
    console.log('All tasks before filtering:', filteredTasks);

    // Apply view-based filtering
    switch (this.currentView) {
      case 'today':
        filteredTasks = filteredTasks.filter(task => {
          const today = new Date();
          const taskDate = new Date(task.dueDate);
          return taskDate.toDateString() === today.toDateString();
        });
        break;
      case 'upcoming':
        filteredTasks = filteredTasks.filter(task => {
          const today = new Date();
          const taskDate = new Date(task.dueDate);
          return taskDate > today;
        });
        break;
      case 'important':
        filteredTasks = filteredTasks.filter(task => task.priority === 'high' || task.priority === 'urgent');
        break;
      case 'completed':
        filteredTasks = filteredTasks.filter(task => task.completed === true);
        break;
    }

    console.log('Filtered tasks:', filteredTasks);
    this.taskContainer.innerHTML = '';
    filteredTasks.forEach(task => {
      const taskElement = this.createTaskElement(task);
      this.taskContainer.appendChild(taskElement);
    });
  }

  // Create Task Element
  createTaskElement(task) {
    const taskItem = document.createElement('div');
    taskItem.classList.add('task-item', `priority-${task.priority}`);
    
    // Add completed class if task is completed
    if (task.completed) {
      taskItem.classList.add('completed-task');
    }
    
    taskItem.innerHTML = `
      <div class="task-checkbox">
        <input type="checkbox" ${task.completed ? 'checked' : ''}>
      </div>
      <div class="task-content">
        <h3 class="task-title">${task.title}</h3>
        <div class="task-details">
          <span class="task-date">
            <i class="fas fa-calendar"></i>
            ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
          </span>
          ${task.project ? `<span class="task-project"><i class="fas fa-folder"></i>${task.project}</span>` : ''}
          <span class="task-priority">${task.priority.toUpperCase()}</span>
        </div>
        <div class="task-labels">
          ${task.labels.map(label => `<span class="task-label">${label}</span>`).join('')}
        </div>
      </div>
      <div class="task-actions">
        <button class="edit-task"><i class="fas fa-edit"></i></button>
        <button class="delete-task"><i class="fas fa-trash"></i></button>
      </div>
    `;

    // Add event listeners for task actions
    taskItem.querySelector('.edit-task').addEventListener('click', () => this.editTask(task));
    taskItem.querySelector('.delete-task').addEventListener('click', () => this.deleteTask(task._id));
    taskItem.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      const isCompleted = e.target.checked;
      console.log(`Toggling task ${task._id} completion to ${isCompleted}`);
      this.toggleTaskCompletion(task, isCompleted);
    });

    return taskItem;
  }

  // Delete Task
  async deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          this.fetchTasks();
          this.closeTaskModal();
        } else {
          throw new Error('Failed to delete task');
        }
      } catch (error) {
        console.error('Error deleting task:', error);
        this.showErrorMessage('Failed to delete task. Please try again.');
      }
    }
  }

  // Toggle Task Completion
  async toggleTaskCompletion(task, completed) {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${task._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...task, completed })
      });

      if (!response.ok) {
        throw new Error('Failed to update task completion');
      }
      
      // Update the local task immediately
      const taskIndex = this.tasks.findIndex(t => t._id === task._id);
      if (taskIndex !== -1) {
        this.tasks[taskIndex].completed = completed;
        this.renderTasks();
      } else {
        // If local update fails, refresh all tasks
        this.fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task completion:', error);
      this.showErrorMessage('Failed to update task. Please try again.');
    }
  }

  // Edit Task
  editTask(task) {
    this.openTaskModal(task);
  }

  // Open Task Modal
  openTaskModal(task = null) {
    // Reset and populate form
    this.taskForm.reset();
    document.getElementById('task-id').value = '';
    document.getElementById('subtasks-list').innerHTML = '';
    document.getElementById('recurring-options').classList.add('hidden');
    
    if (task) {
      // Populate form with existing task data
      Object.keys(task).forEach(key => {
        const field = document.getElementById(`task-${key}`);
        if (field) {
          if (key === 'labels') {
            field.value = task[key].join(', ');
          } else if (key === 'recurring') {
            field.checked = task[key];
            document.getElementById('recurring-options').classList.toggle('hidden', !task[key]);
          } else {
            field.value = task[key];
          }
        }
      });

      // Populate subtasks
      if (task.subtasks && task.subtasks.length > 0) {
        const subtasksList = document.getElementById('subtasks-list');
        task.subtasks.forEach(subtask => {
          const subtaskItem = document.createElement('li');
          subtaskItem.classList.add('subtask-item');
          subtaskItem.innerHTML = `
            <input type="checkbox" ${subtask.completed ? 'checked' : ''}>
            <span>${subtask.text}</span>
            <button type="button" class="remove-subtask">✕</button>
          `;
          subtasksList.appendChild(subtaskItem);
        });
      }

      // Set the MongoDB _id in the hidden input
      document.getElementById('task-id').value = task._id;
    }

    this.taskModal.style.display = 'block';
  }

  // Close Task Modal
  closeTaskModal() {
    this.taskModal.style.display = 'none';
  }

  // Add Subtask
  addSubtask() {
    const subtaskInput = document.querySelector('.subtask-input');
    const subtaskText = subtaskInput.value.trim();
    
    if (subtaskText) {
      const subtasksList = document.getElementById('subtasks-list');
      const subtaskItem = document.createElement('li');
      subtaskItem.classList.add('subtask-item');
      subtaskItem.innerHTML = `
        <input type="checkbox">
        <span>${subtaskText}</span>
        <button type="button" class="remove-subtask">✕</button>
      `;
      
      subtasksList.appendChild(subtaskItem);
      subtaskInput.value = '';
    }
  }

  // Add Reminder
  addReminder() {
    const reminderContainer = document.getElementById('reminders-container');
    const reminderInput = document.createElement('input');
    reminderInput.type = 'datetime-local';
    reminderInput.classList.add('reminder-input');
    reminderContainer.appendChild(reminderInput);
  }

  // Render Projects
  renderProjects() {
    // Update sidebar projects list
    this.projectsList.innerHTML = this.projects
      .map(project => `
        <li>
          <a href="#" data-project="${project.name}">${project.name}</a>
        </li>
      `).join('');

    // Add event listeners to project links
    document.querySelectorAll('#projects-list a[data-project]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const projectName = e.target.dataset.project;
        this.currentView = 'project';
        document.getElementById('current-view-title').textContent = `Project: ${projectName}`;
        this.renderTasks(this.tasks.filter(task => task.project === projectName));
      });
    });

    // Populate project dropdown in task modal
    const projectSelect = document.getElementById('task-project');
    projectSelect.innerHTML = `<option value="">Select Project</option>` + 
      this.projects.map(project => `
        <option value="${project.name}">${project.name}</option>
      `).join('');
  }

  // Render Labels
  renderLabels() {
    // Update sidebar labels list
    this.labelsList.innerHTML = this.labels
      .map(label => `
        <li>
          <a href="#" data-label="${label.name}">${label.name}</a>
        </li>
      `).join('');

    // Add event listeners to label links
    document.querySelectorAll('#labels-list a[data-label]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const labelName = e.target.dataset.label;
        this.currentView = 'label';
        document.getElementById('current-view-title').textContent = `Label: ${labelName}`;
        this.renderTasks(this.tasks.filter(task => 
          task.labels && task.labels.includes(labelName)
        ));
      });
    });
  }

  // Search Tasks
  searchTasks() {
    const searchQuery = this.searchInput.value.toLowerCase().trim();
    if (!searchQuery) {
      // If search is cleared, revert to normal view
      this.renderTasks();
      return;
    }
    
    const filteredTasks = this.tasks.filter(task => 
      task.title.toLowerCase().includes(searchQuery) ||
      (task.description && task.description.toLowerCase().includes(searchQuery)) ||
      (task.labels && task.labels.some(label => label.toLowerCase().includes(searchQuery)))
    );
    
    this.renderTasks(filteredTasks);
  }

  // Sort Tasks
  sortTasks() {
    const sortBy = this.sortSelect.value;
    
    const sortedTasks = [...this.tasks].sort((a, b) => {
      switch(sortBy) {
        case 'dueDate':
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'priority':
          const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'createdAt':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
    
    this.renderTasks(sortedTasks);
  }

  // Add Project
  async addProject() {
    const projectName = prompt('Enter project name:');
    if (!projectName || projectName.trim() === '') {
      return;
    }
    
    if (this.projects.some(p => p.name === projectName)) {
      this.showErrorMessage('A project with this name already exists.');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: projectName })
      });

      if (!response.ok) {
        throw new Error('Failed to add project');
      }

      const newProject = await response.json();
      this.projects.push(newProject);
      this.renderProjects();
    } catch (error) {
      console.error('Error adding project:', error);
      this.showErrorMessage('Failed to add project. Please try again.');
    }
  }

  // Add Label
  async addLabel() {
    const labelName = prompt('Enter label name:');
    if (!labelName || labelName.trim() === '') {
      return;
    }
    
    if (this.labels.some(l => l.name === labelName)) {
      this.showErrorMessage('A label with this name already exists.');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/labels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: labelName })
      });

      if (!response.ok) {
        throw new Error('Failed to add label');
      }

      const newLabel = await response.json();
      this.labels.push(newLabel);
      this.renderLabels();
    } catch (error) {
      console.error('Error adding label:', error);
      this.showErrorMessage('Failed to add label. Please try again.');
    }
  }

  // Show Error Message
  showErrorMessage(message) {
    alert(message);
  }
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  new TaskManager();
});