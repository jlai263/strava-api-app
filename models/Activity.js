import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  stravaId: {
    type: Number,
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
  type: String,
  name: String,
  distance: Number,
  moving_time: Number,
  elapsed_time: Number,
  total_elevation_gain: Number,
  start_date: Date,
  start_date_local: Date,
  timezone: String,
  average_speed: Number,
  max_speed: Number,
  average_heartrate: Number,
  max_heartrate: Number,
  elev_high: Number,
  elev_low: Number,
  description: String,
  calories: Number,
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for efficient querying of recent activities
activitySchema.index({ userId: 1, start_date: -1 });

const Activity = mongoose.model('Activity', activitySchema);

export default Activity; 