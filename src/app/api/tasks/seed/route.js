import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Task from '@/models/Task';
import { MemoryStore } from '@/lib/taskStore';

const sampleTasks = [
  {
    title: 'Initialize MongoDB connection & verify environment',
    description: 'Connect your local MongoDB daemon (mongodb://localhost:27017) or add MongoDB Atlas connection URI to .env.local',
    status: 'todo',
    priority: 'urgent',
    category: 'Database',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    subtasks: [
      { id: 'sub-1', title: 'Open .env.local file', completed: true },
      { id: 'sub-2', title: 'Verify MONGODB_URI connection string', completed: false },
      { id: 'sub-3', title: 'Test CRUD operations in TaskFlow UI', completed: false }
    ],
    order: 0,
  },
  {
    title: 'Design responsive Kanban Board & drag interactions',
    description: 'Implement smooth drag and drop status transitions between To Do, In Progress, Review, and Completed columns.',
    status: 'in-progress',
    priority: 'high',
    category: 'Frontend',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    subtasks: [
      { id: 'sub-4', title: 'Column dragover indicators', completed: true },
      { id: 'sub-5', title: 'Kanban cards smooth lift shadow', completed: true },
      { id: 'sub-6', title: 'Instant optimistic status sync', completed: false }
    ],
    order: 1,
  },
  {
    title: 'Implement dense List View with inline status changes',
    description: 'Provide an organized table view of tasks with quick inline status and priority management.',
    status: 'review',
    priority: 'medium',
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    subtasks: [
      { id: 'sub-7', title: 'Table column formatting', completed: true },
      { id: 'sub-8', title: 'Quick status dropdown action', completed: true }
    ],
    order: 2,
  },
  {
    title: 'Setup Next.js App Router project architecture',
    description: 'Configured Next.js 15+ App Router with Vanilla CSS design system and REST API Route Handlers.',
    status: 'completed',
    priority: 'low',
    category: 'Setup',
    dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    subtasks: [
      { id: 'sub-9', title: 'Create Next.js project structure', completed: true },
      { id: 'sub-10', title: 'Setup Mongoose schema and model', completed: true },
      { id: 'sub-11', title: 'Create API endpoints for tasks CRUD', completed: true }
    ],
    order: 3,
  }
];

export async function POST() {
  try {
    const { isConnected } = await connectToDatabase();

    if (isConnected) {
      await Task.deleteMany({});
      const created = await Task.insertMany(sampleTasks);
      return NextResponse.json({
        success: true,
        source: 'mongodb',
        message: 'Database seeded with sample tasks',
        count: created.length,
      });
    } else {
      const tasks = MemoryStore.resetWithDemoData();
      return NextResponse.json({
        success: true,
        source: 'memory',
        message: 'Memory store loaded with sample tasks',
        count: tasks.length,
      });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
