import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import session from 'express-session';
import axios from 'axios';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import Activity from '../src/models/Activity';

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
const EPOCH_START = new Date('2000-01-01T00:00:00Z');

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

interface StravaUser {
  id: number;
  stravaAccessToken: string;
}

// Helper function to get user from session
async function getUserFromSession(req: Request): Promise<StravaUser | null> {
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
      id: userResponse.data.id,
      stravaAccessToken: accessToken
    };
  } catch (error) {
    console.error('Error verifying Strava token:', error);
    return null;
  }
}

// Helper function to handle rate limits
async function handleRateLimit(headers: any) {
  const usage = parseInt(headers['x-ratelimit-usage']?.split(',')[0] || '0');
  const limit = parseInt(headers['x-ratelimit-limit']?.split(',')[0] || '600');
  
  if (usage > limit * 0.8) { // If we're using more than 80% of our rate limit
    console.log(`[Strava API] Rate limit usage high (${usage}/${limit}). Waiting ${RATE_LIMIT_DELAY}ms...`);
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }
}

// Helper function to fetch activities from Strava
async function fetchStravaActivities(accessToken: string, after: Date = EPOCH_START, page: number = 1): Promise<any[]> {
  try {
    console.log(`[Strava API] Fetching page ${page} of activities after ${after.toISOString()}`);
    
    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: {
        after: Math.floor(after.getTime() / 1000),
        per_page: PER_PAGE,
        page
      }
    });

    await handleRateLimit(response.headers);
    
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 429) { // Rate limit exceeded
      const resetTime = error.response.headers['x-ratelimit-reset'];
      const waitTime = (parseInt(resetTime) * 1000) - Date.now();
      
      console.log(`[Strava API] Rate limit exceeded. Waiting ${waitTime}ms until reset...`);
      await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
      
      return fetchStravaActivities(accessToken, after, page);
    }
    throw error;
  }
}

// GET /api/strava/activities - Get all activities with optional force refresh
const getActivitiesHandler: RequestHandler = async (req, res, next) => {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const forceRefresh = req.query.forceRefresh === 'true';
    const after = req.query.after ? new Date(req.query.after as string) : EPOCH_START;
    const before = req.query.before ? new Date(req.query.before as string) : new Date();

    // Check if we need to refresh data
    const needsRefresh = forceRefresh || await Activity.needsRefresh(user.id);

    if (needsRefresh) {
      console.log('[Strava API] Fetching new activities from Strava...');
      const stravaActivities = await fetchStravaActivities(user.stravaAccessToken, after);
      
      // Bulk upsert activities
      const result = await Activity.bulkUpsertActivities(stravaActivities, user.id);
      console.log(`[Strava API] Upserted ${result.upsertedCount} activities, modified ${result.modifiedCount} activities`);
    }

    // Query activities from database with date range
    const activities = await Activity.find({
      userId: user.id,
      start_date: { $gte: after, $lte: before }
    }).sort({ start_date: -1 });

    // Get metadata
    const [earliest, latest] = await Promise.all([
      Activity.getEarliestActivityDate(user.id),
      Activity.getLatestActivityDate(user.id)
    ]);

    const metadata = {
      count: activities.length,
      dateRange: {
        earliest: earliest?.toISOString() || null,
        latest: latest?.toISOString() || null
      },
      lastSync: new Date().toISOString()
    };

    res.json({
      activities,
      metadata
    });
  } catch (error: any) {
    next(error);
  }
};

app.get('/api/strava/activities', getActivitiesHandler);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error handling request:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 