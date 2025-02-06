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
  startLatlng?: [number, number];
  endLatlng?: [number, number];
  map?: {
    polyline: string;
  };
}

export interface ActivitiesContextType {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  refreshActivities: () => Promise<void>;
}

const ActivitiesContext = createContext<ActivitiesContextType | undefined>(undefined);

const CACHE_KEY = 'strava_activities_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes local cache

export const ActivitiesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();

  const fetchActivities = useCallback(async (force = false) => {
    if (!accessToken) {
      setError('No access token available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check local storage cache first (unless force refresh)
      if (!force) {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          const age = Date.now() - timestamp;
          
          if (age < CACHE_DURATION) {
            console.log('[ActivitiesContext] Using local cache, age:', Math.round(age / 1000), 'seconds');
            setActivities(data);
            setIsLoading(false);
            return;
          } else {
            console.log('[ActivitiesContext] Cache expired, age:', Math.round(age / 1000), 'seconds');
          }
        } else {
          console.log('[ActivitiesContext] No cache found');
        }
      } else {
        console.log('[ActivitiesContext] Force refresh requested');
      }

      // Fetch from our server (which handles MongoDB caching)
      console.log('[ActivitiesContext] Fetching from server...');
      const response = await axios.get('/api/strava/activities', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log('[ActivitiesContext] Server response received:', {
        status: response.status,
        dataCount: response.data.length
      });

      // Update state and cache
      setActivities(response.data);
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: response.data,
        timestamp: Date.now()
      }));
      console.log('[ActivitiesContext] Cache updated');

    } catch (error) {
      console.error('[ActivitiesContext] Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch activities');
      
      // If API fails, try to use cached data even if expired
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { data } = JSON.parse(cachedData);
        console.log('[ActivitiesContext] Using expired cache due to error');
        setActivities(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  // Initial fetch
  useEffect(() => {
    console.log('[ActivitiesContext] Provider mounted');
    fetchActivities();
    return () => {
      console.log('[ActivitiesContext] Provider unmounted');
    };
  }, [fetchActivities]);

  const contextValue = {
    activities,
    isLoading,
    error,
    refreshActivities: () => fetchActivities(true)
  };

  return (
    <ActivitiesContext.Provider value={contextValue}>
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