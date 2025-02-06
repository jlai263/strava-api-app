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
  start_date: {
    type: Date,
    required: true,
    index: true
  },
  start_date_local: {
    type: Date,
    required: true,
    index: true
  },
  timezone: String,
  average_speed: Number,
  max_speed: Number,
  average_heartrate: Number,
  max_heartrate: Number,
  elev_high: Number,
  elev_low: Number,
  description: String,
  calories: Number,
  startLatlng: [Number],
  endLatlng: [Number],
  map: {
    polyline: String
  },
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

// Compound indexes for efficient querying
activitySchema.index({ userId: 1, start_date: -1 });
activitySchema.index({ userId: 1, lastStravaSync: -1 });
activitySchema.index({ userId: 1, type: 1, start_date: -1 });

// Static method to check if user's data needs refresh
activitySchema.statics.needsRefresh = async function(userId) {
  const latestSync = await this.findOne(
    { userId },
    { lastStravaSync: 1 },
    { sort: { lastStravaSync: -1 } }
  );

  if (!latestSync) return true;

  const now = new Date();
  const timeSinceLastSync = now.getTime() - latestSync.lastStravaSync.getTime();
  const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes

  return timeSinceLastSync > SYNC_INTERVAL;
};

// Static method to get the latest activity date
activitySchema.statics.getLatestActivityDate = async function(userId) {
  const latestActivity = await this.findOne(
    { userId },
    { start_date: 1 },
    { sort: { start_date: -1 } }
  );

  return latestActivity ? latestActivity.start_date : null;
};

// Static method to get the earliest activity date
activitySchema.statics.getEarliestActivityDate = async function(userId) {
  const earliestActivity = await this.findOne(
    { userId },
    { start_date: 1 },
    { sort: { start_date: 1 } }
  );

  return earliestActivity ? earliestActivity.start_date : null;
};

// Static method to bulk upsert activities
activitySchema.statics.bulkUpsertActivities = async function(activities, userId) {
  if (!activities || activities.length === 0) return { modifiedCount: 0, upsertedCount: 0 };

  const operations = activities.map(activity => ({
    updateOne: {
      filter: { 
        stravaId: activity.id,
        userId: userId
      },
      update: {
        $set: {
          ...activity,
          stravaId: activity.id,
          userId: userId,
          start_date: new Date(activity.start_date),
          start_date_local: new Date(activity.start_date_local),
          lastUpdated: new Date(),
          lastStravaSync: new Date()
        }
      },
      upsert: true
    }
  }));

  const result = await this.bulkWrite(operations);
  
  return {
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount
  };
};

const Activity = mongoose.model('Activity', activitySchema);

export default Activity; 