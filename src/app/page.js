'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Plus, Search, Moon, Sun, Volume2, VolumeX,
  Kanban, ListTodo, CheckCircle2,
  Clock, AlertTriangle, Trash2, Edit3, X,
  Calendar, Check, Database, RefreshCw, Upload, Download, Sparkles,
  Layers, Menu
} from 'lucide-react';

// Safe helper for date comparison without calling .split()
const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  try {
    const dateObj = d1 instanceof Date ? d1 : new Date(d1);
    if (isNaN(dateObj.getTime())) return false;
    return dateObj.toDateString() === d2.toDateString();
  } catch {
    return false;
  }
};

// Safe helper to format a Date into local YYYY-MM-DDTHH:mm for datetime-local input
const formatForDateTimeInput = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    return `${y}-${m}-${day}T${hours}:${mins}`;
  } catch {
    return '';
  }
};

// Human readable date preview text
const getDueDateHumanText = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export default function TaskFlowApp() {
  // ------------------- APPLICATION STATE -------------------
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('kanban'); // 'kanban' | 'list'
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'today' | 'upcoming' | 'overdue' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('createdAt-desc');
  const [theme, setTheme] = useState('dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState({ connected: false, source: 'checking', message: '' });
  const [toasts, setToasts] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState('todo');
  const [formPriority, setFormPriority] = useState('medium');
  const [formDueDate, setFormDueDate] = useState('');
  const [formSubtasks, setFormSubtasks] = useState([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [formError, setFormError] = useState('');

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [activeDropCol, setActiveDropCol] = useState(null);

  const searchInputRef = useRef(null);
  const dateInputRef = useRef(null);

  // ------------------- TOAST NOTIFICATIONS -------------------
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  // ------------------- AUDIO SYNTHESIZER -------------------
  const playCompletionSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.18); // G5
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext fallback
    }
  }, [soundEnabled]);

  // ------------------- CELEBRATION CONFETTI (Dynamic Import) -------------------
  const triggerConfetti = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;
      const confettiModule = await import('canvas-confetti');
      const fire = confettiModule.default || confettiModule;
      if (typeof fire === 'function') {
        fire({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
        });
      }
    } catch {
      // safe fallback if confetti is unavailable
    }
  }, []);

  // ------------------- INITIAL LOAD & DATABASE HEALTH -------------------
  const checkDatabaseHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.database && data.database.connected) {
        setDbStatus({
          connected: true,
          source: 'mongodb',
          message: `Connected to MongoDB (${data.database.name})`,
        });
      } else {
        setDbStatus({
          connected: false,
          source: 'memory',
          message: 'MongoDB disconnected • Running in fast in-memory mode',
        });
      }
    } catch {
      setDbStatus({
        connected: false,
        source: 'memory',
        message: 'Running in demo memory mode',
      });
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks`);
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
      showToast('Error loading tasks. Using local fallback.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    checkDatabaseHealth();
    loadTasks();
  }, [checkDatabaseHealth, loadTasks]);

  // Apply Theme to DOM
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // ------------------- KEYBOARD SHORTCUTS -------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when user is typing in inputs or textareas
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openCreateModal();
      } else if (e.key === '/' || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setIsModalOpen(false);
        setIsShortcutsOpen(false);
      } else if (e.key === '1') {
        setCurrentView('kanban');
      } else if (e.key === '2') {
        setCurrentView('list');
      } else if (e.key === 't' || e.key === 'T') {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
      } else if (e.key === '?') {
        setIsShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ------------------- DERIVED METRICS -------------------
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const now = new Date();

    const dueToday = tasks.filter((t) => {
      if (!t.dueDate || t.status === 'completed') return false;
      return isSameDay(t.dueDate, now);
    }).length;

    const overdue = tasks.filter((t) => {
      if (!t.dueDate || t.status === 'completed') return false;
      const dueObj = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
      if (isNaN(dueObj.getTime())) return false;
      return dueObj < now && !isSameDay(t.dueDate, now);
    }).length;

    const urgentCount = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length;

    return { total, completed, inProgress, rate, dueToday, overdue, urgentCount };
  }, [tasks]);

  // ------------------- FILTERING & SORTING -------------------
  const filteredTasks = useMemo(() => {
    const now = new Date();

    return tasks.filter((t) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = t.title ? t.title.toLowerCase().includes(q) : false;
        const descMatch = t.description ? t.description.toLowerCase().includes(q) : false;
        if (!titleMatch && !descMatch) return false;
      }

      // 2. Quick Filter
      if (activeFilter === 'today') {
        if (!t.dueDate) return false;
        if (!isSameDay(t.dueDate, now)) return false;
      } else if (activeFilter === 'upcoming') {
        if (!t.dueDate) return false;
        const dueObj = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
        if (isNaN(dueObj.getTime()) || dueObj <= now) return false;
      } else if (activeFilter === 'overdue') {
        if (!t.dueDate || t.status === 'completed') return false;
        const dueObj = t.dueDate instanceof Date ? t.dueDate : new Date(t.dueDate);
        if (isNaN(dueObj.getTime()) || dueObj >= now || isSameDay(t.dueDate, now)) return false;
      } else if (activeFilter === 'completed') {
        if (t.status !== 'completed') return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'createdAt-asc') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (sortOrder === 'createdAt-desc') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortOrder === 'dueDate-asc') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (sortOrder === 'dueDate-desc') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate) - new Date(a.dueDate);
      }
      if (sortOrder === 'priority-desc') {
        const weight = { urgent: 4, high: 3, medium: 2, low: 1 };
        return (weight[b.priority] || 0) - (weight[a.priority] || 0);
      }
      if (sortOrder === 'title-asc') {
        const titleA = a.title || '';
        const titleB = b.title || '';
        return titleA.localeCompare(titleB);
      }
      return 0;
    });
  }, [tasks, searchQuery, activeFilter, sortOrder]);

  // ------------------- CRUD OPERATIONS -------------------
  const openCreateModal = (defaultStatus = 'todo') => {
    setEditingTask(null);
    setFormTitle('');
    setFormDesc('');
    setFormStatus(defaultStatus);
    setFormPriority('medium');
    setFormDueDate('');
    setFormSubtasks([]);
    setNewSubtaskText('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setFormTitle(task.title || '');
    setFormDesc(task.description || '');
    setFormStatus(task.status || 'todo');
    setFormPriority(task.priority || 'medium');
    setFormDueDate(formatForDateTimeInput(task.dueDate));
    setFormSubtasks(Array.isArray(task.subtasks) ? [...task.subtasks] : []);
    setNewSubtaskText('');
    setFormError('');
    setIsModalOpen(true);
  };

  const setQuickDueDate = (type) => {
    const d = new Date();
    if (type === 'today') {
      d.setHours(18, 0, 0, 0);
    } else if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
    } else if (type === 'in3days') {
      d.setDate(d.getDate() + 3);
      d.setHours(10, 0, 0, 0);
    } else if (type === 'nextweek') {
      const day = d.getDay();
      const diff = ((7 - day + 1) % 7) || 7;
      d.setDate(d.getDate() + diff);
      d.setHours(10, 0, 0, 0);
    } else if (type === 'clear') {
      setFormDueDate('');
      return;
    }
    setFormDueDate(formatForDateTimeInput(d));
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Task title is required');
      return;
    }

    const payload = {
      title: formTitle.trim(),
      description: formDesc.trim(),
      status: formStatus,
      priority: formPriority,
      dueDate: formDueDate ? new Date(formDueDate).toISOString() : null,
      subtasks: formSubtasks,
    };

    try {
      if (editingTask) {
        // Optimistic UI Update
        const updatedList = tasks.map((t) => (t.id === editingTask.id ? { ...t, ...payload } : t));
        setTasks(updatedList);
        setIsModalOpen(false);

        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && data.task) {
          setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? data.task : t)));
          showToast('Task updated successfully', 'success');
        }
      } else {
        // Create new task
        const tempId = 'temp-' + Date.now();
        const optimisticTask = { ...payload, id: tempId, createdAt: new Date().toISOString() };
        setTasks((prev) => [optimisticTask, ...prev]);
        setIsModalOpen(false);

        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && data.task) {
          setTasks((prev) => prev.map((t) => (t.id === tempId ? data.task : t)));
          showToast('Task created successfully', 'success');
        }
      }
    } catch (err) {
      console.error('Error saving task:', err);
      showToast('Failed to save task. Reverting changes.', 'danger');
      loadTasks();
    }
  };

  const handleDeleteTask = async (taskId) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    // Optimistic remove
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    showToast(`Task "${taskToDelete?.title?.slice(0, 24) || 'Task'}..." deleted`, 'info');

    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting task:', err);
      showToast('Error deleting task from server', 'danger');
      loadTasks();
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    const isNowCompleted = newStatus === 'completed';

    if (isNowCompleted) {
      playCompletionSound();
      triggerConfetti();
      showToast('Task marked as completed! 🎉', 'success');
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      loadTasks();
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    if (newStatus === 'completed') {
      playCompletionSound();
      triggerConfetti();
    }

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      loadTasks();
    }
  };

  const handleClearCompleted = async () => {
    const completedCount = tasks.filter((t) => t.status === 'completed').length;
    if (completedCount === 0) {
      showToast('No completed tasks to clear', 'info');
      return;
    }

    setTasks((prev) => prev.filter((t) => t.status !== 'completed'));
    showToast(`Cleared ${completedCount} completed tasks`, 'info');

    try {
      await fetch('/api/tasks?action=clear-completed', { method: 'DELETE' });
    } catch {
      loadTasks();
    }
  };

  const handleSeedDemoData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tasks/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Sample tasks loaded successfully!', 'success');
        await loadTasks();
      }
    } catch {
      showToast('Failed to seed tasks', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // ------------------- SUBTASKS IN MODAL -------------------
  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const newSub = {
      id: 'sub_' + Date.now() + Math.random().toString(36).substring(2, 5),
      title: newSubtaskText.trim(),
      completed: false,
    };
    setFormSubtasks((prev) => [...prev, newSub]);
    setNewSubtaskText('');
  };

  const handleToggleFormSubtask = (subId) => {
    setFormSubtasks((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleDeleteFormSubtask = (subId) => {
    setFormSubtasks((prev) => prev.filter((s) => s.id !== subId));
  };

  // ------------------- DRAG AND DROP (KANBAN) -------------------
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropCol !== colStatus) {
      setActiveDropCol(colStatus);
    }
  };

  const handleDragLeave = () => {
    setActiveDropCol(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setActiveDropCol(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    handleUpdateStatus(taskId, targetStatus);
    setDraggedTaskId(null);
  };

  // ------------------- EXPORT / IMPORT -------------------
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `taskflow_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Tasks exported to JSON', 'success');
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result);
        if (Array.isArray(imported)) {
          for (const item of imported) {
            await fetch('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            });
          }
          await loadTasks();
          showToast(`Successfully imported ${imported.length} tasks!`, 'success');
        } else {
          showToast('Invalid JSON file structure', 'danger');
        }
      } catch {
        showToast('Failed to parse JSON file', 'danger');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Helper date formatter - Safe against non-date types
  const formatDueDate = (dateVal) => {
    if (!dateVal) return null;
    try {
      const due = dateVal instanceof Date ? dateVal : new Date(dateVal);
      if (isNaN(due.getTime())) return null;
      const now = new Date();
      const isOverdue = due < now && !isSameDay(due, now);
      const isToday = isSameDay(due, now);

      const formatted = due.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return { text: formatted, isOverdue, isToday };
    } catch {
      return null;
    }
  };

  return (
    <div className="app-layout">
      {/* ------------------- SIDEBAR ------------------- */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`} id="app-sidebar">
        <div className="sidebar-header">
          <div className="brand-logo" onClick={() => setActiveFilter('all')}>
            <div className="logo-icon">
              <Sparkles size={20} />
            </div>
            <div className="brand-text">
              <span className="brand-name">TaskFlow</span>
              <span className="brand-badge">PRO</span>
            </div>
          </div>
          <button
            className="icon-btn mobile-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-action">
          <button
            className="btn btn-primary btn-block new-task-trigger"
            onClick={() => openCreateModal()}
            id="btn-create-task-sidebar"
          >
            <Plus size={18} />
            <span>Create Task</span>
            <kbd className="shortcut-pill">N</kbd>
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">VIEWS</div>
          <ul className="nav-list">
            <li className={`nav-item ${currentView === 'kanban' ? 'active' : ''}`}>
              <button className="nav-link" onClick={() => setCurrentView('kanban')}>
                <Kanban size={17} />
                <span>Kanban Board</span>
                <span className="nav-badge">{tasks.length}</span>
              </button>
            </li>
            <li className={`nav-item ${currentView === 'list' ? 'active' : ''}`}>
              <button className="nav-link" onClick={() => setCurrentView('list')}>
                <ListTodo size={17} />
                <span>List View</span>
                <span className="nav-badge">{tasks.length}</span>
              </button>
            </li>
          </ul>

          <div className="nav-section-label">FILTERS</div>
          <ul className="nav-list">
            <li className={`nav-item ${activeFilter === 'all' ? 'active' : ''}`}>
              <button
                className="nav-link"
                onClick={() => setActiveFilter('all')}
              >
                <Layers size={16} />
                <span>All Tasks</span>
                <span className="count-tag">{metrics.total}</span>
              </button>
            </li>
            <li className={`nav-item ${activeFilter === 'today' ? 'active' : ''}`}>
              <button
                className="nav-link"
                onClick={() => setActiveFilter(activeFilter === 'today' ? 'all' : 'today')}
              >
                <Clock size={16} />
                <span>Due Today</span>
                <span className="count-tag count-warning">{metrics.dueToday}</span>
              </button>
            </li>
            <li className={`nav-item ${activeFilter === 'overdue' ? 'active' : ''}`}>
              <button
                className="nav-link"
                onClick={() => setActiveFilter(activeFilter === 'overdue' ? 'all' : 'overdue')}
              >
                <AlertTriangle size={16} />
                <span>Overdue</span>
                <span className="count-tag count-danger">{metrics.overdue}</span>
              </button>
            </li>
            <li className={`nav-item ${activeFilter === 'completed' ? 'active' : ''}`}>
              <button
                className="nav-link"
                onClick={() => setActiveFilter(activeFilter === 'completed' ? 'all' : 'completed')}
              >
                <CheckCircle2 size={16} />
                <span>Completed</span>
                <span className="count-tag count-success">{metrics.completed}</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="storage-info">
            <div className="storage-header">
              <span>Productivity Score</span>
              <span className="storage-val">{metrics.rate}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${metrics.rate}%` }}></div>
            </div>
          </div>

          <div className="sidebar-quick-tools">
            <button className="tool-btn" onClick={handleExportJSON} title="Export Tasks (JSON)">
              <Download size={15} />
              <span>Export</span>
            </button>
            <label className="tool-btn" title="Import Tasks (JSON)">
              <Upload size={15} />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportJSON}
              />
            </label>
            <button className="tool-btn" onClick={handleSeedDemoData} title="Load Demo Tasks">
              <RefreshCw size={15} />
              <span>Demo</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ------------------- MAIN CONTENT ------------------- */}
      <main className="app-main">
        {/* Top App Bar */}
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              className="icon-btn mobile-menu-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Toggle Navigation Sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="page-title-group">
              <h1 className="page-title">
                {currentView === 'kanban' ? 'Kanban Board' : 'Task List'}
              </h1>
              <p className="page-subtitle">
                {currentView === 'kanban'
                  ? 'Drag, organize, and advance tasks across workflow stages.'
                  : 'Dense filterable view with inline status and subtask progress.'}
              </p>
            </div>
          </div>

          <div className="topbar-right">
            {/* MongoDB Connection Status Pill */}
            <div
              className={`db-status-chip ${dbStatus.connected ? 'connected' : 'memory-mode'}`}
              title={dbStatus.message}
            >
              <span className="status-pulsing-dot" />
              <Database size={14} />
              <span>{dbStatus.connected ? 'MongoDB Active' : 'Demo Memory Mode'}</span>
            </div>

            {/* Global Search Input */}
            <div className="search-box">
              <Search className="search-icon" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, notes... (/)"
                autoComplete="off"
              />
              {searchQuery ? (
                <button
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear Search"
                >
                  &times;
                </button>
              ) : (
                <kbd className="search-kbd">/</kbd>
              )}
            </div>

            {/* Sort Order Selector */}
            <div className="custom-select-wrapper">
              <select
                className="custom-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                title="Sort Tasks"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="dueDate-asc">Due Date (Earliest)</option>
                <option value="dueDate-desc">Due Date (Latest)</option>
                <option value="priority-desc">Priority (High to Low)</option>
                <option value="title-asc">Title (A &rarr; Z)</option>
              </select>
            </div>

            {/* Sound Toggle */}
            <button
              className="icon-btn"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                showToast(soundEnabled ? 'Sound muted' : 'Sound enabled', 'info');
              }}
              title={soundEnabled ? 'Mute Audio Effects' : 'Enable Audio Effects'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* Theme Toggle */}
            <button
              className="icon-btn theme-toggle-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Primary Top Action */}
            <button
              className="btn btn-primary new-task-trigger"
              onClick={() => openCreateModal()}
              id="btn-create-task-topbar"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Add Task</span>
            </button>
          </div>
        </header>

        {/* Productivity Metrics Strip */}
        <section className="metrics-strip">
          <div className="metric-card">
            <div className="metric-icon-wrap icon-blue">
              <Layers size={20} />
            </div>
            <div className="metric-content">
              <span className="metric-label">Total Tasks</span>
              <span className="metric-number">{metrics.total}</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-wrap icon-amber">
              <Clock size={20} />
            </div>
            <div className="metric-content">
              <span className="metric-label">In Progress</span>
              <span className="metric-number">{metrics.inProgress}</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-wrap icon-green">
              <CheckCircle2 size={20} />
            </div>
            <div className="metric-content">
              <span className="metric-label">Completed</span>
              <div className="metric-inline">
                <span className="metric-number">{metrics.completed}</span>
                <span className="metric-subtext">({metrics.rate}%)</span>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-wrap icon-rose">
              <AlertTriangle size={20} />
            </div>
            <div className="metric-content">
              <span className="metric-label">Overdue / Urgent</span>
              <span className="metric-number">{metrics.overdue + metrics.urgentCount}</span>
            </div>
          </div>
        </section>

        {/* Active Filters Pill Bar */}
        {(activeFilter !== 'all' || searchQuery) && (
          <section className="active-filter-bar">
            <span className="filter-bar-title">Active Filters:</span>
            <div className="filter-chips-wrapper">
              {activeFilter !== 'all' && (
                <span className="filter-chip">
                  <span>Status: {activeFilter}</span>
                  <button className="chip-remove-btn" onClick={() => setActiveFilter('all')}>
                    &times;
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="filter-chip">
                  <span>Query: "{searchQuery}"</span>
                  <button className="chip-remove-btn" onClick={() => setSearchQuery('')}>
                    &times;
                  </button>
                </span>
              )}
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setActiveFilter('all');
                setSearchQuery('');
              }}
            >
              Reset All
            </button>
          </section>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin-animation" style={{ marginBottom: '8px' }} />
            <p>Loading your tasks...</p>
          </div>
        )}

        {/* VIEW 1: KANBAN BOARD */}
        {!loading && currentView === 'kanban' && (
          <section className="view-panel active-view" id="view-kanban">
            <div className="kanban-columns-grid">
              {[
                { status: 'todo', label: 'To Do', colorClass: 'status-todo' },
                { status: 'in-progress', label: 'In Progress', colorClass: 'status-in-progress' },
                { status: 'review', label: 'Under Review', colorClass: 'status-review' },
                { status: 'completed', label: 'Completed', colorClass: 'status-completed' },
              ].map((col) => {
                const colTasks = filteredTasks.filter((t) => t.status === col.status);
                const isDragOver = activeDropCol === col.status;

                return (
                  <div
                    key={col.status}
                    className={`kanban-column ${isDragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => handleDragOver(e, col.status)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.status)}
                  >
                    <div className="column-header">
                      <div className="column-title-group">
                        <span className={`column-status-indicator ${col.colorClass}`} />
                        <h3 className="column-title">{col.label}</h3>
                        <span className="column-count">{colTasks.length}</span>
                      </div>
                      {col.status === 'completed' ? (
                        <button
                          className="btn-clear-completed"
                          onClick={handleClearCompleted}
                          title="Clear Completed Tasks"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <button
                          className="column-add-btn"
                          onClick={() => openCreateModal(col.status)}
                          title={`Add task to ${col.label}`}
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>

                    <div className="column-card-list">
                      {colTasks.length === 0 ? (
                        <div
                          style={{
                            padding: '24px 10px',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            fontSize: '0.82rem',
                            border: '1px dashed var(--border-color)',
                            borderRadius: '8px',
                          }}
                        >
                          Drop tasks here or click '+' to add
                        </div>
                      ) : (
                        colTasks.map((task) => {
                          const dueInfo = formatDueDate(task.dueDate);
                          const subtasks = task.subtasks || [];
                          const completedSub = subtasks.filter((s) => s.completed).length;

                          return (
                            <div
                              key={task.id}
                              className={`task-card ${task.status === 'completed' ? 'is-completed' : ''} ${
                                draggedTaskId === task.id ? 'dragging' : ''
                              }`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                            >
                              <div className="card-top">
                                <div className="card-badges">
                                  <span className={`badge-priority priority-${task.priority || 'medium'}`}>
                                    {task.priority || 'medium'}
                                  </span>
                                </div>
                                <div className="card-action-icons">
                                  <button
                                    className="card-action-btn"
                                    onClick={() => openEditModal(task)}
                                    title="Edit Task"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    className="card-action-btn delete-btn"
                                    onClick={() => handleDeleteTask(task.id)}
                                    title="Delete Task"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              <div className="card-title-row">
                                <input
                                  type="checkbox"
                                  className="custom-checkbox"
                                  checked={task.status === 'completed'}
                                  onChange={() => handleToggleTaskStatus(task)}
                                  aria-label="Toggle Task Complete"
                                />
                                <span
                                  className="card-title"
                                  onClick={() => openEditModal(task)}
                                >
                                  {task.title}
                                </span>
                              </div>

                              {task.description && (
                                <p className="card-desc">{task.description}</p>
                              )}

                              {/* Subtasks Progress Mini-list */}
                              {subtasks.length > 0 && (
                                <div className="card-subtasks-preview">
                                  <div className="subtasks-header">
                                    <span>Subtasks</span>
                                    <span>
                                      {completedSub} of {subtasks.length}
                                    </span>
                                  </div>
                                  <div className="subtasks-progress">
                                    <div
                                      className="subtasks-progress-fill"
                                      style={{
                                        width: `${(completedSub / subtasks.length) * 100}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="card-footer">
                                {dueInfo ? (
                                  <span
                                    className={`due-badge ${
                                      dueInfo.isOverdue && task.status !== 'completed'
                                        ? 'overdue'
                                        : dueInfo.isToday
                                        ? 'today'
                                        : ''
                                    }`}
                                  >
                                    <Calendar size={13} />
                                    <span>{dueInfo.text}</span>
                                  </span>
                                ) : (
                                  <span className="due-badge" style={{ opacity: 0.5 }}>
                                    No due date
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* VIEW 2: LIST VIEW */}
        {!loading && currentView === 'list' && (
          <section className="view-panel" id="view-list">
            <div className="list-view-container">
              <div className="list-view-header">
                <div className="list-col-check"></div>
                <div className="list-col-title">Task Name</div>
                <div className="list-col-priority">Priority</div>
                <div className="list-col-status">Status</div>
                <div className="list-col-due">Due Date</div>
                <div className="list-col-subtasks">Subtasks</div>
                <div className="list-col-actions">Actions</div>
              </div>

              <div className="list-tasks-wrapper">
                {filteredTasks.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No tasks found matching criteria.
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const dueInfo = formatDueDate(task.dueDate);
                    const subtasks = task.subtasks || [];
                    const completedSub = subtasks.filter((s) => s.completed).length;

                    return (
                      <div
                        key={task.id}
                        className={`list-row ${task.status === 'completed' ? 'is-completed' : ''}`}
                      >
                        <div className="list-col-check">
                          <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={task.status === 'completed'}
                            onChange={() => handleToggleTaskStatus(task)}
                          />
                        </div>
                        <div
                          className="list-col-title-text"
                          onClick={() => openEditModal(task)}
                        >
                          {task.title}
                        </div>
                        <div className="list-col-priority">
                          <span className={`badge-priority priority-${task.priority || 'medium'}`}>
                            {task.priority || 'medium'}
                          </span>
                        </div>
                        <div className="list-col-status">
                          <select
                            className="list-status-select"
                            value={task.status}
                            onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                          >
                            <option value="todo">To Do</option>
                            <option value="in-progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        <div className="list-col-due">
                          {dueInfo ? (
                            <span
                              className={`due-badge ${
                                dueInfo.isOverdue && task.status !== 'completed'
                                  ? 'overdue'
                                  : dueInfo.isToday
                                  ? 'today'
                                  : ''
                              }`}
                            >
                              {dueInfo.text}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </div>
                        <div className="list-col-subtasks">
                          {subtasks.length > 0 ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {completedSub}/{subtasks.length}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </div>
                        <div className="list-col-actions card-action-icons">
                          <button
                            className="card-action-btn"
                            onClick={() => openEditModal(task)}
                            title="Edit"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            className="card-action-btn delete-btn"
                            onClick={() => handleDeleteTask(task.id)}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        )}

        {/* Empty State Banner when tasks array is empty */}
        {!loading && tasks.length === 0 && (
          <div className="empty-state-card">
            <div className="empty-icon-wrap">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="empty-title">You're all caught up!</h3>
            <p className="empty-desc">
              No tasks on your board right now. Create a new task or load sample demo tasks to explore features.
            </p>
            <div className="empty-actions">
              <button className="btn btn-primary" onClick={() => openCreateModal()}>
                <Plus size={16} />
                <span>Create First Task</span>
              </button>
              <button className="btn btn-secondary" onClick={handleSeedDemoData}>
                <RefreshCw size={16} />
                <span>Load Sample Tasks</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ------------------- TASK MODAL (CREATE & EDIT) ------------------- */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {editingTask ? 'Edit Task' : 'Create New Task'}
                </h2>
                <p className="modal-subtitle">
                  {editingTask
                    ? 'Update task details, subtasks, or schedule.'
                    : 'Schedule and organize your priorities with clarity.'}
                </p>
              </div>
              <button
                className="icon-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close Modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="modal-form">
              {/* Title */}
              <div className="form-group">
                <label className="form-label" htmlFor="task-title-input">
                  Task Title <span className="required-star">*</span>
                </label>
                <input
                  id="task-title-input"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Implement MongoDB schema validation"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    if (formError) setFormError('');
                  }}
                  autoFocus
                  maxLength={160}
                />
                {formError && (
                  <span className="field-error" style={{ display: 'block' }}>
                    {formError}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label" htmlFor="task-desc-input">
                  Description &amp; Notes
                </label>
                <textarea
                  id="task-desc-input"
                  className="form-control"
                  rows={3}
                  placeholder="Add context, acceptance criteria, or relevant links..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>

              {/* Status and Priority Row */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="task-status-select">
                    Status
                  </label>
                  <select
                    id="task-status-select"
                    className="form-control custom-select"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Under Review</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="task-priority-select">
                    Priority
                  </label>
                  <select
                    id="task-priority-select"
                    className="form-control custom-select"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">🔥 Urgent (Do First)</option>
                  </select>
                </div>
              </div>

              {/* Due Date & Time */}
              <div className="form-group">
                <div className="due-date-label-row">
                  <label className="form-label" htmlFor="task-due-input">
                    Due Date &amp; Time
                  </label>
                  {formDueDate && (
                    <span className="due-date-preview-pill">
                      📅 {getDueDateHumanText(formDueDate)}
                    </span>
                  )}
                </div>

                <div className="due-date-input-wrap">
                  <input
                    id="task-due-input"
                    ref={dateInputRef}
                    type="datetime-local"
                    className="form-control date-time-picker-input"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.target.showPicker?.();
                      } catch {}
                    }}
                  />
                  <button
                    type="button"
                    className="date-picker-icon-btn"
                    onClick={() => {
                      try {
                        dateInputRef.current?.showPicker?.();
                      } catch {
                        dateInputRef.current?.focus();
                      }
                    }}
                    title="Open Calendar & Clock Picker"
                  >
                    <Calendar size={16} />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="due-quick-presets">
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => setQuickDueDate('today')}
                  >
                    ⚡ Today (6 PM)
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => setQuickDueDate('tomorrow')}
                  >
                    ☀️ Tomorrow (10 AM)
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => setQuickDueDate('in3days')}
                  >
                    📅 In 3 Days
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => setQuickDueDate('nextweek')}
                  >
                    🗓️ Next Monday
                  </button>
                  {formDueDate && (
                    <button
                      type="button"
                      className="preset-btn preset-clear"
                      onClick={() => setQuickDueDate('clear')}
                    >
                      <X size={12} /> Clear Date
                    </button>
                  )}
                </div>
              </div>

              {/* Subtasks / Checklist */}
              <div className="form-group subtasks-section">
                <div className="subtasks-label">
                  <label className="form-label">Subtasks &amp; Checklist</label>
                  <span className="subtasks-count-pill">
                    {formSubtasks.filter((s) => s.completed).length} / {formSubtasks.length} done
                  </span>
                </div>
                <div className="subtask-add-bar">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Add checklist item and press Enter or '+'"
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddSubtask}
                    title="Add Subtask"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {formSubtasks.length > 0 && (
                  <ul className="modal-subtask-list">
                    {formSubtasks.map((sub) => (
                      <li
                        key={sub.id}
                        className={`subtask-item ${sub.completed ? 'is-done' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={sub.completed}
                          onChange={() => handleToggleFormSubtask(sub.id)}
                        />
                        <span>{sub.title}</span>
                        <button
                          type="button"
                          className="subtask-delete-btn"
                          onClick={() => handleDeleteFormSubtask(sub.id)}
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Modal Actions */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} strokeWidth={2.5} />
                  <span>{editingTask ? 'Save Changes' : 'Create Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------- KEYBOARD SHORTCUTS MODAL ------------------- */}
      {isShortcutsOpen && (
        <div className="modal-backdrop" onClick={() => setIsShortcutsOpen(false)}>
          <div
            className="modal-card shortcuts-modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Keyboard Shortcuts</h3>
              <button className="icon-btn" onClick={() => setIsShortcutsOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="shortcuts-grid">
              <div className="shortcut-item">
                <kbd>N</kbd>
                <span>Create New Task</span>
              </div>
              <div className="shortcut-item">
                <kbd>/</kbd> or <kbd>Ctrl+K</kbd>
                <span>Focus Search Bar</span>
              </div>
              <div className="shortcut-item">
                <kbd>Esc</kbd>
                <span>Close Modal / Clear Search</span>
              </div>
              <div className="shortcut-item">
                <kbd>1</kbd> / <kbd>2</kbd>
                <span>Switch View (Kanban / List)</span>
              </div>
              <div className="shortcut-item">
                <kbd>T</kbd>
                <span>Toggle Dark / Light Theme</span>
              </div>
              <div className="shortcut-item">
                <kbd>?</kbd>
                <span>Show Shortcuts Guide</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------- TOAST NOTIFICATIONS ------------------- */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-content">{toast.message}</span>
            <button
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Shortcut hint button */}
      <div
        className="shortcuts-hint"
        onClick={() => setIsShortcutsOpen(true)}
        title="Press ? for keyboard shortcuts"
      >
        <kbd>?</kbd> Shortcuts
      </div>
    </div>
  );
}
