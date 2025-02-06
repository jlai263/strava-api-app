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
import { useActivities, Activity } from '../context/ActivitiesContext';

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

const Stats = () => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const { activities, isLoading, error } = useActivities();

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

  const generateDateRange = (startDate: Date, endDate: Date): Date[] => {
    const dates: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  const prepareChartData = () => {
    // Get date range
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

    // Generate all dates in the range
    const dateRange = generateDateRange(startDate, now);
    
    // Filter for running activities only and within time range
    const filteredActivities = filterActivitiesByTimeRange(activities).filter(activity => 
      activity.type.toLowerCase().includes('run')
    );
    
    // Create a map of dates to activities
    const activityMap = new Map();
    dateRange.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      activityMap.set(dateStr, {
        count: 0,
        distance: 0,
        elevation: 0,
        heartRateSum: 0,
        validHeartRateCount: 0
      });
    });

    // Fill in activity data
    filteredActivities.forEach(activity => {
      const date = new Date(activity.start_date_local).toISOString().split('T')[0];
      const existing = activityMap.get(date) || {
        count: 0,
        distance: 0,
        elevation: 0,
        heartRateSum: 0,
        validHeartRateCount: 0
      };

      activityMap.set(date, {
        count: existing.count + 1,
        distance: existing.distance + activity.distance,
        elevation: existing.elevation + activity.total_elevation_gain,
        heartRateSum: existing.heartRateSum + (activity.average_heartrate || 0),
        validHeartRateCount: existing.validHeartRateCount + (activity.average_heartrate ? 1 : 0)
      });
    });

    // Convert to arrays for charting
    const labels = Array.from(activityMap.keys()).map(date => {
      const dateObj = new Date(date);
      return timeRange === 'year'
        ? dateObj.toLocaleDateString('en-US', { month: 'short' })
        : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const distances = Array.from(activityMap.values()).map(data => data.distance / 1000);
    const elevations = Array.from(activityMap.values()).map(data => data.elevation);
    const heartRates = Array.from(activityMap.values()).map(data => 
      data.validHeartRateCount > 0 ? data.heartRateSum / data.validHeartRateCount : 0
    );

    return { labels, distances, elevations, heartRates };
  };

  const { labels, distances, elevations, heartRates } = prepareChartData();

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
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgb(209, 213, 219)'
        }
      }
    }
  };

  // Calculate summary stats based on filtered activities
  const calculateSummaryStats = () => {
    const filteredActivities = filterActivitiesByTimeRange(activities);
    const totalDistance = filteredActivities.reduce((sum, activity) => sum + activity.distance, 0);
    const totalTime = filteredActivities.reduce((sum, activity) => sum + activity.moving_time, 0);
    const validHeartRates = filteredActivities.filter(activity => activity.average_heartrate);
    const avgHeartRate = validHeartRates.length > 0
      ? validHeartRates.reduce((sum, activity) => sum + (activity.average_heartrate || 0), 0) / validHeartRates.length
      : 0;
    const totalElevation = filteredActivities.reduce((sum, activity) => sum + activity.total_elevation_gain, 0);

    return {
      totalDistance,
      totalTime,
      avgHeartRate,
      totalElevation
    };
  };

  const summaryStats = calculateSummaryStats();

  if (isLoading) {
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
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const filteredActivities = filterActivitiesByTimeRange(activities);

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
              value: `${(summaryStats.totalDistance / 1000).toFixed(1)} km` 
            },
            { 
              label: 'Total Time', 
              value: `${Math.floor(summaryStats.totalTime / 3600)}h ${Math.floor((summaryStats.totalTime % 3600) / 60)}m` 
            },
            { 
              label: 'Avg Heart Rate', 
              value: `${Math.round(summaryStats.avgHeartRate)} bpm` 
            },
            { 
              label: 'Total Elevation', 
              value: `${Math.round(summaryStats.totalElevation)} m` 
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