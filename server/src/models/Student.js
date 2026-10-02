import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    registerNo: {
      type: String,
      required: [true, 'Register Number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    department: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    batch: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    cgpa: {
      type: Number,
      min: [0, 'CGPA cannot be negative'],
      max: [10, 'CGPA cannot exceed 10'],
      default: null,
    },
    backlogs: {
      type: Number,
      min: [0, 'Backlogs cannot be negative'],
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Explicit text index for fast search by registerNo, name, email
studentSchema.index({ registerNo: 'text', name: 'text', email: 'text' });

export const Student = mongoose.model('Student', studentSchema);
