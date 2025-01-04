// Import required libraries
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const session = require('express-session'); // For session handling
const MongoDBStore = require('connect-mongodb-session')(session); // MongoDB session store
require('dotenv').config(); // To access environment variables from the .env file

const path = require('path');
const app = express();
const port = 3000;

// Serve static files (for CSS and images)
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('MongoDB connection error:', error));

// Create a MongoDB session store
const store = new MongoDBStore({
    uri: process.env.MONGODB_URI,
    collection: 'sessions'
});

// Catch errors from the session store
store.on('error', function(error) {
    console.log('Session store error:', error);
});

// Session middleware with MongoDB store and secure cookie settings
app.use(session({
    secret: 'your_secret_key', // Use a secure, random key in production
    resave: false,
    saveUninitialized: true,
    store: store,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 // Cookie expiry: 1 day
    }
}));

// Strava Authorization URL with 'activity:read_all' scope
const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${process.env.STRAVA_REDIRECT_URI}&scope=read,activity:read_all`;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', './views'); // Ensure views are located in the 'views' folder

// Route for homepage
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.send(`<a href="${stravaAuthUrl}">Log in with Strava</a>`);
    }
});

// Strava Callback route
app.get('/callback', async (req, res) => {
    const { code } = req.query;

    try {
        // Exchange the authorization code for an access token
        const response = await axios.post('https://www.strava.com/oauth/token', {
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
        });

        const accessToken = response.data.access_token;
        const userId = response.data.athlete.id;

        // Save the userId in the session
        req.session.userId = userId;
        req.session.accessToken = accessToken;

        res.redirect('/'); // Redirect to the homepage or dashboard after login
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred during token exchange or data retrieval');
    }
});

// Activities route
app.get('/activities', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('You need to log in to view this page.');
    }

    const perPage = 30;
    const currentPage = req.query.page ? parseInt(req.query.page) : 1;

    try {
        // Fetch the activities for the current page
        const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: { Authorization: `Bearer ${req.session.accessToken}` },
            params: {
                page: currentPage,
                per_page: perPage
            }
        });

        const activities = activitiesResponse.data;

        // Check if there are more activities
        const hasMorePages = activities.length === perPage;

        // Render the activities view with pagination details
        res.render('activities', {
            activities,
            currentPage,
            hasMorePages
        });
    } catch (error) {
        console.error('Error fetching activities:', error.response ? error.response.data : error.message);
        res.status(500).send('An error occurred while fetching activities');
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/');
    });
});

// Updated /stats route
app.get('/stats', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('Unauthorized');
    }

    const timeRange = req.query.range;
    let afterDate;
    let groupBy; // 'day' or 'month'

    const now = new Date();

    if (timeRange === 'week') {
        afterDate = new Date(now);
        afterDate.setDate(afterDate.getDate() - 6); // Last 7 days including today
        afterDate.setHours(0, 0, 0, 0); // Start of the day
        groupBy = 'day';
    } else if (timeRange === 'month') {
        afterDate = new Date(now);
        afterDate.setDate(afterDate.getDate() - 29); // Last 30 days
        afterDate.setHours(0, 0, 0, 0); // Start of the day
        groupBy = 'day';
    } else if (timeRange === 'year') {
        afterDate = new Date(now);
        afterDate.setMonth(afterDate.getMonth() - 11); // Last 12 months
        afterDate.setDate(1); // Start from the first day of the month
        afterDate.setHours(0, 0, 0, 0); // Start of the day
        groupBy = 'month';
    }

    const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

    try {
        let allActivities = [];
        let page = 1;
        let perPage = 200; // Max per_page value
        let fetchedAll = false;

        // Fetch all activities after the specified date
        while (!fetchedAll) {
            const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
                headers: { Authorization: `Bearer ${req.session.accessToken}` },
                params: {
                    after: afterTimestamp,
                    per_page: perPage,
                    page: page
                }
            });

            const activities = activitiesResponse.data;
            allActivities = allActivities.concat(activities);

            if (activities.length < perPage) {
                fetchedAll = true;
            } else {
                page++;
            }
        }

        let totalDistance = 0;
        let totalElevation = 0;
        let totalMovingTime = 0;
        let numActivities = allActivities.length;

        // Aggregate data
        allActivities.forEach(activity => {
            totalDistance += activity.distance;
            totalElevation += activity.total_elevation_gain;
            totalMovingTime += activity.moving_time;
        });

        // Correct average pace calculation
        let avgPaceMinutesPerKm = 0;
        let formattedAvgPace = '0:00 min/km';
        if (totalDistance > 0) {
            avgPaceMinutesPerKm = (totalMovingTime / 60) / (totalDistance / 1000);
            const minutesPerKm = Math.floor(avgPaceMinutesPerKm);
            const secondsPerKm = Math.round((avgPaceMinutesPerKm - minutesPerKm) * 60);
            formattedAvgPace = `${minutesPerKm}:${secondsPerKm < 10 ? '0' : ''}${secondsPerKm} min/km`;
        }

        // Prepare data for the graph
        let labels = [];
        let data = [];

        if (groupBy === 'day') {
            let dateMap = new Map();
            let currentDate = new Date(afterDate);
            currentDate.setHours(0, 0, 0, 0); // Start of the day
            let endDate = new Date(now);
            endDate.setHours(0, 0, 0, 0); // Start of the day

            while (currentDate <= endDate) {
                let dateKey = currentDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'
                dateMap.set(dateKey, 0);
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Aggregate distances per day
            allActivities.forEach(activity => {
                let activityDate = new Date(activity.start_date_local); // Use start_date_local for accuracy
                let dateKey = activityDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'
                if (dateMap.has(dateKey)) {
                    dateMap.set(dateKey, dateMap.get(dateKey) + activity.distance / 1000); // Convert to km
                }
            });

            // Prepare labels and data arrays
            dateMap.forEach((distance, dateKey) => {
                let dateObj = new Date(dateKey);
                let month = dateObj.toLocaleString('default', { month: 'short' }); // Abbreviated month
                let day = dateObj.getDate();
                let label = `${month} ${day}`; // 'Jan 5'
                labels.push(label);
                data.push(parseFloat(distance.toFixed(2)));
            });

        } else if (groupBy === 'month') {
            let monthMap = new Map();
            let currentMonth = new Date(afterDate.getFullYear(), afterDate.getMonth(), 1);
            let endMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            while (currentMonth <= endMonth) {
                let monthKey = currentMonth.getFullYear() + '-' + ('0' + (currentMonth.getMonth() + 1)).slice(-2); // 'YYYY-MM'
                monthMap.set(monthKey, 0);
                currentMonth.setMonth(currentMonth.getMonth() + 1);
            }

            // Aggregate distances per month
            allActivities.forEach(activity => {
                let activityDate = new Date(activity.start_date_local); // Use start_date_local
                let monthKey = activityDate.getFullYear() + '-' + ('0' + (activityDate.getMonth() + 1)).slice(-2); // 'YYYY-MM'
                if (monthMap.has(monthKey)) {
                    monthMap.set(monthKey, monthMap.get(monthKey) + activity.distance / 1000); // Convert to km
                }
            });

            // Prepare labels and data arrays
            monthMap.forEach((distance, monthKey) => {
                let dateObj = new Date(monthKey + '-01');
                let month = dateObj.toLocaleString('default', { month: 'short' }); // Abbreviated month
                let year = dateObj.getFullYear();
                let label = `${month} ${year}`; // 'Jan 2023'
                labels.push(label);
                data.push(parseFloat(distance.toFixed(2)));
            });
        }

        res.json({
            totalDistance: (totalDistance / 1000).toFixed(2),  // Convert to km
            totalElevation: totalElevation.toFixed(2),  // Keep in meters
            numActivities,
            avgPace: formattedAvgPace,
            labels,
            data
        });
    } catch (error) {
        console.error('Error fetching stats:', error.response ? error.response.data : error.message);
        res.status(500).send('Error fetching stats');
    }
});



// Updated /dashboard route
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send('You need to log in to view this page.');
    }

    try {
        // Fetch the user's activities
        const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: { Authorization: `Bearer ${req.session.accessToken}` },
            params: {
                per_page: 100,
                page: 1
            }
        });

        const activities = activitiesResponse.data;
        let totalDistance = 0;
        let totalElevation = 0;
        let totalMovingTime = 0;
        let numActivities = activities.length;

        // Calculate total distance, elevation gain, and total moving time
        activities.forEach(activity => {
            totalDistance += activity.distance;
            totalElevation += activity.total_elevation_gain;
            totalMovingTime += activity.moving_time;
        });

        // Correct average pace calculation
        let formattedPace = '0:00 min/km';
        if (totalDistance > 0) {
            const avgPaceMinutesPerKm = (totalMovingTime / 60) / (totalDistance / 1000);
            const minutesPerKm = Math.floor(avgPaceMinutesPerKm);
            const secondsPerKm = Math.round((avgPaceMinutesPerKm - minutesPerKm) * 60);
            formattedPace = `${minutesPerKm}:${secondsPerKm < 10 ? '0' : ''}${secondsPerKm} min/km`;
        }

        const totalDistanceKm = (totalDistance / 1000).toFixed(2);
        const totalElevationMeters = totalElevation.toFixed(2);

        const latestActivity = activities[0];
        const latestDistanceKm = (latestActivity.distance / 1000).toFixed(2);
        const latestDurationMinutes = (latestActivity.moving_time / 60).toFixed(2);

        // Render the dashboard view with calculated stats
        res.render('dashboard', {
            totalDistance: totalDistanceKm,
            totalElevation: totalElevationMeters,
            numActivities,
            latestActivity,
            distanceKm: latestDistanceKm,
            durationMinutes: latestDurationMinutes,
            formattedPace
        });
    } catch (error) {
        console.error('Error fetching activities for dashboard:', error.response ? error.response.data : error.message);
        res.status(500).send('An error occurred while fetching activities');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
