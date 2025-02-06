import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

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

const CACHE_KEY = 'strava_activities_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes local cache

export const useActivities = () => {
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
            console.log('Using local cache');
            setActivities(data);
            setLoading(false);
            return;
          }
        }
      }

      // Fetch from our server (which handles MongoDB caching)
      console.log(force ? 'Force refreshing activities' : 'Fetching activities');
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

  return { 
    activities, 
    loading, 
    error,
    refreshActivities: () => fetchActivities(true) // Force refresh function
  };
}; 