router.get('/activities', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    const fullSync = req.query.fullSync === 'true';

    if (!accessToken) {
      console.log('[Strava API] No access token provided');
      return res.status(401).json({ error: 'No access token provided' });
    }

    // Get user info from Strava to get the user ID
    console.log('[Strava API] Fetching user info...');
    const userResponse = await axios.get('https://www.strava.com/api/v3/athlete', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const userId = userResponse.data.id;
    console.log(`[Strava API] User ID: ${userId}`);

    // Check if we have cached activities in MongoDB
    const cachedActivities = await Activity.find({ userId }).sort({ start_date: -1 });
    
    if (cachedActivities.length > 0 && !fullSync) {
      // For sync check, only get activities since the last sync
      const lastSync = new Date(Math.max(...cachedActivities.map(a => new Date(a.lastStravaSync).getTime())));
      console.log(`[Strava API] Last sync was at: ${lastSync.toISOString()}`);

      // Fetch only new activities from Strava
      const newActivities = await fetchStravaActivities(accessToken, lastSync);
      
      if (newActivities.length === 0) {
        console.log('[Strava API] No new activities found');
        return res.json(cachedActivities);
      }

      console.log(`[Strava API] Found ${newActivities.length} new activities`);
      
      // Update MongoDB with new activities
      await updateMongoCache(userId, newActivities);
      
      // Return updated activities
      const updatedActivities = await Activity.find({ userId }).sort({ start_date: -1 });
      return res.json(updatedActivities);
    }

    // Full sync: fetch all activities from Strava
    console.log('[Strava API] Performing full sync...');
    const allActivities = await fetchStravaActivities(accessToken);
    
    // Update MongoDB cache
    await updateMongoCache(userId, allActivities);

    // Return all activities
    const finalActivities = await Activity.find({ userId }).sort({ start_date: -1 });
    console.log(`[Strava API] Returning ${finalActivities.length} activities`);
    res.json(finalActivities);

  } catch (error) {
    console.error('[Strava API] Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch activities',
      details: error.response?.data || error.message 
    });
  }
});

// Helper function to fetch activities from Strava
async function fetchStravaActivities(accessToken, since = null) {
  let page = 1;
  let allActivities = [];
  let hasMore = true;
  const PER_PAGE = 100; // Maximum allowed by Strava API

  while (hasMore) {
    console.log(`[Strava API] Fetching page ${page}...`);
    const params = {
      per_page: PER_PAGE,
      page: page
    };

    if (since) {
      params.after = Math.floor(since.getTime() / 1000); // Convert to Unix timestamp
    }

    const stravaResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params
    });

    const pageActivities = stravaResponse.data;
    console.log(`[Strava API] Received ${pageActivities.length} activities on page ${page}`);

    if (pageActivities.length === 0) {
      hasMore = false;
    } else {
      allActivities = [...allActivities, ...pageActivities];
      page++;
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return allActivities;
}

// Helper function to update MongoDB cache
async function updateMongoCache(userId, activities) {
  console.log('[Strava API] Updating MongoDB cache...');
  const now = new Date();

  const bulkOps = activities.map(activity => ({
    updateOne: {
      filter: { userId, stravaId: activity.id },
      update: {
        $set: {
          userId,
          stravaId: activity.id,
          name: activity.name,
          distance: activity.distance,
          moving_time: activity.moving_time,
          elapsed_time: activity.elapsed_time,
          total_elevation_gain: activity.total_elevation_gain,
          type: activity.type,
          start_date: activity.start_date,
          start_date_local: activity.start_date_local,
          timezone: activity.timezone,
          average_speed: activity.average_speed,
          max_speed: activity.max_speed,
          average_heartrate: activity.average_heartrate,
          max_heartrate: activity.max_heartrate,
          elev_high: activity.elev_high,
          elev_low: activity.elev_low,
          description: activity.description,
          calories: activity.calories,
          startLatlng: activity.start_latlng,
          endLatlng: activity.end_latlng,
          map: activity.map,
          dataSource: 'strava',
          lastStravaSync: now
        }
      },
      upsert: true
    }
  }));

  if (bulkOps.length > 0) {
    const result = await Activity.bulkWrite(bulkOps);
    console.log('[Strava API] Cache update complete:', {
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount
    });
  }
} 