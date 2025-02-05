require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const { mockAthlete, mockActivities } = require('./mock/strava-data');

const app = express();
app.use(express.json());

// Configure MIME types
express.static.mime.define({
    'application/javascript': ['js', 'mjs'],
    'text/javascript': ['ts', 'tsx', 'jsx']
});

// Environment check
const USE_MOCK_DATA = process.env.NODE_ENV === 'development' || process.env.USE_MOCK_DATA === 'true';

// Middleware to handle CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// API Routes
const apiRouter = express.Router();

// Endpoint to initiate Strava OAuth
apiRouter.get('/auth/strava', (req, res) => {
    if (USE_MOCK_DATA) {
        res.json({ authUrl: '/mock-auth' });
        return;
    }

    try {
        const clientId = process.env.STRAVA_CLIENT_ID;
        const redirectUri = process.env.STRAVA_REDIRECT_URI;
        const scope = 'read,activity:read_all,profile:read_all';
        const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
        res.json({ authUrl });
    } catch (error) {
        console.error('Strava auth error:', error);
        res.status(500).json({ error: 'Failed to initiate Strava auth' });
    }
});

// Mock auth endpoint
apiRouter.get('/mock-auth', (req, res) => {
    // Simulate a small delay to mimic network request
    setTimeout(() => {
        res.json({
            access_token: 'mock_access_token_' + Date.now(),
            refresh_token: 'mock_refresh_token_' + Date.now(),
            athlete: mockAthlete,
            expires_at: Math.floor(Date.now() / 1000) + 21600, // Expires in 6 hours
            expires_in: 21600
        });
    }, 500);
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
    if (USE_MOCK_DATA) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        res.json(mockActivities);
        return;
    }

    try {
        const { access_token } = req.query;
        const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: { Authorization: `Bearer ${access_token}` },
            params: { per_page: 10 }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Activities fetch error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ error: 'Failed to fetch activities' });
    }
});

// Proxy endpoint for OpenAI API calls
apiRouter.post('/ai/analyze', async (req, res) => {
    try {
        const { activities, prompt } = req.body;
        
        // Validate request
        if (!activities || !prompt) {
            return res.status(400).json({ error: 'Missing required data' });
        }

        if (USE_MOCK_DATA) {
            // Return mock analysis after a delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            return res.json({
                choices: [{
                    message: {
                        content: generateMockAnalysis(prompt, activities)
                    }
                }]
            });
        }

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo-16k", // Using 16k model for longer responses
            messages: [{
                role: "system",
                content: "You are an expert running coach and exercise physiologist with deep knowledge of training principles, race prediction, and injury prevention."
            }, {
                role: "user",
                content: prompt
            }],
            temperature: 0.7,
            max_tokens: 2000 // Allow for longer responses
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('AI analysis error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.error?.message || 'Failed to get AI analysis';
        res.status(error.response?.status || 500).json({ error: errorMessage });
    }
});

// Helper function to generate mock analysis
function generateMockAnalysis(prompt, activities) {
    if (prompt.includes('training load')) {
        return `Training Load Analysis

1. Current Training Load Status:
• Current status: OPTIMAL
• Weekly volume is consistent and well-structured
• No immediate signs of overtraining

2. Weekly Mileage Trend:
• Average weekly distance: 35.2 km
• Trend: Gradually increasing
• Recommendation: Continue progressive overload

3. Intensity Distribution:
• 80% Easy/Low intensity
• 15% Moderate intensity
• 5% High intensity
• Distribution is ideal for base building

4. Recovery Status:
• Current recovery: Good
• Recommendation: Maintain current easy/hard balance
• Consider adding one recovery week every 4 weeks

5. Injury Risk Assessment:
• Current risk: LOW
• Good progression in training load
• No sudden spikes in weekly mileage
• Continue current approach`;
    } else if (prompt.includes('predict their race times')) {
        return `Race Time Predictions

1. Current Fitness Assessment:
• Strong aerobic base
• Good consistency in training
• Ready for race-specific training

2. Predicted Race Times:
• 5K: 22:30 (High confidence)
• 10K: 46:45 (High confidence)
• Half Marathon: 1:43:30 (Medium confidence)
• Marathon: 3:45:00 (Low confidence)

3. Confidence Levels Explained:
• High confidence for shorter distances based on recent training
• Lower confidence for marathon due to limited long runs

4. Training Recommendations:
• Add more long runs for marathon preparation
• Include tempo runs for 10K-specific training
• Incorporate track workouts for 5K speed

5. Key Workouts:
• 5K: 8x400m intervals at 5K pace
• 10K: 2x3K at goal race pace
• Half: 15K progressive runs
• Marathon: Regular 30K long runs`;
    } else if (prompt.includes('provide training advice')) {
        return `AI Coach Analysis

1. Training Pattern Analysis:
• Good mix of workouts with proper progression
• Consistent training frequency
• Appropriate recovery periods between hard sessions

2. Areas for Improvement:
• Consider adding more structured speedwork
• Gradually increase long run distance
• Include more hill training for strength

3. Recovery Recommendations:
• Current recovery seems adequate
• Continue with easy days between hard sessions
• Focus on sleep and nutrition

4. Suggested Training Plan:
Monday: Easy Recovery Run (6-8km)
Tuesday: Speed Session (8x400m)
Wednesday: Rest or Cross-Training
Thursday: Tempo Run (6-8km)
Friday: Easy Run (5km)
Saturday: Long Run (12-15km)
Sunday: Rest or Light Cross-Training

Key Focus Areas:
• Build aerobic base through consistent mileage
• Improve speed through structured intervals
• Maintain proper recovery between sessions`;
    }
    return 'Analysis not available for this type of request.';
}

// Mount API routes
app.use('/api', apiRouter);

// Serve static files from the dist directory in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    
    // Handle all other routes by serving index.html from dist
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
} else {
    // Serve static files with proper MIME types in development
    app.use(express.static(path.join(__dirname, '.'), {
        setHeaders: (res, path) => {
            if (path.endsWith('.ts') || path.endsWith('.tsx')) {
                res.setHeader('Content-Type', 'text/javascript');
            }
            if (path.endsWith('.js') || path.endsWith('.jsx') || path.endsWith('.mjs')) {
                res.setHeader('Content-Type', 'application/javascript');
            }
        }
    }));

    // Handle all other routes by serving index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
}); 