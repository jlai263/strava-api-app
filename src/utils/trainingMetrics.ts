import type { IActivity } from '../models/Activity';

// Heart rate zones based on % of max HR
const HR_ZONES = {
  ZONE1: { min: 0.55, max: 0.65, name: 'Recovery/Easy' },     // 55-65% HR max
  ZONE2: { min: 0.65, max: 0.75, name: 'Aerobic/Base' },      // 65-75% HR max
  ZONE3: { min: 0.80, max: 0.85, name: 'Tempo' },             // 80-85% HR max
  ZONE4: { min: 0.85, max: 0.88, name: 'Lactate Threshold' }, // 85-88% HR max
  ZONE5: { min: 0.90, max: 1.00, name: 'Anaerobic' }          // 90%+ HR max
};

// Calculate acute (7-day) and chronic (28-day) training loads
export const calculateTrainingLoad = (activities: IActivity[]) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  // Filter activities within the time ranges
  const acuteActivities = activities.filter(activity => 
    new Date(activity.start_date) >= sevenDaysAgo
  );
  const chronicActivities = activities.filter(activity => 
    new Date(activity.start_date) >= twentyEightDaysAgo
  );

  // Calculate training load using duration and intensity
  const calculateLoad = (activity: IActivity) => {
    const duration = activity.moving_time / 3600; // Convert to hours
    let intensity = 1.0; // Default intensity

    if (activity.average_heartrate) {
      // Assuming max HR of 180 for now - could be personalized
      const hrPercentage = activity.average_heartrate / 180;
      
      // Intensity factor based on heart rate zones
      if (hrPercentage <= HR_ZONES.ZONE1.max) intensity = 1;
      else if (hrPercentage <= HR_ZONES.ZONE2.max) intensity = 1.5;
      else if (hrPercentage <= HR_ZONES.ZONE3.max) intensity = 2;
      else if (hrPercentage <= HR_ZONES.ZONE4.max) intensity = 3;
      else intensity = 4;
    }

    // Training load = duration * intensity * distance factor
    const distanceKm = activity.distance / 1000;
    const distanceFactor = Math.log10(distanceKm + 1) + 1; // Logarithmic scaling for distance
    
    return duration * intensity * distanceFactor * 100; // Scale for readability
  };

  // Calculate acute and chronic loads
  const acuteLoad = acuteActivities.reduce((sum, activity) => 
    sum + calculateLoad(activity), 0
  ) / 7; // Daily average over 7 days

  const chronicLoad = chronicActivities.reduce((sum, activity) => 
    sum + calculateLoad(activity), 0
  ) / 28; // Daily average over 28 days

  return {
    acute: Math.round(acuteLoad),
    chronic: Math.round(chronicLoad),
    ratio: chronicLoad > 0 ? Number((acuteLoad / chronicLoad).toFixed(2)) : 0
  };
};

// Calculate time spent in each heart rate zone
export const calculateZoneDistribution = (activities: IActivity[]) => {
  const zones = {
    zone1: 0, // Recovery (55-65% HR max)
    zone2: 0, // Aerobic (65-75% HR max)
    zone3: 0, // Tempo (80-85% HR max)
    zone4: 0, // Threshold (85-88% HR max)
    zone5: 0  // Anaerobic (90%+ HR max)
  };

  let totalTime = 0;

  activities.forEach(activity => {
    if (!activity.average_heartrate) return;

    const duration = activity.moving_time / 60; // minutes
    const hrPercentage = activity.average_heartrate / 180; // Assuming max HR of 180

    // Assign time to appropriate zone
    if (hrPercentage <= HR_ZONES.ZONE1.max) zones.zone1 += duration;
    else if (hrPercentage <= HR_ZONES.ZONE2.max) zones.zone2 += duration;
    else if (hrPercentage <= HR_ZONES.ZONE3.max) zones.zone3 += duration;
    else if (hrPercentage <= HR_ZONES.ZONE4.max) zones.zone4 += duration;
    else zones.zone5 += duration;

    totalTime += duration;
  });

  // Convert to percentages
  if (totalTime > 0) {
    return {
      zone1: Math.round((zones.zone1 / totalTime) * 100),
      zone2: Math.round((zones.zone2 / totalTime) * 100),
      zone3: Math.round((zones.zone3 / totalTime) * 100),
      zone4: Math.round((zones.zone4 / totalTime) * 100),
      zone5: Math.round((zones.zone5 / totalTime) * 100)
    };
  }

  return { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 };
}; 