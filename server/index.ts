import express from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import session from 'express-session';
import axios from 'axios';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

declare global {
  namespace Express {
    interface User {
      id: string;
    }
  }
}

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

// Constants for Strava API
const PER_PAGE = 200; // Maximum allowed by Strava API
const RATE_LIMIT_DELAY = 500; // 500ms delay between requests to avoid rate limiting
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

// Helper function to fetch activities from Strava with pagination
async function fetchStravaActivities(accessToken: string, after?: number): Promise<any[]> {
  let page = 1;
  let allActivities: any[] = [];
  let retryCount = 0;

  while (true) {
    try {
      console.log(`[Strava API] Fetching page ${page} of activities...`);
      
      // Add delay to avoid rate limiting (except for first request)
      if (page > 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }

      const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          per_page: PER_PAGE,
          page: page,
          after: after
        }
      });

      const activities = response.data;
      
      if (!activities || activities.length === 0) {
        console.log('[Strava API] No more activities found');
        break;
      }

      allActivities = [...allActivities, ...activities];
      console.log(`[Strava API] Retrieved ${activities.length} activities (total: ${allActivities.length})`);
      
      // If we got less than PER_PAGE activities, we've reached the end
      if (activities.length < PER_PAGE) {
        break;
      }

      page++;
      retryCount = 0; // Reset retry count on successful request

    } catch (error: any) {
      console.error('[Strava API] Error fetching activities:', error.message);
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        const waitTime = parseInt(error.response.headers['x-ratelimit-reset'] || '15');
        console.log(`[Strava API] Rate limited. Waiting ${waitTime} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        continue;
      }

      // Handle other errors with retry logic
      retryCount++;
      if (retryCount > MAX_RETRIES) {
        console.error(`[Strava API] Max retries (${MAX_RETRIES}) exceeded. Stopping pagination.`);
        break;
      }

      console.log(`[Strava API] Retry ${retryCount}/${MAX_RETRIES} after error...`);
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY * retryCount));
      continue;
    }
  }

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
            last_updated: new Date()
          }
        },
        upsert: true
      }
    }));

    if (operations.length > 0) {
      const result = await collection.bulkWrite(operations);
      console.log(`[MongoDB] Updated ${result.modifiedCount} activities, inserted ${result.upsertedCount} new activities`);
    }

  } catch (error) {
    console.error('[MongoDB] Error updating cache:', error);
    throw error;
  }
}

// Update the activities endpoint
app.get('/api/strava/activities', async (req: Request, res: Response) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  const userId = req.user?.id;
  const fullSync = req.query.fullSync === 'true';

  if (!accessToken || !userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log(`[Server] Fetching activities for user ${userId} (fullSync: ${fullSync})`);
    
    // Get the last sync time from MongoDB
    const collection = db.collection('activities');
    const lastActivity = await collection
      .find({ user_id: userId })
      .sort({ start_date: -1 })
      .limit(1)
      .toArray();

    let after: number | undefined;
    if (!fullSync && lastActivity.length > 0) {
      // If not doing a full sync, only get activities after the last one we have
      after = Math.floor(new Date(lastActivity[0].start_date).getTime() / 1000);
      console.log(`[Server] Fetching activities after ${new Date(after * 1000).toISOString()}`);
    }

    // Fetch activities from Strava with pagination
    const activities = await fetchStravaActivities(accessToken, after);
    console.log(`[Server] Retrieved ${activities.length} total activities from Strava`);

    // Update MongoDB cache
    await updateMongoCache(userId, activities);

    // Return all activities from MongoDB (including any that were just cached)
    const allActivities = await collection
      .find({ user_id: userId })
      .sort({ start_date: -1 })
      .toArray();

    console.log(`[Server] Returning ${allActivities.length} activities to client`);
    res.json(allActivities);

  } catch (error: any) {
    console.error('[Server] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch activities',
      details: error.message
    });
  }
});

// Start server
app.listen(port, () => {
 