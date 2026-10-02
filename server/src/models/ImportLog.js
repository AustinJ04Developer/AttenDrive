import mongoose from 'mongoose';

const importLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      default: 'students',
    },
    added: {
      type: Number,
      default: 0,
    },
    updated: {
      type: Number,
      default: 0,
    },
    skipped: {
      type: Number,
      default: 0,
    },
    failed: {
      type: Number,
      default: 0,
    },
    insertedIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const ImportLog = mongoose.model('ImportLog', importLogSchema);
