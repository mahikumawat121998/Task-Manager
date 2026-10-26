/**
 * In-memory fallback task store.
 * Used whenever MongoDB is disconnected or undergoing setup,
 * ensuring zero downtime and instant developer feedback.
 */

const defaultInitialTasks = [
  {
    id: 'demo-task-1',
    title: 'Initialize MongoDB connection & verify environment',
    description: 'Connect your local MongoDB daemon (mongodb://localhost:27017) or add MongoDB Atlas connection URI to .env.local',
    status: 'todo',
    priority: 'urgent',
    category: 'Database',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    subtasks: [
      { id: 'sub-1', title: 'Open .env.local file', completed: true },
      { id: 'sub-2', title: 'Verify MONGODB_URI connection string', completed: false },
      { id: 'sub-3', title: 'Test CRUD operations in TaskFlow UI', completed: false }
    ],
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-task-2',
    title: 'Design responsive Kanban Board & drag interactions',
    description: 'Implement smooth drag and drop status transitions between To Do, In Progress, Review, and Completed columns.',
    status: 'in-progress',
    priority: 'high',
    category: 'Frontend',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    subtasks: [
      { id: 'sub-4', title: 'Column dragover indicators', completed: true },
      { id: 'sub-5', title: 'Kanban cards smooth lift shadow', completed: true },
      { id: 'sub-6', title: 'Instant optimistic status sync', completed: false }
    ],
    order: 1,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-task-3',
    title: 'Implement dense List View with inline status changes',
    description: 'Provide an organized table view of tasks with quick inline status and priority management.',
    status: 'review',
    priority: 'medium',
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    subtasks: [
      { id: 'sub-7', title: 'Table column formatting', completed: true },
      { id: 'sub-8', title: 'Quick status dropdown action', completed: true }
    ],
    order: 2,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-task-4',
    title: 'Setup Next.js App Router project architecture',
    description: 'Configured Next.js 15+ App Router with Vanilla CSS design system and REST API Route Handlers.',
    status: 'completed',
    priority: 'low',
    category: 'Setup',
    dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    subtasks: [
      { id: 'sub-9', title: 'Create Next.js project structure', completed: true },
      { id: 'sub-10', title: 'Setup Mongoose schema and model', completed: true },
      { id: 'sub-11', title: 'Create API endpoints for tasks CRUD', completed: true }
    ],
    order: 3,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

if (!global.__memoryTasks) {
  global.__memoryTasks = [...defaultInitialTasks];
}

export const MemoryStore = {
  getTasks: (filters = {}) => {
    let result = [...global.__memoryTasks];

    if (filters.status && filters.status !== 'all') {
      result = result.filter(t => t.status === filters.status);
    }
    if (filters.category && filters.category !== 'all') {
      result = result.filter(t => t.category.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.priority && filters.priority !== 'all') {
      result = result.filter(t => t.priority === filters.priority);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || 
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q))
      );
    }

    return result;
  },

  getTaskById: (id) => {
    return global.__memoryTasks.find(t => t.id === id || t._id === id);
  },

  createTask: (data) => {
    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: data.title,
      description: data.description || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      category: data.category || 'General',
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      subtasks: Array.isArray(data.subtasks) ? data.subtasks : [],
      order: global.__memoryTasks.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    global.__memoryTasks.unshift(newTask);
    return newTask;
  },

  updateTask: (id, updates) => {
    const index = global.__memoryTasks.findIndex(t => t.id === id || t._id === id);
    if (index === -1) return null;

    global.__memoryTasks[index] = {
      ...global.__memoryTasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return global.__memoryTasks[index];
  },

  deleteTask: (id) => {
    const prevLen = global.__memoryTasks.length;
    global.__memoryTasks = global.__memoryTasks.filter(t => t.id !== id && t._id !== id);
    return global.__memoryTasks.length < prevLen;
  },

  clearCompleted: () => {
    const countBefore = global.__memoryTasks.length;
    global.__memoryTasks = global.__memoryTasks.filter(t => t.status !== 'completed');
    return countBefore - global.__memoryTasks.length;
  },

  resetWithDemoData: () => {
    global.__memoryTasks = [...defaultInitialTasks];
    return global.__memoryTasks;
  }
};

