import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import cors from 'cors';
import mongoose from 'mongoose';
import User from './models/User.js';
import Activity from './models/Activity.js';
import { mockAthlete, mockActivities } from './mock/strava-data.js';

dotenv.config();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4 // Use IPv4, skip trying IPv6
}).then(() => {
  console.log('Connected to MongoDB');
  if (isProduction) {
    console.log('Running in production mode');
  } else {
    console.log('Running in development mode');
  }
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080; // Default to 8080 for Railway

// Log environment variables (excluding sensitive ones)
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: port,
  MONGODB_URI: process.env.MONGODB_URI ? '(set)' : '(not set)',
  RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN || '(not set)'
});

// Parse JSON bodies
app.use(express.json());

// Health check endpoint - placing it before other middleware
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Environment check
const USE_MOCK_DATA = process.env.NODE_ENV === 'development' || process.env.USE_MOCK_DATA === 'true';
const isProduction = process.env.NODE_ENV === 'production';
const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
  : 'http://localhost:3000';
const API_URL = process.env.NODE_ENV === 'production'
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${port}`;

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
  
  // Handle client-side routing
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    }
  });
}

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      FRONTEND_URL,
      'https://www.strava.com',
      'https://strava.com'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('Blocked by CORS:', origin);
      return callback(null, false);
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security middleware for production
if (isProduction) {
  app.use((req, res, next) => {
    // Trust Railway's proxy
    app.set('trust proxy', true);

    // Force HTTPS
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      // Don't redirect health check requests
      if (req.path === '/api/health') {
        return next();
      }
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }

    // Security headers
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Allow Strava to frame the app if needed
    if (req.headers.referer && req.headers.referer.includes('strava.com')) {
      res.removeHeader('X-Frame-Options');
    }

    next();
  });
}

// API Routes
const apiRouter = express.Router();

// Mount API routes
app.use('/api', apiRouter);

// Log all API requests
apiRouter.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Cache for Strava activities
const activitiesCache = {
    data: null,
    timestamp: null,
    CACHE_DURATION: 15 * 60 * 1000 // 15 minutes
};

// Endpoint to initiate Strava OAuth
apiRouter.get('/auth/strava', (req, res) => {
  try {
    console.log('Initiating Strava auth...');
    const clientId = process.env.STRAVA_CLIENT_ID;
    const redirectUri = process.env.NODE_ENV === 'production'
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/strava/callback`
      : process.env.STRAVA_REDIRECT_URI;

    if (!clientId) {
      console.error('Missing STRAVA_CLIENT_ID');
      return res.status(500).json({ error: 'Strava client ID not configured' });
    }

    console.log('Using redirect URI:', redirectUri);
    const scope = 'read,activity:read_all,profile:read_all';
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&approval_prompt=force`;
    
    console.log('Generated auth URL:', authUrl);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error in /api/auth/strava:', error);
    res.status(500).json({ error: 'Failed to initiate Strava authentication' });
  }
});

// Mock auth endpoint
apiRouter.get('/mock-auth', (req, res) => {
    console.log('Mock auth endpoint hit');
    try {
        const mockResponse = {
            status: 'success',
            access_token: 'mock_access_token_' + Date.now(),
            refresh_token: 'mock_refresh_token_' + Date.now(),
            athlete: mockAthlete,
            expires_at: Math.floor(Date.now() / 1000) + 21600,
            expires_in: 21600
        };
        console.log('Sending mock response:', mockResponse);
        res.json(mockResponse);
    } catch (error) {
        console.error('Mock auth error:', error);
        res.status(500).json({ error: 'Failed to complete mock authentication', details: error.message });
    }
});

// Endpoint to exchange code for token
apiRouter.post('/auth/token', async (req, res) => {
    if (USE_MOCK_DATA) {
        res.json({
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token',
            athlete: mockAthlete
        });
        return;
    }

    try {
        const { code } = req.body;
        const response = await axios.post('https://www.strava.com/oauth/token', {
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code'
        });
        res.json(response.data);
    } catch (error) {
        console.error('Token exchange error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to exchange token' });
    }
});

// Endpoint to refresh token
apiRouter.post('/auth/refresh', async (req, res) => {
    if (USE_MOCK_DATA) {
        res.json({
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token'
        });
        return;
    }

    try {
        const { refresh_token } = req.body;
        const response = await axios.post('https://www.strava.com/oauth/token', {
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            refresh_token,
            grant_type: 'refresh_token'
        });
        res.json(response.data);
    } catch (error) {
        console.error('Token refresh error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

// Proxy endpoint for Strava API calls
apiRouter.get('/strava/activities', async (req, res) => {
    console.log('Activities endpoint hit');
    
    try {
        const accessToken = req.headers.authorization?.split(' ')[1] || req.query.access_token;
        
        if (!accessToken) {
            return res.status(401).json({ error: 'No access token provided' });
        }

        // First, try to get activities from MongoDB
        const user = await User.findOne({ accessToken });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Check if we need to refresh data from Strava
        const lastSync = user.lastSync ? new Date(user.lastSync) : new Date(0);
        const syncThreshold = 15 * 60 * 1000; // 15 minutes in milliseconds
        const shouldSync = Date.now() - lastSync.getTime() > syncThreshold;

        if (!shouldSync && activitiesCache.data) {
            console.log('Returning cached activities data');
            return res.json(activitiesCache.data);
        }

        // Get activities from the last 30 days from Strava
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
                after: Math.floor(thirtyDaysAgo.getTime() / 1000),
                per_page: 100,
                page: 1
            }
        });

        // Transform and store activities
        const activities = await Promise.all(response.data.map(async (activity) => {
            const transformedActivity = {
                stravaId: activity.id.toString(),
                userId: user._id,
                name: activity.name,
                type: activity.type,
                distance: activity.distance,
                movingTime: activity.moving_time,
                elapsedTime: activity.elapsed_time,
                totalElevationGain: activity.total_elevation_gain,
                startDate: new Date(activity.start_date),
                averageHeartrate: activity.average_heartrate,
                maxHeartrate: activity.max_heartrate,
                averageSpeed: activity.average_speed,
                maxSpeed: activity.max_speed,
                startLatlng: activity.start_latlng,
                endLatlng: activity.end_latlng
            };

            // Use findOneAndUpdate to upsert the activity
            const savedActivity = await Activity.findOneAndUpdate(
                { stravaId: transformedActivity.stravaId },
                transformedActivity,
                { upsert: true, new: true }
            );

            return {
                id: savedActivity.stravaId,
                name: savedActivity.name,
                distance: savedActivity.distance,
                moving_time: savedActivity.movingTime,
                elapsed_time: savedActivity.elapsedTime,
                total_elevation_gain: savedActivity.totalElevationGain,
                start_date: savedActivity.startDate,
                start_date_local: savedActivity.startDate,
                type: savedActivity.type,
                average_heartrate: savedActivity.averageHeartrate,
                max_heartrate: savedActivity.maxHeartrate,
                average_speed: savedActivity.averageSpeed,
                max_speed: savedActivity.maxSpeed
            };
        }));

        // Update user's lastSync timestamp
        await User.findByIdAndUpdate(user._id, { lastSync: new Date() });

        // Update cache
        activitiesCache.data = activities;
        activitiesCache.timestamp = Date.now();

        console.log('Sending activities:', activities.length);
        res.json(activities);
    } catch (error) {
        console.error('Error fetching Strava activities:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ 
            error: 'Failed to fetch activities',
            details: error.response?.data || error.message
        });
    }
});

// AI Analysis endpoint
apiRouter.post('/ai/analyze', async (req, res) => {
    try {
        console.log('Received analysis request with data:', req.body);
        const { activities, trainingLoad, zoneDistribution } = req.body;

        // Validate request data
        if (!activities || !Array.isArray(activities) || activities.length === 0) {
            return res.status(400).json({ error: 'No activities data provided' });
        }

        if (!trainingLoad || !zoneDistribution) {
            return res.status(400).json({ error: 'Missing training load or zone distribution data' });
        }

        // Format the data for analysis, handling potential undefined values
        const last30DaysActivities = activities.map(activity => {
            const date = activity.date || activity.start_date_local;
            if (!date) {
                console.warn('Activity missing date:', activity);
                return null;
            }

            // Handle date formatting safely
            let formattedDate = date;
            if (typeof date === 'string') {
                formattedDate = date.includes('T') ? date.split('T')[0] : date;
            }

            return {
                date: formattedDate,
                distance: Math.round((activity.distance || 0) / 1000), // km
                duration: Math.round((activity.moving_time || activity.duration || 0) / 60), // minutes
                type: activity.type || 'unknown',
                heartrate: activity.average_heartrate || activity.heartrate || null
            };
        }).filter(Boolean); // Remove null entries

        if (last30DaysActivities.length === 0) {
            return res.status(400).json({ error: 'No valid activities data after formatting' });
        }

        // Create a detailed prompt for the AI
        const prompt = `As an expert running coach, analyze this athlete's training data:

1. Recent Activities (Last 30 Days):
${JSON.stringify(last30DaysActivities, null, 2)}

2. Training Load:
- Acute Load: ${trainingLoad.acute}
- Chronic Load: ${trainingLoad.chronic}
- A:C Ratio: ${trainingLoad.ratio}

3. Heart Rate Zone Distribution:
- Zone 1 (Recovery): ${zoneDistribution.zone1}%
- Zone 2 (Aerobic): ${zoneDistribution.zone2}%
- Zone 3 (Tempo): ${zoneDistribution.zone3}%
- Zone 4 (Threshold): ${zoneDistribution.zone4}%
- Zone 5 (VO2 Max): ${zoneDistribution.zone5}%

Please provide a detailed analysis including:
1. Current training status and load assessment
2. Recovery and fatigue analysis
3. Training intensity distribution evaluation
4. Specific recommendations for improvement
5. Injury risk assessment
6. Suggested adjustments to training pattern`;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo-16k",
            messages: [
                {
                    role: "system",
                    content: "You are an expert running coach and exercise physiologist with deep knowledge of training principles, exercise science, and injury prevention. Provide specific, actionable advice based on the athlete's data."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('AI analysis error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to get AI analysis';
        res.status(error.response?.status || 500).json({ error: errorMessage });
    }
});

// Strava OAuth callback endpoint
apiRouter.get('/strava/callback', async (req, res) => {
  try {
    console.log('Strava callback received:', req.query);
    const { code, error } = req.query;

    if (error) {
      console.error('Strava auth error:', error);
      return res.redirect('/?error=' + encodeURIComponent(error));
    }

    if (!code) {
      console.error('No code received from Strava');
      return res.redirect('/?error=no_code');
    }

    // Exchange code for token
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    });

    console.log('Token exchange successful');

    // Store tokens in localStorage (client will read these from the URL)
    const redirectUrl = `/?access_token=${tokenResponse.data.access_token}&refresh_token=${tokenResponse.data.refresh_token}&expires_at=${tokenResponse.data.expires_at}`;
    
    console.log('Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in Strava callback:', error);
    res.redirect('/?error=' + encodeURIComponent('Failed to complete authentication'));
  }
});

if (isProduction) {
    // Serve static files from the dist directory
    app.use(express.static(path.join(__dirname, 'dist')));
    
    // Handle all routes by serving index.html
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        }
    });
} else {
    // In development, only handle API routes
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.redirect(`http://localhost:5173${req.path}`);
        }
    });
}

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    console.log(`API URL: ${API_URL}`);
    console.log(`Frontend URL: ${FRONTEND_URL}`);
}); 