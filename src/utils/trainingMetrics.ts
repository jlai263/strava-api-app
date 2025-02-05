interface Activity {
  distance: number;
  moving_time: number;
  average_heartrate?: number;
  max_heartrate?: number;
  start_date: string;
}

export const calculateTrainingLoad = (activities: Activity[]) => {
  // Calculate acute (7-day) and chronic (28-day) load
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const recentActivities = activities.filter(a => new Date(a.start_date) >= sevenDaysAgo);
  const monthActivities = activities.filter(a => new Date(a.start_date) >= twentyEightDaysAgo);

  // Calculate daily load as distance * duration
  const acuteLoad = recentActivities.reduce((sum, activity) => {
    return sum + (activity.distance * activity.moving_time) / (7 * 1000); // Normalize by 7 days
  }, 0);

  const chronicLoad = monthActivities.reduce((sum, activity) => {
    return sum + (activity.distance * activity.moving_time) / (28 * 1000); // Normalize by 28 days
  }, 0);

  return {
    acute: acuteLoad,
    chronic: chronicLoad,
    ratio: chronicLoad > 0 ? acuteLoad / chronicLoad : 1
  };
};

export const calculateZoneDistribution = (activities: Activity[]) => {
  let totalTime = 0;
  let timeInZones = {
    zone1: 0, // Recovery (50-60% of max HR)
    zone2: 0, // Aerobic (60-70% of max HR)
    zone3: 0, // Tempo (70-80% of max HR)
    zone4: 0, // Threshold (80-90% of max HR)
    zone5: 0  // VO2 Max (90-100% of max HR)
  };

  activities.forEach(activity => {
    if (activity.average_heartrate && activity.moving_time) {
      const maxHR = activity.max_heartrate || 220 - 30; // Estimated max HR if not available
      const hrPercentage = (activity.average_heartrate / maxHR) * 100;
      
      // Assign time to zones based on average heart rate
      if (hrPercentage <= 60) timeInZones.zone1 += activity.moving_time;
      else if (hrPercentage <= 70) timeInZones.zone2 += activity.moving_time;
      else if (hrPercentage <= 80) timeInZones.zone3 += activity.moving_time;
      else if (hrPercentage <= 90) timeInZones.zone4 += activity.moving_time;
      else timeInZones.zone5 += activity.moving_time;
      
      totalTime += activity.moving_time;
    }
  });

  // Convert to percentages
  if (totalTime > 0) {
    return {
      zone1: (timeInZones.zone1 / totalTime) * 100,
      zone2: (timeInZones.zone2 / totalTime) * 100,
      zone3: (timeInZones.zone3 / totalTime) * 100,
      zone4: (timeInZones.zone4 / totalTime) * 100,
      zone5: (timeInZones.zone5 / totalTime) * 100
    };
  }

  // Return default distribution if no heart rate data
  return {
    zone1: 0,
    zone2: 0,
    zone3: 0,
    zone4: 0,
    zone5: 0
  };
}; 