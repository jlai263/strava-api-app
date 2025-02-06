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
const CACHE_METADATA_KEY = 'strava_activities_metadata';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for full refresh
const SYNC_CHECK_DURATION = 15 * 60 * 1000;  // 15 minutes for sync check

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

      // Check cache metadata
      const metadataStr = localStorage.getItem(CACHE_METADATA_KEY);
      const metadata = metadataStr ? JSON.parse(metadataStr) : {
        lastFullSync: 0,
        lastSyncCheck: 0,
        totalActivities: 0,
        syncInProgress: false
      };

      // Prevent multiple syncs from running simultaneously
      if (metadata.syncInProgress && !force) {
        console.log('[ActivitiesContext] Sync already in progress, skipping...');
        return;
      }

      const now = Date.now();
      const cachedData = localStorage.getItem(CACHE_KEY);
      
      // Determine if we need a full refresh or just a sync check
      const needsFullRefresh = force || !cachedData || (now - metadata.lastFullSync > CACHE_DURATION);
      const needsSyncCheck = now - metadata.lastSyncCheck > SYNC_CHECK_DURATION;

      if (!needsFullRefresh && !needsSyncCheck && cachedData) {
        console.log('[ActivitiesContext] Using cached data');
        setActivities(JSON.parse(cachedData));
        setIsLoading(false);
        return;
      }

      // Update metadata to indicate sync in progress
      metadata.syncInProgress = true;
      localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));

      // Fetch from server with appropriate sync type
      console.log(`[ActivitiesContext] ${needsFullRefresh ? 'Full refresh' : 'Sync check'} requested`);
      const response = await axios.get('/api/strava/activities', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          fullSync: needsFullRefresh
        }
      });

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response from server');
      }

      // Sort activities by date (most recent first)
      const sortedActivities = response.data.sort((a, b) => 
        new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime()
      );

      // Update cache and metadata
      localStorage.setItem(CACHE_KEY, JSON.stringify(sortedActivities));
      localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify({
        lastFullSync: needsFullRefresh ? now : metadata.lastFullSync,
        lastSyncCheck: now,
        totalActivities: sortedActivities.length,
        syncInProgress: false
      }));

      console.log(`[ActivitiesContext] Cache updated with ${sortedActivities.length} activities`);
      setActivities(sortedActivities);

    } catch (error) {
      console.error('[ActivitiesContext] Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch activities');
      
      // If API fails, try to use cached data
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        console.log('[ActivitiesContext] Using cached data after error');
        setActivities(JSON.parse(cachedData));
      }

      // Clear sync in progress flag in case of error
      const metadataStr = localStorage.getItem(CACHE_METADATA_KEY);
      if (metadataStr) {
        const metadata = JSON.parse(metadataStr);
        metadata.syncInProgress = false;
        localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  // Initial fetch - only force refresh if no cache exists
  useEffect(() => {
    console.log('[ActivitiesContext] Provider mounted');
    const cachedData = localStorage.getItem(CACHE_KEY);
    fetchActivities(!cachedData);
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