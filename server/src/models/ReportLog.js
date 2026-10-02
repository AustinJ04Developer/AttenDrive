import mongoose from 'mongoose';

const reportLogSchema = new mongoose.Schema(
  {
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      default: null,
      index: true,
    },
    type: {
      type: String,
      required: true, // 'drive_attendance', 'absentees', 'student_history', 'department_summary', 'consolidated'
      index: true,
    },
    title: {
      type: String,
      default: '',
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ReportLog = mongoose.model('ReportLog', reportLogSchema);
