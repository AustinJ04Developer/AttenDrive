import mongoose from 'mongoose';

const driveAssignmentSchema = new mongoose.Schema(
  {
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index on (driveId, studentId)
driveAssignmentSchema.index({ driveId: 1, studentId: 1 }, { unique: true });

export const DriveAssignment = mongoose.model('DriveAssignment', driveAssignmentSchema);
