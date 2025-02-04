import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface Activity {
  id: string;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date_local: string;
  average_speed: number;
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-black/30 backdrop-blur-md p-6 rounded-xl hover:bg-black/40 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">{activity.name}</h3>
          <p className="text-gray-400">{formatDate(activity.start_date_local)}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-400">Distance</p>
            <p className="text-lg font-semibold text-white">
              {(activity.distance / 1000).toFixed(2)} km
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Time</p>
            <p className="text-lg font-semibold text-white">
              {formatDuration(activity.moving_time)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Elevation</p>
            <p className="text-lg font-semibold text-white">
              {activity.total_elevation_gain.toFixed(0)}m
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Avg Speed</p>
            <p className="text-lg font-semibold text-white">
              {(activity.average_speed * 3.6).toFixed(1)} km/h
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Activities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await axios.get('/api/activities');
        setActivities(response.data);
        setFilteredActivities(response.data);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

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
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Filters */}
        <div className="mb-8 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex space-x-4">
            {['all', 'run', 'ride', 'swim'].map(type => (
              <motion.button
                key={type}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === type
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                    : 'bg-black/30 text-gray-300 hover:bg-black/40'
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
            className="w-full sm:w-64 px-4 py-2 rounded-lg bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
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