# TaskFlow Pro • Next.js & MongoDB Task Manager

A modern, high-performance task management application built with **Next.js 15 (App Router)**, **Vanilla CSS** design tokens, and **MongoDB / Mongoose** integration.

---

## ⚡ Quick Start

### 1. Run Development Server
The development server is already configured and running on `http://localhost:3000`:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🍃 MongoDB Configuration

TaskFlow Pro is pre-architected with **Mongoose** models and API Route Handlers. It includes an **intelligent dual-engine storage system**:
- When MongoDB is connected, all tasks, subtasks, priorities, and deadlines are persisted directly to your MongoDB database.
- If MongoDB is not yet running or still being configured, TaskFlow Pro automatically activates the **high-speed demo memory store** with zero configuration required, allowing full CRUD exploration without crashing.

### Connecting Your MongoDB Database:
Open [`.env.local`](file:///e:/New%20folder/Hammo_Task/.env.local) and verify your connection string:

#### For Local MongoDB:
```env
MONGODB_URI=mongodb://localhost:27017/hammo_task_manager
```

#### For MongoDB Atlas (Cloud):
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/hammo_task_manager?retryWrites=true&w=majority
```

Once MongoDB is running or your URI is updated, restart the server (`npm run dev`) or refresh the page. The live status indicator in the top navigation bar will switch to **🟢 MongoDB Active**.

---

## 🚀 Key Features

### 1. Interactive Views
- **Kanban Board**: Drag-and-drop workflow across `To Do`, `In Progress`, `Under Review`, and `Completed`.
- **List View**: Dense, data-rich table with inline status changers, priority badges, and subtask progress.

### 2. Comprehensive Task Management (CRUD)
- **Task Attributes**: Title, Description, Status, Priority (`Urgent`, `High`, `Medium`, `Low`), and Due Date/Time.
- **Nested Subtasks & Checklists**: Add checklist items with automated progress percentage bar.
- **Instant Search & Deep Filtering**: Search by keyword; filter by `Due Today`, `Overdue`, `Upcoming`, or `Completed`.
- **Sorting**: Sort by Newest, Oldest, Due Date, Priority, or Title (A–Z).

### 3. Visual Excellence & Interactions
- **Dark & Light Themes**: Sleek glassmorphism dark theme with high-contrast text and luminous accents, plus a crisp light theme.
- **Celebration Effects**: Confetti bursts (`canvas-confetti`) and synthesized harmonic chime (native Web Audio API) on task completion.
- **Data Portability**: One-click **Export to JSON** and **Import from JSON** for complete backups.
- **Sample Demo Loader**: One-click "Load Sample Tasks" to reset or explore realistic project data.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>N</kbd> | Open New Task modal |
| <kbd>/</kbd> or <kbd>Ctrl+K</kbd> | Focus global search bar |
| <kbd>1</kbd> | Switch to Kanban Board view |
| <kbd>2</kbd> | Switch to List view |
| <kbd>T</kbd> | Toggle Dark / Light theme |
| <kbd>Esc</kbd> | Close any open modal or clear search |
| <kbd>?</kbd> | View keyboard shortcuts modal |

---

## 📁 Project Structure

```
Hammo_Task/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/route.js     # Database health diagnostic API
│   │   │   ├── tasks/
│   │   │   │   ├── route.js        # GET, POST, DELETE collection endpoints
│   │   │   │   ├── [id]/route.js   # GET, PATCH, DELETE single task endpoints
│   │   │   │   └── seed/route.js   # POST demo data seeder
│   │   ├── globals.css             # Vanilla CSS design tokens & glassmorphism
│   │   ├── layout.js               # Root layout & Google typography
│   │   └── page.js                 # TaskFlow Pro main client component
│   ├── lib/
│   │   ├── mongodb.js              # Cached Mongoose connection helper
│   │   └── taskStore.js            # Shared memory fallback store
│   └── models/
│       └── Task.js                 # Mongoose schema with subtasks & virtuals
├── .env.local                      # MongoDB environment configuration
├── .env.example                    # Environment template
├── jsconfig.json                   # Path alias mappings (@/*)
├── next.config.mjs                 # Next.js configuration
├── package.json                    # Project dependencies & scripts
└── README.md                       # Documentation
```
