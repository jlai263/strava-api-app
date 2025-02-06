import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

interface Activity {
  stravaId: number;
  userId: number;
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
  average_heartrate?: number;
  max_heartrate?: number;
  elev_high?: number;
  elev_low?: number;
  description?: string;
  calories?: number;
  map?: {
    polyline?: string;
  };
}

interface DateRange {
  earliest: string | null;
  latest: string | null;
}

interface ActivitiesMetadata {
  count: number;
  dateRange: DateRange;
  lastSync: string;
}

interface ActivitiesContextType {
  activities: Activity[];
  metadata: ActivitiesMetadata | null;
  isLoading: boolean;
  error: string | null;
  refreshActivities: (force?: boolean) => Promise<void>;
  getActivitiesInRange: (after: Date, before: Date) => Promise<void>;
}

const defaultMetadata: ActivitiesMetadata = {
  count: 0,
  dateRange: {
    earliest: null,
    latest: null
  },
  lastSync: new Date().toISOString()
};

const ActivitiesContext = createContext<ActivitiesContextType | undefined>(undefined);

export const useActivities = () => {
  const context = useContext(ActivitiesContext);
  if (!context) {
    throw new Error('useActivities must be used within an ActivitiesProvider');
  }
  return context;
};

export const ActivitiesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [metadata, setMetadata] = useState<ActivitiesMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async (params: { forceRefresh?: boolean; after?: Date; before?: Date }) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      if (params.forceRefresh) {
        queryParams.append('forceRefresh', 'true');
      }
      
      if (params.after) {
        queryParams.append('after', params.after.toISOString());
      }
      
      if (params.before) {
        queryParams.append('before', params.before.toISOString());
      }

      console.log(`[ActivitiesContext] Fetching activities with params:`, params);
      
      const response = await axios.get(`/api/strava/activities?${queryParams.toString()}`);
      
      setActivities(response.data.activities);
      setMetadata(response.data.metadata || defaultMetadata);
      
      console.log(`[ActivitiesContext] Received ${response.data.activities.length} activities`);
      if (response.data.metadata?.dateRange) {
        console.log(`[ActivitiesContext] Date range: ${response.data.metadata.dateRange.earliest} to ${response.data.metadata.dateRange.latest}`);
      }
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch activities';
      console.error('[ActivitiesContext] Error:', errorMessage);
      setError(errorMessage);
      setActivities([]);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshActivities = useCallback(async (force: boolean = false) => {
    await fetchActivities({ forceRefresh: force });
  }, [fetchActivities]);

  const getActivitiesInRange = useCallback(async (after: Date, before: Date) => {
    await fetchActivities({ after, before });
  }, [fetchActivities]);

  return (
    <ActivitiesContext.Provider
      value={{
        activities,
        metadata,
        isLoading,
        error,
        refreshActivities,
        getActivitiesInRange
      }}
    >
      {children}
    </ActivitiesContext.Provider>
  );
};

export default ActivitiesContext; 