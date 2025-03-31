// Load environment variables from .env
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// Debugging: Check if environment variables are loaded correctly
console.log("Loaded MongoDB URI:", process.env.MONGODB_URI ? "Exists" : "MISSING!");
console.log("Loaded Port:", process.env.PORT || "5000");

// Ensure MongoDB URI is available
if (!process.env.MONGODB_URI) {
  console.error("ERROR: MONGODB_URI is undefined. Check if .env is loaded correctly.");
  process.exit(1); // Exit the app if MongoDB URI is missing
}

// Express App Setup
const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
app.use(cors({
  origin: [
    'http://localhost:3000',  // React frontend
    'http://localhost:5500',  // Live Server
    'http://127.0.0.1:5500'  // Alternative localhost
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(bodyParser.json());
app.use(express.json()); // Additional middleware for parsing JSON

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1); // Stop the app if the database isn't connected
  });

//  MongoDB connection event listeners
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to database');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// Task Schema
const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  project: { type: String },
  section: { type: String },
  labels: [{ type: String }],
  recurring: { type: Boolean, default: false },
  recurringType: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'] },
  customRecurringPattern: { type: String },
  subtasks: [{
    text: { type: String },
    completed: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now },
  completed: { type: Boolean, default: false }
});

// Project Schema
const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

// Label Schema
const LabelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

// Models
const Task = mongoose.model('Task', TaskSchema);
const Project = mongoose.model('Project', ProjectSchema);
const Label = mongoose.model('Label', LabelSchema);

// Task Routes
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create Task
app.post('/api/tasks', async (req, res) => {
  const task = new Task(req.body);

  try {
    const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update Task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete Task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Project Routes
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  const project = new Project(req.body);
  try {
    const newProject = await project.save();
    res.status(201).json(newProject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Label Routes
app.get('/api/labels', async (req, res) => {
  try {
    const labels = await Label.find();
    res.json(labels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/labels', async (req, res) => {
  const label = new Label(req.body);
  try {
    const newLabel = await label.save();
    res.status(201).json(newLabel);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;