class TaskManager {
    constructor() {
      // Initialize storage and key elements
      this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
      
      // Add default projects if none exist in local storage
      this.projects = JSON.parse(localStorage.getItem('projects')) || ['Work', 'Personal', 'Shopping'];
      
      // Add default labels
      this.labels = JSON.parse(localStorage.getItem('labels')) || ['Important', 'Urgent', 'Quick Task'];
  
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
  
      // Bind event listeners
      this.bindEvents();
  
      // Initial render
      this.renderTasks();
      this.renderProjects();
      this.renderLabels();
  
      // Save initial projects to local storage if not already there
      this.saveToStorage();
    }
  
    // Event Binding Method
    bindEvents() {
      // Task Modal Events
      document.querySelector('.close-modal').addEventListener('click', () => this.closeTaskModal());
      this.addTaskBtn.addEventListener('click', () => this.openTaskModal());
      this.taskForm.addEventListener('submit', (e) => this.saveTask(e));
  
      // View Navigation Events
      document.querySelectorAll('.sidebar a[data-view]').forEach(link => {
        link.addEventListener('click', (e) => this.filterTasks(e.target.dataset.view));
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
  
    // Task Creation and Management
    saveTask(e) {
      e.preventDefault();
      const taskData = this.collectTaskFormData();
      
      if (taskData.id) {
        // Update existing task
        const index = this.tasks.findIndex(t => t.id === taskData.id);
        this.tasks[index] = taskData;
      } else {
        // Create new task
        taskData.id = Date.now().toString();
        this.tasks.push(taskData);
      }
  
      this.saveToStorage();
      this.renderTasks();
      this.closeTaskModal();
    }
  
    collectTaskFormData() {
      return {
        id: document.getElementById('task-id').value,
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
  
    // Rendering Methods
    renderTasks(tasksToRender = this.tasks) {
      this.taskContainer.innerHTML = '';
      tasksToRender.forEach(task => {
        const taskElement = this.createTaskElement(task);
        this.taskContainer.appendChild(taskElement);
      });
    }
  
    createTaskElement(task) {
      const taskItem = document.createElement('div');
      taskItem.classList.add('task-item', `priority-${task.priority}`);
      taskItem.innerHTML = `
        <div class="task-checkbox">
          <input type="checkbox" ${task.completed ? 'checked' : ''}>
        </div>
        <div class="task-content">
          <h3 class="task-title">${task.title}</h3>
          <div class="task-details">
            <span class="task-date"><i class="fas fa-calendar"></i>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
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
      taskItem.querySelector('.delete-task').addEventListener('click', () => this.deleteTask(task.id));
      taskItem.querySelector('input[type="checkbox"]').addEventListener('change', (e) => this.toggleTaskCompletion(task, e.target.checked));
  
      return taskItem;
    }
  
    // Task Filtering and Sorting
    filterTasks(view) {
      let filteredTasks = [...this.tasks];
      const currentViewTitle = document.getElementById('current-view-title');
  
      switch(view) {
        case 'today':
          filteredTasks = filteredTasks.filter(task => {
            const taskDate = new Date(task.dueDate);
            const today = new Date();
            return taskDate.toDateString() === today.toDateString();
          });
          currentViewTitle.textContent = 'Today\'s Tasks';
          break;
        case 'upcoming':
          filteredTasks = filteredTasks.filter(task => new Date(task.dueDate) > new Date());
          currentViewTitle.textContent = 'Upcoming Tasks';
          break;
        case 'important':
          filteredTasks = filteredTasks.filter(task => task.priority === 'high' || task.priority === 'urgent');
          currentViewTitle.textContent = 'Important Tasks';
          break;
        case 'completed':
          filteredTasks = filteredTasks.filter(task => task.completed);
          currentViewTitle.textContent = 'Completed Tasks';
          break;
        default:
          currentViewTitle.textContent = 'All Tasks';
      }
  
      this.renderTasks(filteredTasks);
    }
  
    sortTasks() {
      const sortBy = this.sortSelect.value;
      const sortedTasks = [...this.tasks].sort((a, b) => {
        switch(sortBy) {
          case 'dueDate': 
            // Handle tasks without due dates
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
          case 'priority': 
            const priorityOrder = ['low', 'medium', 'high', 'urgent'];
            return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
          case 'createdAt': return new Date(a.createdAt) - new Date(b.createdAt);
          case 'title': return a.title.localeCompare(b.title);
        }
      });
  
      this.renderTasks(sortedTasks);
    }
  
    searchTasks() {
      const searchTerm = this.searchInput.value.toLowerCase();
      const searchResults = this.tasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm) ||
        task.labels.some(label => label.toLowerCase().includes(searchTerm))
      );
  
      this.renderTasks(searchResults);
    }
  
    // Project and Label Management
    addProject() {
      const projectName = prompt('Enter project name:');
      if (projectName && !this.projects.includes(projectName)) {
        this.projects.push(projectName);
        this.saveToStorage();
        this.renderProjects();
      }
    }
  
    renderProjects() {
      // Update sidebar projects list
      this.projectsList.innerHTML = this.projects
        .map(project => `
          <li>
            <a href="#" data-project="${project}">${project}</a>
          </li>
        `).join('');
  
      // Populate project dropdown in task modal
      const projectSelect = document.getElementById('task-project');
      projectSelect.innerHTML = `<option value="">Select Project</option>` + 
        this.projects.map(project => `
          <option value="${project}">${project}</option>
        `).join('');
    }
  
    addLabel() {
      const labelName = prompt('Enter label name:');
      if (labelName && !this.labels.includes(labelName)) {
        this.labels.push(labelName);
        this.saveToStorage();
        this.renderLabels();
      }
    }
  
    renderLabels() {
      this.labelsList.innerHTML = this.labels
        .map(label => `
          <li>
            <a href="#" data-label="${label}">${label}</a>
          </li>
        `).join('');
    }
  
    // Modal Methods
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
            field.value = task[key];
          }
        });
  
        // Populate subtasks
        if (task.subtasks) {
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
  
        document.getElementById('delete-task-btn').classList.remove('hidden');
      }
  
      this.taskModal.style.display = 'block';
    }
  
    closeTaskModal() {
      this.taskModal.style.display = 'none';
    }
  
    // Additional Task Management Methods
    editTask(task) {
      this.openTaskModal(task);
    }
  
    deleteTask(taskId) {
      if (confirm('Are you sure you want to delete this task?')) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveToStorage();
        this.renderTasks();
        this.closeTaskModal();
      }
    }
  
    toggleTaskCompletion(task, completed) {
      task.completed = completed;
      this.saveToStorage();
      this.renderTasks();
    }
  
    // Subtask and Reminder Methods
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
  
    addReminder() {
      // Placeholder for advanced reminder functionality
      const reminderContainer = document.getElementById('reminders-container');
      const reminderInput = document.createElement('input');
      reminderInput.type = 'datetime-local';
      reminderInput.classList.add('reminder-input');
      reminderContainer.appendChild(reminderInput);
    }
  
    // Storage Methods
    saveToStorage() {
      localStorage.setItem('tasks', JSON.stringify(this.tasks));
      localStorage.setItem('projects', JSON.stringify(this.projects));
      localStorage.setItem('labels', JSON.stringify(this.labels));
    }
  }
  
  // Initialize the application when the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', () => {
    new TaskManager();
  });