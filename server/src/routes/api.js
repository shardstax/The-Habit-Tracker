const express = require('express');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const tasks = require('../controllers/tasksController');
const templates = require('../controllers/recurringTemplatesController');
const goals = require('../controllers/goalsController');
const tags = require('../controllers/tagsController');
const journal = require('../controllers/journalController');
const mindset = require('../controllers/mindsetController');
const reminders = require('../controllers/remindersController');
const motivation = require('../controllers/motivationController');
const github = require('../controllers/githubController');

const router = express.Router();

router.use(auth);

// Tasks
router.get('/tasks/search', asyncHandler(tasks.searchTasks));
router.get('/tasks', asyncHandler(tasks.listTasks));
router.get('/tasks/vault', asyncHandler(tasks.listVault));
router.post('/tasks', asyncHandler(tasks.createTask));
router.patch('/tasks/:id', asyncHandler(tasks.updateTask));
router.delete('/tasks/:id', asyncHandler(tasks.deleteTask));
router.post('/tasks/:id/push', asyncHandler(tasks.pushTask));
router.post('/tasks/:id/restore', asyncHandler(tasks.restoreTask));

// Recurring templates
router.get('/recurring-templates', asyncHandler(templates.listTemplates));
router.post('/recurring-templates', asyncHandler(templates.createTemplate));
router.patch('/recurring-templates/:id', asyncHandler(templates.updateTemplate));
router.delete('/recurring-templates/:id', asyncHandler(templates.deleteTemplate));

// Goals
router.get('/goals', asyncHandler(goals.listGoals));
router.post('/goals', asyncHandler(goals.createGoal));
router.patch('/goals/:id', asyncHandler(goals.updateGoal));
router.delete('/goals/:id', asyncHandler(goals.deleteGoal));
router.post('/goals/:id/link-task', asyncHandler(goals.linkTask));
router.post('/goals/:id/unlink-task', asyncHandler(goals.unlinkTask));
router.get('/goals/:id/analytics', asyncHandler(goals.getAnalytics));
router.get('/goals/:id/tasks', asyncHandler(goals.getGoalTasks));

// Tags
router.get('/tags', asyncHandler(tags.listTags));
router.post('/tags', asyncHandler(tags.createTag));
router.delete('/tags/:id', asyncHandler(tags.deleteTag));
router.post('/tags/assign', asyncHandler(tags.assignTag));
router.post('/tags/unassign', asyncHandler(tags.unassignTag));

// Journal
router.get('/journal', asyncHandler(journal.getEntry));
router.post('/journal', asyncHandler(journal.saveEntry));
router.get('/journal/history', asyncHandler(journal.history));

// Mindset
router.get('/mindset', asyncHandler(mindset.listNotes));
router.post('/mindset', asyncHandler(mindset.createNote));
router.patch('/mindset/:id', asyncHandler(mindset.updateNote));
router.delete('/mindset/:id', asyncHandler(mindset.deleteNote));

// Reminders
router.get('/reminders', asyncHandler(reminders.listReminders));
router.post('/reminders/:id/read', asyncHandler(reminders.markRead));

// Motivation
router.get('/motivation/today', asyncHandler(motivation.getToday));

// GitHub integration
router.get('/integrations/github/settings', asyncHandler(github.getSettings));
router.post('/integrations/github/settings', asyncHandler(github.saveSettings));
router.get('/integrations/github/stats', asyncHandler(github.getStats));
router.post('/integrations/github/refresh', asyncHandler(github.refreshStats));

module.exports = router;
