import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Activity {
  id: string;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date_local: string;
  average_speed: number;
  average_heartrate: number;
}

const ActivityCard: React.FC<{ activity: Activity }> = ({ activity }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const calculatePace = (distance: number, time: number) => {
    const km = distance / 1000;
    const minutes = time / 60;
    const pace = minutes / km;
    const paceMinutes = Math.floor(pace);
    const paceSeconds = Math.round((pace - paceMinutes) * 60);
    return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/km`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="glass-card p-4 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">{activity.name}</h3>
          <p className="text-sm text-gray-400">{formatDate(activity.start_date_local)}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6">
          <div className="text-center sm:text-right">
            <p className="text-xs sm:text-sm text-gray-400">Distance</p>
            <p className="text-base sm:text-lg font-semibold text-white">
              {(activity.distance / 1000).toFixed(2)} km
            </p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs sm:text-sm text-gray-400">Time</p>
            <p className="text-base sm:text-lg font-semibold text-white">
              {formatDuration(activity.moving_time)}
            </p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs sm:text-sm text-gray-400">Pace</p>
            <p className="text-base sm:text-lg font-semibold text-white">
              {calculatePace(activity.distance, activity.moving_time)}
            </p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs sm:text-sm text-gray-400">Elevation</p>
            <p className="text-base sm:text-lg font-semibold text-white">
              {activity.total_elevation_gain.toFixed(0)}m
            </p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs sm:text-sm text-gray-400">Heart Rate</p>
            <p className="text-base sm:text-lg font-semibold text-white">
              {activity.average_heartrate ? Math.round(activity.average_heartrate) : '--'} bpm
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Activities = () => {
  const { accessToken } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        console.log('Fetching activities...');
        const response = await axios.get('/api/strava/activities', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        console.log('Activities received:', response.data.length);
        
        // Filter for running activities only (including treadmill runs)
        const runningActivities = response.data.filter((activity: Activity) => 
          activity.type.toLowerCase().includes('run')
        );
        
        // Sort activities by date in descending order (most recent first)
        const sortedActivities = runningActivities.sort((a: Activity, b: Activity) => 
          new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime()
        );
        
        setActivities(sortedActivities);
        setFilteredActivities(sortedActivities);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchActivities();
    }
  }, [accessToken]);

  useEffect(() => {
    let filtered = activities;

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(activity => activity.type.toLowerCase() === filter);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(activity =>
        activity.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredActivities(filtered);
  }, [filter, searchQuery, activities]);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-400">Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="content-container">
        {/* Filters */}
        <div className="flex flex-col space-y-4 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['all', 'run', 'ride', 'swim'].map(type => (
              <motion.button
                key={type}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(type)}
                className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-medium text-sm sm:text-base ${
                  filter === type
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                    : 'glass text-gray-300 hover:bg-white/10'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </motion.button>
            ))}
          </div>
          
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg glass text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Activities List */}
        <motion.div layout className="space-y-4">
          <AnimatePresence>
            {filteredActivities.map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Activities; 