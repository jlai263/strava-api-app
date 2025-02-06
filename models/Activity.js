import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  stravaId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: Number,
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
  },
  lastStravaSync: {
    type: Date,
    default: Date.now,
    index: true
  },
  dataSource: {
    type: String,
    enum: ['strava', 'manual'],
    default: 'strava'
  }
});

// Index for efficient querying of recent activities
activitySchema.index({ userId: 1, start_date: -1 });
activitySchema.index({ userId: 1, lastStravaSync: -1 });

// Static method to check if user's data needs refresh
activitySchema.statics.needsRefresh = async function(userId, refreshInterval = 60 * 60 * 1000) { // 1 hour default
  const latestSync = await this.findOne(
    { userId },
    { lastStravaSync: 1 },
    { sort: { lastStravaSync: -1 } }
  );

  if (!latestSync) return true;

  const timeSinceLastSync = Date.now() - latestSync.lastStravaSync.getTime();
  return timeSinceLastSync > refreshInterval;
};

const Activity = mongoose.model('Activity', activitySchema);

export default Activity; 