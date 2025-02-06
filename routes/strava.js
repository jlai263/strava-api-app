router.get('/activities', async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
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
    
    if (cachedActivities.length > 0) {
      // Check if we need to refresh the cache
      const needsRefresh = await Activity.needsRefresh(userId);
      
      if (!needsRefresh) {
        console.log(`[Strava API] Using cached activities for user ${userId}, count: ${cachedActivities.length}`);
        return res.json(cachedActivities);
      }
      console.log(`[Strava API] Cache expired for user ${userId}, fetching fresh data`);
    } else {
      console.log(`[Strava API] No cached activities found for user ${userId}`);
    }

    // Fetch all activities from Strava using pagination
    console.log('[Strava API] Fetching all activities from Strava...');
    let page = 1;
    let allActivities = [];
    let hasMore = true;
    const PER_PAGE = 100; // Maximum allowed by Strava API

    while (hasMore) {
      console.log(`[Strava API] Fetching page ${page}...`);
      const stravaResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: {
          per_page: PER_PAGE,
          page: page
        }
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

    console.log(`[Strava API] Total activities fetched: ${allActivities.length}`);

    // Update MongoDB cache
    console.log('[Strava API] Updating MongoDB cache...');
    const activities = allActivities.map(activity => ({
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
      lastStravaSync: new Date()
    }));

    // Use bulkWrite for efficient upsert
    const bulkOps = activities.map(activity => ({
      updateOne: {
        filter: { userId: activity.userId, stravaId: activity.stravaId },
        update: { $set: activity },
        upsert: true
      }
    }));

    const result = await Activity.bulkWrite(bulkOps);
    console.log(`[Strava API] Cache update complete:`, {
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount
    });

    // Return all activities from MongoDB
    const updatedActivities = await Activity.find({ userId }).sort({ start_date: -1 });
    console.log(`[Strava API] Returning ${updatedActivities.length} activities`);
    res.json(updatedActivities);

  } catch (error) {
    console.error('[Strava API] Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch activities',
      details: error.response?.data || error.message 
    });
  }
}); 