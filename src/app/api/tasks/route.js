import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Task from '@/models/Task';
import { MemoryStore } from '@/lib/taskStore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const priority = searchParams.get('priority') || '';
    const sort = searchParams.get('sort') || 'createdAt-desc';

    const { isConnected } = await connectToDatabase();

    if (isConnected) {
      // Build MongoDB query
      const query = {};
      if (status && status !== 'all') {
        query.status = status;
      }
      if (category && category !== 'all') {
        query.category = { $regex: new RegExp(`^${category}$`, 'i') };
      }
      if (priority && priority !== 'all') {
        query.priority = priority;
      }
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
        ];
      }

      // Build sort criteria
      let sortOptions = { createdAt: -1 };
      if (sort === 'createdAt-asc') sortOptions = { createdAt: 1 };
      if (sort === 'dueDate-asc') sortOptions = { dueDate: 1, createdAt: -1 };
      if (sort === 'dueDate-desc') sortOptions = { dueDate: -1, createdAt: -1 };
      if (sort === 'priority-desc') {
        // We will sort by priority in memory or mapped weights
        sortOptions = { priority: 1, createdAt: -1 };
      }
      if (sort === 'title-asc') sortOptions = { title: 1 };

      const tasks = await Task.find(query).sort(sortOptions).lean();

      // Transform _id to id
      const formattedTasks = tasks.map(t => ({
        ...t,
        id: t._id.toString(),
      }));

      return NextResponse.json({
        success: true,
        source: 'mongodb',
        count: formattedTasks.length,
        tasks: formattedTasks,
      });
    } else {
      // Use in-memory fallback
      const tasks = MemoryStore.getTasks({ search, status, category, priority });
      return NextResponse.json({
        success: true,
        source: 'memory',
        notice: 'Running in demo memory store. Configure MONGODB_URI in .env.local to persist in MongoDB.',
        count: tasks.length,
        tasks,
      });
    }
  } catch (error) {
    console.error('Error fetching tasks:', error);
    // Return memory fallback on error
    const fallbackTasks = MemoryStore.getTasks();
    return NextResponse.json({
      success: true,
      source: 'memory-fallback',
      error: error.message,
      tasks: fallbackTasks,
    });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { success: false, message: 'Task title is required' },
        { status: 400 }
      );
    }

    const { isConnected } = await connectToDatabase();

    if (isConnected) {
      const taskDoc = await Task.create({
        title: body.title.trim(),
        description: body.description ? body.description.trim() : '',
        status: body.status || 'todo',
        priority: body.priority || 'medium',
        category: body.category ? body.category.trim() : 'General',
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        subtasks: Array.isArray(body.subtasks) ? body.subtasks : [],
        order: body.order || 0,
      });

      return NextResponse.json({
        success: true,
        source: 'mongodb',
        task: taskDoc.toJSON(),
      }, { status: 201 });
    } else {
      // Memory store fallback
      const task = MemoryStore.createTask(body);
      return NextResponse.json({
        success: true,
        source: 'memory',
        task,
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create task' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'clear-completed') {
      const { isConnected } = await connectToDatabase();
      if (isConnected) {
        const result = await Task.deleteMany({ status: 'completed' });
        return NextResponse.json({
          success: true,
          source: 'mongodb',
          deletedCount: result.deletedCount,
        });
      } else {
        const deletedCount = MemoryStore.clearCompleted();
        return NextResponse.json({
          success: true,
          source: 'memory',
          deletedCount,
        });
      }
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
