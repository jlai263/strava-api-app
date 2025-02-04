import express from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import session from 'express-session';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

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

// Start server
app.listen(port, () => {
 