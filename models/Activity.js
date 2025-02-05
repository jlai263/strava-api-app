import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  stravaId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true
  },
  name: String,
  distance: Number,
  movingTime: Number,
  elapsedTime: Number,
  totalElevationGain: Number,
  startDate: Date,
  averageHeartrate: Number,
  maxHeartrate: Number,
  averageSpeed: Number,
  maxSpeed: Number,
  startLatlng: [Number],
  endLatlng: [Number]
}, {
  timestamps: true
});

// Remove duplicate index declarations
activitySchema.index({ startDate: -1 });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity; 