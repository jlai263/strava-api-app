import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

export interface Activity {
  id: number;
  stravaId: number;
  type: string;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  timezone: string;
  average_speed: number;
  max_speed: number;
  average_heartrate: number;
  max_heartrate: number;
  elev_high: number;
  elev_low: number;
  description: string;
  calories: number;
  lastUpdated: string;
  lastStravaSync: string;
}

interface ActivitiesContextType {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  refreshActivities: () => Promise<void>;
}

const ActivitiesContext = createContext<ActivitiesContextType | undefined>(undefined);

const CACHE_KEY = 'strava_activities_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes local cache

export const ActivitiesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();

  const fetchActivities = useCallback(async (force = false) => {
    if (!accessToken) {
      setError('No access token available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check local storage cache first (unless force refresh)
      if (!force) {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          const age = Date.now() - timestamp;
          
          if (age < CACHE_DURATION) {
            console.log('Using local cache from ActivitiesContext');
            setActivities(data);
            setLoading(false);
            return;
          }
        }
      }

      // Fetch from our server (which handles MongoDB caching)
      console.log(force ? 'Force refreshing activities' : 'Fetching activities from ActivitiesContext');
      const response = await axios.get('/api/strava/activities', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // Update state and cache
      setActivities(response.data);
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: response.data,
        timestamp: Date.now()
      }));

    } catch (error) {
      console.error('Error fetching activities:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch activities');
      
      // If API fails, try to use cached data even if expired
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { data } = JSON.parse(cachedData);
        console.log('Using expired cache due to API error');
        setActivities(data);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Initial fetch
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return (
    <ActivitiesContext.Provider value={{
      activities,
      loading,
      error,
      refreshActivities: () => fetchActivities(true)
    }}>
      {children}
    </ActivitiesContext.Provider>
  );
};

export const useActivities = () => {
  const context = useContext(ActivitiesContext);
  if (!context) {
    throw new Error('useActivities must be used within an ActivitiesProvider');
  }
  return context;
}; 