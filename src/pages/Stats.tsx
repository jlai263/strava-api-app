import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Activity {
  id: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date_local: string;
  type: string;
  average_heartrate: number;
}

const Stats = () => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching activities...');
        const response = await axios.get('/api/strava/activities');
        console.log('Activities received:', response.data.length);
        setActivities(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const filterActivitiesByTimeRange = (activities: Activity[]) => {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return activities.filter(activity => 
      new Date(activity.start_date_local) >= startDate &&
      new Date(activity.start_date_local) <= now
    );
  };

  const prepareChartData = () => {
    // Filter for running activities only and within time range
    const filteredActivities = filterActivitiesByTimeRange(activities).filter(activity => 
      activity.type.toLowerCase().includes('run')
    );
    
    // Group activities by date and calculate metrics
    const groupedActivities = filteredActivities.reduce((acc, activity) => {
      const date = new Date(activity.start_date_local).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      if (!acc[date]) {
        acc[date] = {
          count: 1,
          distance: activity.distance,
          elevation: activity.total_elevation_gain,
          heartRateSum: activity.average_heartrate || 0,
          validHeartRateCount: activity.average_heartrate ? 1 : 0
        };
      } else {
        acc[date].count += 1;
        acc[date].distance += activity.distance; // Sum distances
        acc[date].elevation += activity.total_elevation_gain; // Sum elevation gains
        if (activity.average_heartrate) {
          acc[date].heartRateSum += activity.average_heartrate;
          acc[date].validHeartRateCount += 1;
        }
      }
      return acc;
    }, {} as Record<string, { 
      count: number; 
      distance: number; 
      elevation: number; 
      heartRateSum: number;
      validHeartRateCount: number;
    }>);

    // Convert grouped data to arrays and calculate averages/sums
    const sortedDates = Object.keys(groupedActivities).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    const labels = sortedDates.map(date => {
      const dateObj = new Date(date);
      return timeRange === 'year'
        ? dateObj.toLocaleDateString('en-US', { month: 'short' })
        : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const distances = sortedDates.map(date => {
      const group = groupedActivities[date];
      return group.distance / 1000; // Convert to km, use total
    });

    const elevations = sortedDates.map(date => {
      const group = groupedActivities[date];
      return group.elevation; // Use total elevation
    });

    const heartRates = sortedDates.map(date => {
      const group = groupedActivities[date];
      return group.validHeartRateCount > 0 
        ? group.heartRateSum / group.validHeartRateCount // Average heart rate
        : 0;
    });

    return { labels, distances, elevations, heartRates };
  };

  const { labels, distances, elevations, heartRates } = prepareChartData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(209, 213, 219)'
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgb(209, 213, 219)'
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgb(209, 213, 219)'
        }
      }
    }
  };

  const distanceData = {
    labels,
    datasets: [
      {
        label: 'Distance (km)',
        data: distances,
        fill: true,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const elevationData = {
    labels,
    datasets: [
      {
        label: 'Elevation (m)',
        data: elevations,
        backgroundColor: '#ec4899',
      },
    ],
  };

  const heartRateData = {
    labels,
    datasets: [
      {
        label: 'Heart Rate (bpm)',
        data: heartRates,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-400">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="content-container">
        {/* Time Range Selector */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Statistics</h1>
          <div className="flex space-x-2">
            {(['week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                    : 'glass text-gray-300 hover:bg-white/10'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distance Over Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="glass-card p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Distance Over Time</h2>
            <div className="h-[300px]">
              <Line options={chartOptions} data={distanceData} />
            </div>
          </motion.div>

          {/* Elevation Gain */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
            className="glass-card p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Elevation Gain</h2>
            <div className="h-[300px]">
              <Bar options={chartOptions} data={elevationData} />
            </div>
          </motion.div>

          {/* Heart Rate Trends */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}
            className="glass-card p-6 lg:col-span-2"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Heart Rate Trends</h2>
            <div className="h-[300px]">
              <Line options={chartOptions} data={heartRateData} />
            </div>
          </motion.div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {[
            { 
              label: 'Total Distance', 
              value: `${(distances.reduce((a, b) => a + b, 0)).toFixed(1)} km` 
            },
            { 
              label: 'Total Time', 
              value: `${Math.floor(activities.reduce((a, b) => a + b.moving_time, 0) / 3600)}h ${Math.floor((activities.reduce((a, b) => a + b.moving_time, 0) % 3600) / 60)}m` 
            },
            { 
              label: 'Avg Heart Rate', 
              value: `${Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.filter(hr => hr > 0).length)} bpm` 
            },
            { 
              label: 'Total Elevation', 
              value: `${Math.round(elevations.reduce((a, b) => a + b, 0))} m` 
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.05 }}
              className="glass-card p-6"
            >
              <h3 className="text-gray-400 text-sm">{stat.label}</h3>
              <p className="text-2xl font-semibold text-white mt-2">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Stats; 