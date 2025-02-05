import React, { useState, useEffect } from 'react';
import { useActivities } from '../hooks/useActivities';
import { calculateTrainingLoad, calculateZoneDistribution } from '../utils/trainingMetrics';

const Coach: React.FC = () => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { activities } = useActivities();

  const requestAnalysis = async () => {
    try {
      setLoading(true);
      setError('');

      // Format activities data
      const formattedActivities = activities.map(activity => ({
        date: activity.start_date,
        distance: activity.distance / 1000, // Convert to km
        duration: activity.moving_time / 60, // Convert to minutes
        type: activity.type,
        heartrate: activity.average_heartrate
      }));

      // Calculate training metrics
      const trainingLoad = calculateTrainingLoad(activities);
      const zoneDistribution = calculateZoneDistribution(activities);

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activities: formattedActivities,
          trainingLoad,
          zoneDistribution
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get analysis');
      }

      const data = await response.json();
      setAnalysis(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get analysis');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activities.length > 0) {
      requestAnalysis();
    }
  }, [activities]);

  if (loading) {
    return <div className="p-4">Loading analysis...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">AI Coach Analysis</h2>
      {analysis ? (
        <div className="whitespace-pre-wrap">{analysis}</div>
      ) : (
        <div>No analysis available yet. Please make sure you have activities loaded.</div>
      )}
    </div>
  );
};

export default Coach; 