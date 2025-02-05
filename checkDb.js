import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Activity from './models/Activity.js';

dotenv.config();

async function checkDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log('\nUsers found:', users.length);
        users.forEach(user => {
            console.log(`- User ID: ${user.stravaId}`);
            console.log(`  Name: ${user.profile?.firstName} ${user.profile?.lastName}`);
            console.log(`  Last Updated: ${user.updatedAt}`);
            console.log('---');
        });

        const activities = await Activity.find({});
        console.log('\nActivities found:', activities.length);
        if (activities.length > 0) {
            console.log('Latest 3 activities:');
            activities.slice(0, 3).forEach(activity => {
                console.log(`- ${activity.name} (${activity.type})`);
                console.log(`  Distance: ${activity.distance}m`);
                console.log(`  Date: ${activity.startDate}`);
                console.log('---');
            });
        }

        mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

// Execute the function
checkDatabase(); 