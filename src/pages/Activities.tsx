import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActivities, Activity } from '../context/ActivitiesContext';

const ActivityCard = ({ activity }: { activity: Activity }) => {
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
  const { activities, isLoading, error, refreshActivities } = useActivities();
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Add force sync function
  const handleForceSync = async () => {
    // Clear cache
    localStorage.removeItem('strava_activities_cache');
    localStorage.removeItem('strava_activities_metadata');
    // Force refresh
    await refreshActivities();
  };

  // Filter activities when filter or search changes
  useEffect(() => {
    console.log('Total activities received:', activities.length);
    let filtered = [...activities]; // Create a new array to avoid mutation

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

    // Sort by date (most recent first)
    filtered.sort((a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime());

    setFilteredActivities(filtered);
    setPage(1); // Reset to first page when filters change
    console.log('Filtered activities:', filtered.length);
  }, [filter, searchQuery, activities]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredActivities.length / ITEMS_PER_PAGE);
  const paginatedActivities = filteredActivities.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-400">Loading activities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Filters */}
      <div className="flex flex-col space-y-4 mb-6 sm:mb-8">
        <div className="flex justify-between items-center">
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
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleForceSync}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg glass text-gray-300 hover:bg-white/10 disabled:opacity-50 flex items-center space-x-2"
          >
            <span>{isLoading ? 'Syncing...' : 'Force Sync'}</span>
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-orange-500"></div>
            )}
          </motion.button>
        </div>
        
        <input
          type="text"
          placeholder="Search activities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 rounded-lg glass text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />

        <div className="text-sm text-gray-400">
          Showing {filteredActivities.length} activities
        </div>
      </div>

      {/* Activities List */}
      <motion.div layout className="space-y-4">
        <AnimatePresence>
          {paginatedActivities.map(activity => (
            <ActivityCard key={activity.stravaId} activity={activity} />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg glass text-gray-300 hover:bg-white/10 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-300">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg glass text-gray-300 hover:bg-white/10 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default Activities; 