import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Task from '@/models/Task';
import { MemoryStore } from '@/lib/taskStore';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { isConnected } = await connectToDatabase();

    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      const task = await Task.findById(id).lean();
      if (!task) {
        return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        task: { ...task, id: task._id.toString() },
      });
    } else {
      const task = MemoryStore.getTaskById(id);
      if (!task) {
        return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, task });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const updates = await request.json();
    const { isConnected } = await connectToDatabase();

    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      if (updates.dueDate) {
        updates.dueDate = new Date(updates.dueDate);
      }
      const updatedTask = await Task.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).lean();

      if (!updatedTask) {
        return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        source: 'mongodb',
        task: { ...updatedTask, id: updatedTask._id.toString() },
      });
    } else {
      const updatedTask = MemoryStore.updateTask(id, updates);
      if (!updatedTask) {
        return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        source: 'memory',
        task: updatedTask,
      });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { isConnected } = await connectToDatabase();

    if (isConnected && mongoose.Types.ObjectId.isValid(id)) {
      const result = await Task.findByIdAndDelete(id);
      if (!result) {
        return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        source: 'mongodb',
        message: 'Task deleted successfully',
      });
    } else {
      const deleted = MemoryStore.deleteTask(id);
      if (!deleted) {
        return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        source: 'memory',
        message: 'Task deleted successfully',
      });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
