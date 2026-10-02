import mongoose from 'mongoose';

const driveSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    role: {
      type: String,
      trim: true,
      default: '',
    },
    packageLpa: {
      type: Number,
      min: [0, 'Package LPA must be positive'],
      default: 0,
    },
    driveDate: {
      type: Date,
      default: null,
      index: true,
    },
    driveTime: {
      type: String,
      trim: true,
      default: '',
    },
    venueMode: {
      type: String,
      trim: true,
      default: 'Offline', // Online / Offline / Hybrid
    },
    coordinator: {
      type: String,
      trim: true,
      default: '',
    },
    eligibility: {
      minCgpa: {
        type: Number,
        default: 0,
      },
      maxBacklogs: {
        type: Number,
        default: 0,
      },
      allowedDepartments: {
        type: [String],
        default: [],
      },
      batch: {
        type: String,
        trim: true,
        default: '',
      },
    },
    status: {
      type: String,
      enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
      default: 'Upcoming',
      index: true,
    },
    finalized: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Drive = mongoose.model('Drive', driveSchema);
