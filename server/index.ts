import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import session from 'express-session';
import axios from 'axios';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

// Constants for Strava API
const PER_PAGE = 100; // Maximum allowed by Strava API
const RATE_LIMIT_DELAY = 1000; // 1 second delay between requests
const MAX_RETRIES = 3; // Maximum number of retries for failed requests

// MongoDB connection
const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
let db: any;

(async () => {
  try {
    await mongoClient.connect();
    db = mongoClient.db('strava-app');
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  }
})();

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Auth check middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Auth routes
app.get('/api/auth/check', (req: any, res) => {
  res.json({ isAuthenticated: !!req.session.userId });
});

app.get('/api/auth/callback', async (req: any, res) => {
  const { code } = req.query;

  try {
    // Exchange code for token
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    });

    const {
      access_token,
      refresh_token,
      expires_at,
      athlete
    } = tokenResponse.data;

    // Create or update user
    const user = await prisma.user.upsert({
      where: { id: athlete.id.toString() },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpires: new Date(expires_at * 1000)
      },
      create: {
        id: athlete.id.toString(),
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpires: new Date(expires_at * 1000)
      }
    });

    req.session.userId = user.id;
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/api/auth/logout', (req: any, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Activity routes
app.get('/api/activities', requireAuth, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if token needs refresh
    if (new Date(user.tokenExpires) <= new Date()) {
      const refreshResponse = await axios.post('https://www.strava.com/oauth/token', {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: user.refreshToken,
        grant_type: 'refresh_token'
      });

      await prisma.user.update({
        where: { id: user.id },
        data: {
          accessToken: refreshResponse.data.access_token,
          refreshToken: refreshResponse.data.refresh_token,
          tokenExpires: new Date(refreshResponse.data.expires_at * 1000)
        }
      });

      user.accessToken = refreshResponse.data.access_token;
    }

    // Fetch activities from Strava
    const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      params: {
        per_page: 100,
        page: 1
      }
    });

    // Store activities in database
    const activities = await Promise.all(
      activitiesResponse.data.map(async (activity: any) => {
        return prisma.activity.upsert({
          where: { id: activity.id.toString() },
          update: {
            name: activity.name,
            type: activity.type,
            distance: activity.distance,
            movingTime: activity.moving_time,
            elapsedTime: activity.elapsed_time,
            totalElevationGain: activity.total_elevation_gain,
            startDate: new Date(activity.start_date),
            startDateLocal: new Date(activity.start_date_local),
            timezone: activity.timezone,
            startLat: activity.start_latlng?.[0] || null,
            startLng: activity.start_latlng?.[1] || null,
            endLat: activity.end_latlng?.[0] || null,
            endLng: activity.end_latlng?.[1] || null,
            averageSpeed: activity.average_speed,
            maxSpeed: activity.max_speed
          },
          create: {
            id: activity.id.toString(),
            userId: user.id,
            name: activity.name,
            type: activity.type,
            distance: activity.distance,
            movingTime: activity.moving_time,
            elapsedTime: activity.elapsed_time,
            totalElevationGain: activity.total_elevation_gain,
            startDate: new Date(activity.start_date),
            startDateLocal: new Date(activity.start_date_local),
            timezone: activity.timezone,
            startLat: activity.start_latlng?.[0] || null,
            startLng: activity.start_latlng?.[1] || null,
            endLat: activity.end_latlng?.[0] || null,
            endLng: activity.end_latlng?.[1] || null,
            averageSpeed: activity.average_speed,
            maxSpeed: activity.max_speed
          }
        });
      })
    );

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

app.get('/api/stats', requireAuth, async (req: any, res) => {
  const { range = 'week' } = req.query;
  const now = new Date();
  let startDate = new Date();

  switch (range) {
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }

  try {
    const activities = await prisma.activity.findMany({
      where: {
        userId: req.session.userId,
        startDateLocal: {
          gte: startDate
        }
      },
      orderBy: {
        startDateLocal: 'asc'
      }
    });

    res.json(activities);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Helper function to get user from session
async function getUserFromSession(req: Request): Promise<{ stravaAccessToken: string } | null> {
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (!accessToken) {
    return null;
  }
  
  try {
    // Verify the token is valid by making a request to Strava
    const userResponse = await axios.get('https://www.strava.com/api/v3/athlete', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    return {
      stravaAccessToken: accessToken
    };
  } catch (error) {
    console.error('Error verifying Strava token:', error);
    return null;
  }
}

// Helper function to fetch activities from Strava with pagination
async function fetchStravaActivities(accessToken: string, after?: number): Promise<any[]> {
  let page = 1;
  let allActivities: any[] = [];
  let hasMore = true;
  const PER_PAGE = 200; // Maximum allowed by Strava API
  const RATE_LIMIT_DELAY = 1000; // 1 second delay between requests

  // If no after parameter is provided (full sync), set it to the beginning of time
  if (!after) {
    after = new Date(2000, 0, 1).getTime() / 1000; // Start from year 2000
    console.log(`[Strava API] Full sync requested, fetching all activities since ${new Date(after * 1000).toISOString()}`);
  }

  while (hasMore) {
    try {
      console.log(`[Strava API] Fetching page ${page} of activities...`);
      
      // Add delay to avoid rate limiting (except for first request)
      if (page > 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }

      const params: any = {
        per_page: PER_PAGE,
        page: page,
        after: after
      };

      console.log(`[Strava API] Requesting activities with params:`, params);

      const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: params
      });

      const activities = response.data;
      console.log(`[Strava API] Page ${page} returned ${activities.length} activities`);
      
      if (!activities || activities.length === 0) {
        console.log('[Strava API] No more activities found');
        hasMore = false;
        break;
      }

      // Log the date range of activities received
      if (activities.length > 0) {
        const newest = new Date(activities[0].start_date);
        const oldest = new Date(activities[activities.length - 1].start_date);
        console.log(`[Strava API] Page ${page} activities range: ${oldest.toISOString()} to ${newest.toISOString()}`);
      }

      allActivities = [...allActivities, ...activities];
      console.log(`[Strava API] Total activities fetched so far: ${allActivities.length}`);
      
      // Check rate limits from response headers
      const rateLimit = {
        limit: parseInt(response.headers['x-ratelimit-limit'] || '100'),
        usage: parseInt(response.headers['x-ratelimit-usage'] || '0'),
        reset: parseInt(response.headers['x-ratelimit-reset'] || '900')
      };

      console.log(`[Strava API] Rate limits - Usage: ${rateLimit.usage}/${rateLimit.limit}, Reset: ${rateLimit.reset}s`);

      // If we're close to the rate limit, add a delay
      if (rateLimit.usage > rateLimit.limit * 0.8) {
        const delayMs = Math.max(RATE_LIMIT_DELAY * 2, 2000);
        console.log(`[Strava API] Approaching rate limit, adding delay of ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      // If we got less than PER_PAGE activities, we've reached the end
      if (activities.length < PER_PAGE) {
        console.log('[Strava API] Received less than PER_PAGE activities, ending pagination');
        hasMore = false;
        break;
      }

      page++;

    } catch (error: any) {
      console.error('[Strava API] Error fetching activities:', error.message);
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        const waitTime = parseInt(error.response.headers['x-ratelimit-reset'] || '900');
        console.log(`[Strava API] Rate limited. Waiting ${waitTime} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        continue; // Retry the same page after waiting
      }

      // For other errors, stop pagination but return what we have so far
      console.error(`[Strava API] Error on page ${page}:`, error.response?.data || error.message);
      if (allActivities.length > 0) {
        console.log(`[Strava API] Returning ${allActivities.length} activities collected before error`);
        hasMore = false;
        break;
      }
      throw error; // Re-throw if we have no activities
    }
  }

  // Sort activities by date (newest first) before returning
  allActivities.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  
  if (allActivities.length > 0) {
    const newest = new Date(allActivities[0].start_date);
    const oldest = new Date(allActivities[allActivities.length - 1].start_date);
    console.log(`[Strava API] Final activities range: ${oldest.toISOString()} to ${newest.toISOString()}`);
  }

  console.log(`[Strava API] Successfully fetched all ${allActivities.length} activities`);
  return allActivities;
}

// Update MongoDB cache with new activities
async function updateMongoCache(userId: string, activities: any[]): Promise<void> {
  try {
    const collection = db.collection('activities');
    
    // Create bulk operations for updating activities
    const operations = activities.map(activity => ({
      updateOne: {
        filter: { 
          strava_id: activity.id.toString(),
          user_id: userId
        },
        update: { 
          $set: {
            ...activity,
            strava_id: activity.id.toString(),
            user_id: userId,
            start_date: new Date(activity.start_date),
            start_date_local: new Date(activity.start_date_local),
            last_updated: new Date(),
            last_strava_sync: new Date()
          }
        },
        upsert: true
      }
    }));

    if (operations.length > 0) {
      const result = await collection.bulkWrite(operations);
      console.log(`[MongoDB] Updated ${result.modifiedCount} activities, inserted ${result.upsertedCount} new activities`);
      
      // Log the date range of activities being cached
      const dates = activities.map(a => new Date(a.start_date));
      const newest = new Date(Math.max(...dates.map(d => d.getTime())));
      const oldest = new Date(Math.min(...dates.map(d => d.getTime())));
      console.log(`[MongoDB] Cached activities range: ${oldest.toISOString()} to ${newest.toISOString()}`);
    }
  } catch (error) {
    console.error('[MongoDB] Error updating cache:', error);
    throw error;
  }
}

// Update the activities endpoint
app.get('/api/strava/activities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const activities = await fetchStravaActivities(user.stravaAccessToken);
    res.json(activities);
  } catch (error: any) {
    next(error);
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error handling Strava activities:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 