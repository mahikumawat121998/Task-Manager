import mongoose from 'mongoose';

const SubtaskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a task title'],
      trim: true,
      maxlength: [160, 'Task title cannot be more than 160 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'review', 'completed'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    subtasks: {
      type: [SubtaskSchema],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field for checking if task is overdue
TaskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate || this.status === 'completed') return false;
  return new Date() > new Date(this.dueDate);
});

// Configure JSON transform to include id
TaskSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
